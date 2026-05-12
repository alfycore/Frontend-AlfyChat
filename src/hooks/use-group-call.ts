'use client';

// ==========================================
// ALFYCHAT - APPELS GROUPE (WebRTC mesh P2P)
// Topologie full-mesh : chaque pair est connecté
// directement à chaque autre pair via WebRTC.
// La signalisation passe par Socket.io / Gateway.
// ==========================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { socketService } from '@/lib/socket';

// ── Types ──────────────────────────────────────────────────

export type GroupCallStatus = 'idle' | 'incoming' | 'connecting' | 'connected' | 'ended';

export interface GroupCallParticipant {
  userId:         string;
  username:       string;
  isMuted:        boolean;
  isVideoEnabled: boolean;
  stream:         MediaStream | null;
}

export interface IncomingGroupCallData {
  callId:        string;
  channelId:     string;
  initiatorId:   string;
  initiatorName: string;
  callType:      'voice' | 'video';
}

interface GroupCallState {
  status:         GroupCallStatus;
  callId:         string | null;
  channelId:      string | null;
  participants:   GroupCallParticipant[];
  isMuted:        boolean;
  isVideoEnabled: boolean;
  localStream:    MediaStream | null;
  error:          string | null;
  incomingCall:   IncomingGroupCallData | null;
}

