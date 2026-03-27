'use client';

// ==========================================
// ALFYCHAT - APPELS GROUPE (LiveKit SFU)
// Séparé des appels DM P2P — utilise LiveKit
// comme SFU pour la topology N→N sans mesh.
// ==========================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  LocalParticipant,
  ConnectionState,
  TrackPublication,
  RemoteTrackPublication,
} from 'livekit-client';
import { socketService } from '@/lib/socket';

// ── Types ──────────────────────────────────────────────────

export type GroupCallStatus = 'idle' | 'incoming' | 'connecting' | 'connected' | 'ended';

export interface GroupCallParticipant {
  userId:         string;
  username:       string;
  isMuted:        boolean;
  isVideoEnabled: boolean;
  /** MediaStream contenant les pistes audio/vidéo du participant */
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

// ── Helpers ───────────────────────────────────────────────

function participantToStream(participant: RemoteParticipant | LocalParticipant): MediaStream {
  const stream = new MediaStream();
  participant.trackPublications.forEach((pub: TrackPublication) => {
    if (pub.track && (pub.track.kind === Track.Kind.Audio || pub.track.kind === Track.Kind.Video)) {
      stream.addTrack(pub.track.mediaStreamTrack);
    }
  });
  return stream;
}

// ── Hook principal ─────────────────────────────────────────

export function useGroupCall() {
  const [state, setState] = useState<GroupCallState>(INITIAL);
  const roomRef           = useRef<Room | null>(null);
  const stateRef          = useRef(state);
  stateRef.current = state;

  // ── Nettoyage ────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setState(INITIAL);
  }, []);

  // ── Connexion à la room LiveKit ──────────────────────────

  const connectToRoom = useCallback(
    async (token: string, wsUrl: string, callId: string, channelId: string) => {
      setState((prev) => ({ ...prev, status: 'connecting', callId, channelId, error: null }));

      const room = new Room({
        adaptiveStream: true,
        dynacast:       true,
      });
      roomRef.current = room;

      // ── Événements room ──
      room.on(RoomEvent.Connected, () => {
        const localStream = participantToStream(room.localParticipant);
        setState((prev) => ({
          ...prev,
          status:         'connected',
          localStream,
          isMuted:        !room.localParticipant.isMicrophoneEnabled,
          isVideoEnabled: room.localParticipant.isCameraEnabled,
        }));
      });

      room.on(RoomEvent.Disconnected, () => {
        cleanup();
      });

      room.on(RoomEvent.ConnectionStateChanged, (cs: ConnectionState) => {
        if (cs === ConnectionState.Reconnecting) {
          setState((prev) => ({ ...prev, error: 'Reconnexion en cours…' }));
        } else if (cs === ConnectionState.Connected) {
          setState((prev) => ({ ...prev, error: null }));
        }
      });

      // ── Participants distants ──
      const buildParticipant = (p: RemoteParticipant): GroupCallParticipant => ({
        userId:         p.identity,
        username:       p.name || p.identity,
        isMuted:        !p.isMicrophoneEnabled,
        isVideoEnabled: p.isCameraEnabled,
        stream:         participantToStream(p),
      });

      room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
        setState((prev) => ({
          ...prev,
          participants: [...prev.participants, buildParticipant(p)],
        }));
      });

      room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
        setState((prev) => ({
          ...prev,
          participants: prev.participants.filter((x) => x.userId !== p.identity),
        }));
      });

      // Rafraîchir le stream quand une piste est abonnée/désabonnée
      const refreshParticipant = (_: unknown, pub: RemoteTrackPublication, p: RemoteParticipant) => {
        setState((prev) => ({
          ...prev,
          participants: prev.participants.map((x) =>
            x.userId === p.identity
              ? { ...x, stream: participantToStream(p), isMuted: !p.isMicrophoneEnabled, isVideoEnabled: p.isCameraEnabled }
              : x,
          ),
        }));
      };
      room.on(RoomEvent.TrackSubscribed,   refreshParticipant);
      room.on(RoomEvent.TrackUnsubscribed, refreshParticipant);

      // Mute local
      room.localParticipant.on('trackMuted' as any, (pub: TrackPublication) => {
        if (pub.track?.kind === Track.Kind.Audio) {
          setState((prev) => ({ ...prev, isMuted: true }));
        }
      });
      room.localParticipant.on('trackUnmuted' as any, (pub: TrackPublication) => {
        if (pub.track?.kind === Track.Kind.Audio) {
          setState((prev) => ({ ...prev, isMuted: false }));
        }
      });

      // Charger les participants déjà présents
      const existing = Array.from(room.remoteParticipants.values()).map(buildParticipant);
      if (existing.length) {
        setState((prev) => ({ ...prev, participants: existing }));
      }

      try {
        await room.connect(wsUrl, token, { autoSubscribe: true });
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (err) {
        console.error('[GROUP_CALL] Connexion LiveKit échouée:', err);
        setState((prev) => ({ ...prev, error: "Impossible de rejoindre l'appel", status: 'ended' }));
        roomRef.current = null;
      }
    },
    [cleanup],
  );

  // ── Écouter les events Socket.IO ─────────────────────────

  useEffect(() => {
    const onIncoming = (data: { payload: IncomingGroupCallData }) => {
      setState((prev) => ({
        ...prev,
        status:      'incoming',
        incomingCall: data.payload,
        callId:       data.payload.callId,
        channelId:    data.payload.channelId,
      }));
    };

    const onToken = (data: { callId: string; token: string; wsUrl: string }) => {
      const channelId = stateRef.current.channelId || '';
      connectToRoom(data.token, data.wsUrl, data.callId, channelId);
    };

    const onLeft = (data: { payload: { callId: string; userId: string } }) => {
      setState((prev) => ({
        ...prev,
        participants: prev.participants.filter((p) => p.userId !== data.payload.userId),
      }));
    };

    const onEnded = (data: { payload: { callId: string } }) => {
      if (data.payload.callId === stateRef.current.callId) cleanup();
    };

    socketService.on('GROUP_CALL_INCOMING',         onIncoming);
    socketService.on('GROUP_CALL_TOKEN',            onToken);
    socketService.on('GROUP_CALL_PARTICIPANT_LEFT', onLeft);
    socketService.on('GROUP_CALL_ENDED',            onEnded);

    return () => {
      socketService.off('GROUP_CALL_INCOMING',         onIncoming);
      socketService.off('GROUP_CALL_TOKEN',            onToken);
      socketService.off('GROUP_CALL_PARTICIPANT_LEFT', onLeft);
      socketService.off('GROUP_CALL_ENDED',            onEnded);
    };
  }, [connectToRoom, cleanup]);

  // ── Actions ───────────────────────────────────────────────

  /** Initier un appel groupe dans un canal serveur */
  const initiateGroupCall = useCallback(
    (channelId: string, type: 'voice' | 'video' = 'voice') => {
      setState((prev) => ({ ...prev, channelId, status: 'connecting', incomingCall: null }));
      socketService.initiateGroupCall(channelId, type);
    },
    [],
  );

  /** Rejoindre un appel groupe (accepter l'invitation) */
  const joinGroupCall = useCallback(
    (callId?: string) => {
      const id = callId || stateRef.current.callId;
      if (!id) return;
      setState((prev) => ({ ...prev, status: 'connecting', incomingCall: null }));
      socketService.joinGroupCall(id);
    },
    [],
  );

  /** Refuser / ignorer un appel groupe entrant */
  const declineGroupCall = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'idle', incomingCall: null, callId: null }));
  }, []);

  /** Quitter l'appel groupe */
  const leaveGroupCall = useCallback(() => {
    const callId = stateRef.current.callId;
    if (!callId) return;
    socketService.leaveGroupCall(callId);
    cleanup();
  }, [cleanup]);

  /** Terminer l'appel pour tout le monde (initiateur) */
  const endGroupCall = useCallback(() => {
    const callId = stateRef.current.callId;
    if (!callId) return;
    socketService.endGroupCall(callId);
    cleanup();
  }, [cleanup]);

  /** Mute/Unmute micro */
  const toggleMute = useCallback(async () => {
    if (!roomRef.current) return;
    const muted = !stateRef.current.isMuted;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!muted);
    setState((prev) => ({ ...prev, isMuted: muted }));
  }, []);

  /** Activer/Désactiver caméra */
  const toggleVideo = useCallback(async () => {
    if (!roomRef.current) return;
    const enabled = !stateRef.current.isVideoEnabled;
    await roomRef.current.localParticipant.setCameraEnabled(enabled);
    setState((prev) => ({ ...prev, isVideoEnabled: enabled }));
  }, []);

  /** Partager l'écran */
  const startScreenShare = useCallback(async () => {
    if (!roomRef.current) return;
    await roomRef.current.localParticipant.setScreenShareEnabled(true);
  }, []);

  const stopScreenShare = useCallback(async () => {
    if (!roomRef.current) return;
    await roomRef.current.localParticipant.setScreenShareEnabled(false);
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