const INITIAL: GroupCallState = {
  status:         'idle',
  callId:         null,
  channelId:      null,
  participants:   [],
  isMuted:        false,
  isVideoEnabled: false,
  localStream:    null,
  error:          null,
  incomingCall:   null,
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// ── Hook principal ─────────────────────────────────────────

export function useGroupCall() {
  const [state, setState] = useState<GroupCallState>(INITIAL);
  const stateRef        = useRef(state);
  stateRef.current      = state;

  const localStreamRef  = useRef<MediaStream | null>(null);
  // Map userId → RTCPeerConnection
  const peersRef        = useRef<Map<string, RTCPeerConnection>>(new Map());

  // ── Nettoyage ────────────────────────────────────────────

  const cleanup = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setState(INITIAL);
  }, []);

  // ── Acquérir le media local ──────────────────────────────

  const acquireLocalStream = useCallback(async (withVideo: boolean): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
    localStreamRef.current = stream;
    return stream;
  }, []);

  // ── Créer un RTCPeerConnection vers un pair ──────────────

  const createPeer = useCallback((targetUserId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Ajouter les pistes locales au peer
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Relay des candidates ICE via Socket.io
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && stateRef.current.callId) {
        socketService.sendICECandidate(stateRef.current.callId, candidate, targetUserId);
      }
    };

    // Recevoir le flux distant
    pc.ontrack = ({ streams }) => {
      const remoteStream = streams[0] ?? null;
      setState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.userId === targetUserId ? { ...p, stream: remoteStream } : p,
        ),
      }));
    };

    // Supprimer le pair si la connexion échoue
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        pc.close();
        peersRef.current.delete(targetUserId);
        setState((prev) => ({
          ...prev,
          participants: prev.participants.filter((p) => p.userId !== targetUserId),
        }));
      }
    };

    peersRef.current.set(targetUserId, pc);
    return pc;
  }, []);

  // ── Créer et envoyer une offre à un pair ────────────────

  const offerTo = useCallback(async (targetUserId: string) => {
    const pc    = createPeer(targetUserId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (stateRef.current.callId) {
      socketService.sendWebRTCOffer(stateRef.current.callId, offer, targetUserId);
    }
  }, [createPeer]);

  // ── Écouter les events Socket.IO ────────────────────────

  useEffect(() => {
    // Appel entrant dans un canal
    const onIncoming = (data: { payload: IncomingGroupCallData }) => {
      setState((prev) => ({
        ...prev,
        status:       'incoming',
        incomingCall: data.payload,
        callId:       data.payload.callId,
        channelId:    data.payload.channelId,
      }));
    };

    // Confirmation de l'entrée dans l'appel (initiateur + rejoignant)
    const onJoined = (data: { callId: string; participants?: Array<{ userId: string; username: string }> }) => {
      setState((prev) => {
        const existing = new Set(prev.participants.map((p) => p.userId));
        const incoming = (data.participants ?? [])
          .filter((p) => !existing.has(p.userId))
          .map((p) => ({ userId: p.userId, username: p.username, isMuted: false, isVideoEnabled: false, stream: null }));
        return {
          ...prev,
          callId:       data.callId,
          status:       'connected',
          participants: [...prev.participants, ...incoming],
        };
      });
    };

    // Un nouveau pair a rejoint → on lui envoie une offre WebRTC
    const onParticipantJoined = async (data: { payload: { callId: string; userId: string; username: string } }) => {
      if (stateRef.current.status !== 'connected') return;
      if (stateRef.current.callId !== data.payload.callId) return;

      // Ajouter le pair dans la liste si pas déjà présent
      setState((prev) => ({
        ...prev,
        participants: prev.participants.some((p) => p.userId === data.payload.userId)
          ? prev.participants
          : [...prev.participants, { userId: data.payload.userId, username: data.payload.username, isMuted: false, isVideoEnabled: false, stream: null }],
      }));

      // Initier la connexion WebRTC vers ce nouveau pair
      await offerTo(data.payload.userId);
    };

    // Un pair a quitté l'appel
    const onParticipantLeft = (data: { payload: { callId: string; userId: string } }) => {
      const pc = peersRef.current.get(data.payload.userId);
      pc?.close();
      peersRef.current.delete(data.payload.userId);
      setState((prev) => ({
        ...prev,
        participants: prev.participants.filter((p) => p.userId !== data.payload.userId),
      }));
    };

    // Appel terminé par l'initiateur
    const onEnded = (data: { payload: { callId: string } }) => {
      if (data.payload.callId === stateRef.current.callId) cleanup();
    };

    // ── Signalisation WebRTC ─────────────────────────────

    // Réception d'une offre → créer une réponse
    const onOffer = async (data: { payload: { callId: string; offer: RTCSessionDescriptionInit; fromUserId: string } }) => {
      if (data.payload.callId !== stateRef.current.callId) return;

      let pc = peersRef.current.get(data.payload.fromUserId);
      if (!pc) pc = createPeer(data.payload.fromUserId);

      await pc.setRemoteDescription(new RTCSessionDescription(data.payload.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketService.sendWebRTCAnswer(data.payload.callId, answer, data.payload.fromUserId);
    };

    // Réception d'une réponse
    const onAnswer = async (data: { payload: { callId: string; answer: RTCSessionDescriptionInit; fromUserId: string } }) => {
      if (data.payload.callId !== stateRef.current.callId) return;
      const pc = peersRef.current.get(data.payload.fromUserId);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(data.payload.answer));
    };

    // Réception d'un candidat ICE
    const onICE = async (data: { payload: { callId: string; candidate: RTCIceCandidateInit; fromUserId: string } }) => {
      if (data.payload.callId !== stateRef.current.callId) return;
      const pc = peersRef.current.get(data.payload.fromUserId);
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.payload.candidate));
      } catch {
        // ignore les candidats tardifs
      }
    };

    socketService.on('GROUP_CALL_INCOMING',          onIncoming);
    socketService.on('GROUP_CALL_JOINED',            onJoined);
    socketService.on('GROUP_CALL_PARTICIPANT_JOINED', onParticipantJoined);
    socketService.on('GROUP_CALL_PARTICIPANT_LEFT',  onParticipantLeft);
    socketService.on('GROUP_CALL_ENDED',             onEnded);
    socketService.on('WEBRTC_OFFER',                 onOffer);
    socketService.on('WEBRTC_ANSWER',                onAnswer);
    socketService.on('WEBRTC_ICE_CANDIDATE',         onICE);

    return () => {
      socketService.off('GROUP_CALL_INCOMING',          onIncoming);
      socketService.off('GROUP_CALL_JOINED',            onJoined);
      socketService.off('GROUP_CALL_PARTICIPANT_JOINED', onParticipantJoined);
      socketService.off('GROUP_CALL_PARTICIPANT_LEFT',  onParticipantLeft);
      socketService.off('GROUP_CALL_ENDED',             onEnded);
      socketService.off('WEBRTC_OFFER',                 onOffer);
      socketService.off('WEBRTC_ANSWER',                onAnswer);
      socketService.off('WEBRTC_ICE_CANDIDATE',         onICE);
    };
  }, [offerTo, createPeer, cleanup]);

  // ── Actions ───────────────────────────────────────────────

  /** Initier un appel groupe dans un canal serveur */
  const initiateGroupCall = useCallback(async (channelId: string, type: 'voice' | 'video' = 'voice') => {
    setState((prev) => ({ ...prev, channelId, status: 'connecting', error: null }));
    try {
      const stream = await acquireLocalStream(type === 'video');
      setState((prev) => ({ ...prev, localStream: stream }));
      socketService.initiateGroupCall(channelId, type);
    } catch {
      setState((prev) => ({ ...prev, status: 'idle', error: 'Impossible d\'accéder au micro/caméra' }));
    }
  }, [acquireLocalStream]);

  /** Rejoindre un appel groupe (accepter l'invitation) */
  const joinGroupCall = useCallback(async (callId?: string) => {
    const id = callId || stateRef.current.callId;
    if (!id) return;
    setState((prev) => ({ ...prev, status: 'connecting', incomingCall: null, error: null }));
    try {
      const withVideo = stateRef.current.incomingCall?.callType === 'video';
      const stream    = await acquireLocalStream(withVideo);
      setState((prev) => ({ ...prev, localStream: stream, callId: id }));
      socketService.joinGroupCall(id);
    } catch {
      setState((prev) => ({ ...prev, status: 'idle', error: 'Impossible d\'accéder au micro/caméra' }));
    }
  }, [acquireLocalStream]);

  /** Refuser un appel groupe entrant */
  const declineGroupCall = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'idle', incomingCall: null, callId: null }));
  }, []);

  /** Quitter l'appel */
  const leaveGroupCall = useCallback(() => {
    const callId = stateRef.current.callId;
    if (!callId) return;
    socketService.leaveGroupCall(callId);
    cleanup();
  }, [cleanup]);

  /** Terminer l'appel pour tous (initiateur/admin) */
  const endGroupCall = useCallback(() => {
    const callId = stateRef.current.callId;
    if (!callId) return;
    socketService.endGroupCall(callId);
    cleanup();
  }, [cleanup]);

  /** Mute / Unmute le micro local */
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const muted = !stateRef.current.isMuted;
    stream.getAudioTracks().forEach((t) => { t.enabled = !muted; });
    setState((prev) => ({ ...prev, isMuted: muted }));
  }, []);

  /** Activer / Désactiver la caméra locale */
  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = !stateRef.current.isVideoEnabled;
    stream.getVideoTracks().forEach((t) => { t.enabled = enabled; });
    setState((prev) => ({ ...prev, isVideoEnabled: enabled }));
  }, []);

  /** Partage d'écran — remplace la piste vidéo dans chaque PeerConnection */
  const startScreenShare = useCallback(async () => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack  = screenStream.getVideoTracks()[0];
    peersRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      sender?.replaceTrack(screenTrack);
    });
    screenTrack.onended = () => stopScreenShare();
  }, []); // stopScreenShare referenced via closure below

  const stopScreenShare = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const camTrack = stream.getVideoTracks()[0];
    peersRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && camTrack) sender.replaceTrack(camTrack);
    });
  }, []);

  return {
    ...state,
    initiateGroupCall,
    joinGroupCall,
    declineGroupCall,
    leaveGroupCall,
    endGroupCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };
}
