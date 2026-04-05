'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { socketService } from '@/lib/socket';

// ==========================================
// TYPES
// ==========================================

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';

interface CallState {
  callId: string | null;
  type: 'voice' | 'video' | null;
  status: CallStatus;
  participants: string[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  screenStream: MediaStream | null;
  /** true when the REMOTE participant is sharing their screen */
  remoteIsScreenSharing: boolean;
  callerName?: string;
  callerAvatar?: string;
  mediaError?: string;
  callConversationId?: string;
  callRecipientId?: string;
}

const INITIAL_STATE: CallState = {
  callId: null,
  type: null,
  status: 'idle',
  participants: [],
  localStream: null,
  remoteStreams: new Map(),
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  screenStream: null,
  remoteIsScreenSharing: false,
};

// ==========================================
// AUDIO PREFERENCES (persisted in localStorage)
// ==========================================

const AUDIO_PREFS_KEY = 'alfychat_audio_prefs';

export interface AudioPreferences {
  inputDeviceId: string;
  outputDeviceId: string;
  inputVolume: number;
  outputVolume: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
}

const defaultPrefs: AudioPreferences = {
  inputDeviceId: 'default',
  outputDeviceId: 'default',
  inputVolume: 100,
  outputVolume: 100,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
};

export function getAudioPreferences(): AudioPreferences {
  if (typeof window === 'undefined') return defaultPrefs;
  try {
    const saved = localStorage.getItem(AUDIO_PREFS_KEY);
    if (saved) return { ...defaultPrefs, ...JSON.parse(saved) };
  } catch {
    /* ignore */
  }
  return defaultPrefs;
}

export function setAudioPreferences(prefs: Partial<AudioPreferences>): void {
  const merged = { ...getAudioPreferences(), ...prefs };
  localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(merged));
}

// ==========================================
// ICE SERVERS
// ==========================================

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

// ==========================================
// HELPERS
// ==========================================

function hasMediaDevices(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

function parsePayload(data: unknown): Record<string, unknown> {
  const d = data as { payload?: Record<string, unknown> };
  return (d?.payload || data) as Record<string, unknown>;
}

// ==========================================
// HOOK
// ==========================================

interface UseCallOptions {
  /** The current user's ID — passed from context to avoid window global */
  userId?: string;
}

export function useCall(options: UseCallOptions = {}) {
  const { userId } = options;

  const [state, setState] = useState<CallState>(INITIAL_STATE);

  // ── Refs for stable access across async operations ──
  // Mesh: one RTCPeerConnection per remote participant
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const callIdRef = useRef<string | null>(null);
  const callTypeRef = useRef<'voice' | 'video' | null>(null);
  // Per-peer ICE queue and signaling state tracking
  const iceQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteDescSetMapRef = useRef<Map<string, boolean>>(new Map());
  const makingOfferMapRef = useRef<Map<string, boolean>>(new Map());
  const settingRemoteMapRef = useRef<Map<string, boolean>>(new Map());
  const cleaningUpRef = useRef(false);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs synced with state
  useEffect(() => {
    callIdRef.current = state.callId;
  }, [state.callId]);

  useEffect(() => {
    callTypeRef.current = state.type;
  }, [state.type]);

  // ──────────────────────────────────────────────
  // REQUEST MEDIA
  // ──────────────────────────────────────────────

  const requestMedia = useCallback(async (type: 'voice' | 'video'): Promise<MediaStream | null> => {
    if (!hasMediaDevices()) {
      setState((s) => ({
        ...s,
        mediaError: 'Les appels nécessitent une connexion HTTPS sécurisée. Utilisez https:// ou localhost.',
      }));
      return null;
    }

    const prefs = getAudioPreferences();
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: prefs.echoCancellation,
      noiseSuppression: prefs.noiseSuppression,
      autoGainControl: prefs.autoGainControl,
    };
    if (prefs.inputDeviceId && prefs.inputDeviceId !== 'default') {
      audioConstraints.deviceId = { exact: prefs.inputDeviceId };
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: type === 'video',
      });
    } catch (err: unknown) {
      const error = err as DOMException;
      console.error('[CALL] Media access error:', error.name, error.message);
      let msg = "Impossible d'accéder au microphone.";

      switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          msg = "Accès au microphone refusé. Autorisez l'accès dans les paramètres du navigateur.";
          break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          msg = 'Aucun microphone détecté. Branchez un casque ou un micro.';
          break;
        case 'NotReadableError':
        case 'TrackStartError':
          msg = 'Le microphone est utilisé par une autre application.';
          break;
        case 'NotSupportedError':
          msg = 'Les appels nécessitent une connexion HTTPS sécurisée.';
          break;
        case 'OverconstrainedError':
          // Retry without device constraint
          try {
            return await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: type === 'video',
            });
          } catch {
            msg = "Le périphérique audio sélectionné n'est plus disponible.";
          }
          break;
      }

      setState((s) => ({ ...s, mediaError: msg }));
      return null;
    }
  }, []);

  // ──────────────────────────────────────────────
  // CLEANUP
  // ──────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (cleaningUpRef.current) return;
    cleaningUpRef.current = true;
    console.log('[CALL] Cleanup');

    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    // Close all peer connections
    pcsRef.current.forEach((pc) => {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.onnegotiationneeded = null;
      pc.close();
    });
    pcsRef.current.clear();
    iceQueuesRef.current.clear();
    remoteDescSetMapRef.current.clear();
    makingOfferMapRef.current.clear();
    settingRemoteMapRef.current.clear();

    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    originalVideoTrackRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    setState({ ...INITIAL_STATE });
    cleaningUpRef.current = false;
  }, []);

  // ──────────────────────────────────────────────
  // FLUSH ICE CANDIDATES
  // ──────────────────────────────────────────────

  const flushIceCandidates = useCallback(async (peerId: string) => {
    const pc = pcsRef.current.get(peerId);
    if (!pc || !remoteDescSetMapRef.current.get(peerId)) return;

    const queue = iceQueuesRef.current.get(peerId) ?? [];
    iceQueuesRef.current.set(peerId, []);

    if (queue.length > 0) {
      console.log(`[CALL] Flushing ${queue.length} queued ICE candidates for ${peerId}`);
    }
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[CALL] Error adding queued ICE candidate:', err);
      }
    }
  }, []);

  // ──────────────────────────────────────────────
  // CREATE PEER CONNECTION
  // ──────────────────────────────────────────────

  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    console.log('[CALL] Creating RTCPeerConnection for peer:', peerId);

    // Close previous PC for this peer if any
    const existing = pcsRef.current.get(peerId);
    if (existing) {
      existing.onicecandidate = null;
      existing.ontrack = null;
      existing.onconnectionstatechange = null;
      existing.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });

    // ── ICE candidates → send to this specific peer ──
    pc.onicecandidate = (event) => {
      if (event.candidate && callIdRef.current) {
        socketService.sendICECandidate(callIdRef.current, event.candidate.toJSON(), peerId);
      }
    };

    // ── Remote tracks ──
    // Convention :
    //   • stream avec audio  → caméra/voix du peer  → clé peerId
    //   • stream sans audio  → screen share          → clé `${peerId}_screen`
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;

      const hasAudio = stream.getAudioTracks().length > 0;
      const key = hasAudio ? peerId : `${peerId}_screen`;

      console.log(`[CALL] ontrack from ${peerId} — stream ${stream.id} — key=${key} hasAudio=${hasAudio}`);

      setState((prev) => {
        const newStreams = new Map(prev.remoteStreams);
        newStreams.set(key, stream);
        return { ...prev, remoteStreams: newStreams };
      });

      stream.onaddtrack = () => {
        setState((prev) => {
          const s = new Map(prev.remoteStreams);
          s.set(key, stream);
          return { ...prev, remoteStreams: s };
        });
      };
    };

    // ── Connection state ──
    pc.onconnectionstatechange = () => {
      console.log(`[CALL] PC[${peerId}] state:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        setState((prev) => ({ ...prev, status: 'connected' }));
      } else if (pc.connectionState === 'failed') {
        console.error(`[CALL] PC[${peerId}] failed — attempting ICE restart`);
        const making = makingOfferMapRef.current.get(peerId);
        if (!making && callIdRef.current) {
          makingOfferMapRef.current.set(peerId, true);
          pc.restartIce();
          pc.createOffer({ iceRestart: true })
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              if (callIdRef.current && pc.localDescription) {
                socketService.sendWebRTCOffer(callIdRef.current, pc.localDescription, peerId);
              }
            })
            .catch((err) => console.error('[CALL] ICE restart failed:', err))
            .finally(() => makingOfferMapRef.current.set(peerId, false));
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') pc.restartIce();
    };

    // ── Renegotiation (mid-call track changes) ──
    pc.onnegotiationneeded = async () => {
      if (makingOfferMapRef.current.get(peerId) || settingRemoteMapRef.current.get(peerId)) return;
      if (pc.signalingState !== 'stable') return;
      try {
        makingOfferMapRef.current.set(peerId, true);
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);
        if (callIdRef.current) {
          socketService.sendWebRTCOffer(callIdRef.current, offer, peerId);
        }
      } catch (err) {
        console.error('[CALL] Renegotiation error:', err);
      } finally {
        makingOfferMapRef.current.set(peerId, false);
      }
    };

    // ── Add local tracks ──
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pcsRef.current.set(peerId, pc);
    remoteDescSetMapRef.current.set(peerId, false);
    iceQueuesRef.current.set(peerId, []);

    return pc;
  }, [cleanup]);

  // ==========================================
  // SOCKET EVENT HANDLERS
  // ==========================================

  useEffect(() => {
    // ── Incoming call ──
    const handleIncoming = (data: unknown) => {
      const p = parsePayload(data);
      console.log('[CALL] Incoming call:', p);
      setState((prev) => {
        if (prev.status !== 'idle') {
          console.warn('[CALL] Already in a call, ignoring incoming');
          return prev;
        }
        return {
          ...prev,
          callId: (p.id || p.callId) as string,
          type: (p.type as 'voice' | 'video') || 'voice',
          status: 'ringing',
          participants: [p.initiatorId as string],
          callerName: p.callerName as string | undefined,
          callerAvatar: p.callerAvatar as string | undefined,
          callConversationId: p.conversationId as string | undefined,
          callRecipientId: p.initiatorId as string | undefined,
          mediaError: undefined,
        };
      });
    };

    // ── Someone accepted the call — UI state update only ──
    // Actual PC creation happens in handleParticipantJoined (for existing) or handleOffer (for new joiner)
    const handleAccepted = (data: unknown) => {
      const p = parsePayload(data);
      const joinedId = p.userId as string;
      console.log('[CALL] Call accepted by:', joinedId);
      setState((prev) => ({
        ...prev,
        status: prev.status === 'calling' ? 'connecting' : prev.status,
        participants: prev.participants.includes(joinedId)
          ? prev.participants
          : [...prev.participants, joinedId],
      }));
    };

    // ── New participant joined → existing participants must create PC + offer ──
    const handleParticipantJoined = async (data: unknown) => {
      const p = parsePayload(data);
      const newPeerId = p.userId as string;
      if (newPeerId === userId) return;
      console.log('[CALL] New participant joined, creating PC for:', newPeerId);

      setState((prev) => ({
        ...prev,
        status: 'connecting',
        participants: prev.participants.includes(newPeerId)
          ? prev.participants
          : [...prev.participants, newPeerId],
      }));

      const pc = createPeerConnection(newPeerId);
      try {
        makingOfferMapRef.current.set(newPeerId, true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (callIdRef.current) {
          socketService.sendWebRTCOffer(callIdRef.current, offer, newPeerId);
        }
      } catch (err) {
        console.error('[CALL] Error creating offer for new participant:', err);
      } finally {
        makingOfferMapRef.current.set(newPeerId, false);
      }
    };

    // ── Call rejected ──
    const handleRejected = () => {
      console.log('[CALL] Call rejected');
      cleanup();
    };

    // ── Whole call ended ──
    const handleEnded = () => {
      console.log('[CALL] Call ended');
      cleanup();
    };

    // ── One peer left the call (partial leave) ──
    const handlePeerLeft = (data: unknown) => {
      const p = parsePayload(data);
      const leftId = p.userId as string;
      if (leftId === userId) return;
      console.log('[CALL] Peer left:', leftId);

      const pc = pcsRef.current.get(leftId);
      if (pc) { pc.close(); pcsRef.current.delete(leftId); }
      iceQueuesRef.current.delete(leftId);
      remoteDescSetMapRef.current.delete(leftId);

      setState((prev) => {
        const newStreams = new Map(prev.remoteStreams);
        newStreams.delete(leftId);
        const remaining = prev.participants.filter((id) => id !== leftId);
        if (remaining.length === 0) return { ...INITIAL_STATE };
        return { ...prev, participants: remaining, remoteStreams: newStreams };
      });
    };

    // ── WebRTC offer received → create PC for sender + answer ──
    const handleOffer = async (data: unknown) => {
      const p = parsePayload(data);
      const fromUserId = p.fromUserId as string;
      if (fromUserId === userId) return;
      console.log('[CALL] Received offer from:', fromUserId);

      let pc = pcsRef.current.get(fromUserId);
      if (!pc) {
        pc = createPeerConnection(fromUserId);
        setState((prev) => ({
          ...prev,
          status: 'connecting',
          participants: prev.participants.includes(fromUserId)
            ? prev.participants
            : [...prev.participants, fromUserId],
        }));
      }

      settingRemoteMapRef.current.set(fromUserId, true);
      try {
        if (pc.signalingState === 'have-local-offer') {
          console.warn('[CALL] Glare — rolling back local offer');
          await pc.setLocalDescription({ type: 'rollback' });
        }
        await pc.setRemoteDescription(new RTCSessionDescription(p.offer as RTCSessionDescriptionInit));
        remoteDescSetMapRef.current.set(fromUserId, true);
        await flushIceCandidates(fromUserId);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (callIdRef.current) {
          socketService.sendWebRTCAnswer(callIdRef.current, answer, fromUserId);
        }
      } catch (err) {
        console.error('[CALL] Error handling offer from', fromUserId, ':', err);
      } finally {
        settingRemoteMapRef.current.set(fromUserId, false);
      }
    };

    // ── WebRTC answer received ──
    const handleAnswer = async (data: unknown) => {
      const p = parsePayload(data);
      const fromUserId = p.fromUserId as string;
      if (fromUserId === userId) return;
      console.log('[CALL] Received answer from:', fromUserId);

      const pc = pcsRef.current.get(fromUserId);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(p.answer as RTCSessionDescriptionInit));
        remoteDescSetMapRef.current.set(fromUserId, true);
        await flushIceCandidates(fromUserId);
      } catch (err) {
        console.error('[CALL] Error handling answer:', err);
      }
    };

    // ── ICE candidate received ──
    const handleICE = async (data: unknown) => {
      const p = parsePayload(data);
      const fromUserId = p.fromUserId as string;
      if (fromUserId === userId) return;
      const candidate = p.candidate as RTCIceCandidateInit | undefined;
      if (!candidate) return;

      const pc = pcsRef.current.get(fromUserId);
      if (!pc || !remoteDescSetMapRef.current.get(fromUserId)) {
        if (!iceQueuesRef.current.has(fromUserId)) iceQueuesRef.current.set(fromUserId, []);
        iceQueuesRef.current.get(fromUserId)!.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[CALL] Error adding ICE candidate:', err);
      }
    };

    // ── Remote screen share notification ──
    const handleRemoteScreenShare = (data: unknown) => {
      const p = parsePayload(data);
      const active = p.active as boolean;
      const fromUserId = p.fromUserId as string;
      console.log('[CALL] Remote screen share:', active, 'from:', fromUserId);

      setState((prev) => {
        const newStreams = new Map(prev.remoteStreams);
        if (!active) {
          // Supprimer les streams screen du remote (clé `${fromUserId}_screen` ou toutes les clés `_screen`)
          for (const key of newStreams.keys()) {
            if (key.endsWith('_screen')) newStreams.delete(key);
          }
        }
        return { ...prev, remoteStreams: newStreams, remoteIsScreenSharing: active };
      });
    };

    // ── Socket reconnection ──
    const handleReconnect = () => {
      if (callIdRef.current) {
        console.log('[CALL] Socket reconnected — rejoining call:', callIdRef.current);
        socketService.rejoinCall(callIdRef.current);
        pcsRef.current.forEach((pc) => {
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            pc.restartIce();
          }
        });
      }
    };

    // Register listeners
    socketService.onCall(handleIncoming);
    socketService.onCallAccepted(handleAccepted);
    socketService.on('CALL_PARTICIPANT_JOINED', handleParticipantJoined);
    socketService.onCallRejected(handleRejected);
    socketService.onCallEnded(handleEnded);
    socketService.on('CALL_LEAVE', handlePeerLeft);
    socketService.onWebRTCOffer(handleOffer);
    socketService.onWebRTCAnswer(handleAnswer);
    socketService.onICECandidate(handleICE);
    socketService.onReconnected(handleReconnect);
    socketService.on('CALL_SCREEN_SHARE', handleRemoteScreenShare);

    return () => {
      socketService.off('CALL_INCOMING', handleIncoming);
      socketService.off('CALL_ACCEPT', handleAccepted);
      socketService.off('CALL_PARTICIPANT_JOINED', handleParticipantJoined);
      socketService.off('CALL_REJECT', handleRejected);
      socketService.off('CALL_END', handleEnded);
      socketService.off('CALL_LEAVE', handlePeerLeft);
      socketService.off('WEBRTC_OFFER', handleOffer);
      socketService.off('WEBRTC_ANSWER', handleAnswer);
      socketService.off('WEBRTC_ICE_CANDIDATE', handleICE);
      socketService.off('socket:reconnected', handleReconnect);
      socketService.off('CALL_SCREEN_SHARE', handleRemoteScreenShare);
    };
  }, [createPeerConnection, flushIceCandidates, cleanup]);

  // ==========================================
  // CALL TIMEOUT (30s)
  // ==========================================

  useEffect(() => {
    if (state.status === 'calling') {
      callTimeoutRef.current = setTimeout(() => {
        console.warn('[CALL] Timeout — no answer after 30s');
        if (callIdRef.current) socketService.endCall(callIdRef.current);
        cleanup();
      }, 30_000);
    } else {
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    }
    return () => {
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    };
  }, [state.status, cleanup]);

  // ==========================================
  // ACTIONS
  // ==========================================

  /** Initiate a call to someone */
  const initiateCall = useCallback(
    async (recipientId: string, type: 'voice' | 'video', conversationId?: string, recipientName?: string) => {
      console.log('[CALL] Initiating:', recipientId, type, recipientName);

      // Build conversationId for DM
      let convId = conversationId;
      if (!convId && recipientId && userId) {
        const sorted = [userId, recipientId].sort();
        convId = `dm_${sorted[0]}_${sorted[1]}`;
      }

      // Set state IMMEDIATELY so the UI appears (CallPanel renders)
      setState((prev) => ({
        ...prev,
        type,
        status: 'calling',
        callerName: recipientName || undefined,
        callConversationId: convId || undefined,
        callRecipientId: recipientId,
        mediaError: undefined,
      }));

      // Now try to get media — if it fails the panel is already visible and shows the error
      const stream = await requestMedia(type);
      if (!stream) {
        // mediaError was already set by requestMedia — keep status so UI stays visible
        // The user can hang up via the CallPanel endCall button
        return;
      }

      localStreamRef.current = stream;
      setState((prev) => ({ ...prev, localStream: stream }));

      socketService.initiateCall(
        { recipientId, conversationId: convId, type },
        (response: Record<string, unknown>) => {
          console.log('[CALL] Initiate response:', response);
          if (response?.callId || response?.id) {
            setState((prev) => ({
              ...prev,
              callId: (response.callId || response.id) as string,
            }));
          } else if (response?.error) {
            console.error('[CALL] Initiate error:', response.error);
            setState((prev) => ({
              ...prev,
              mediaError: `Erreur serveur : ${response.error}`,
            }));
          }
        },
      );
    },
    [requestMedia, cleanup, userId],
  );

  /** Accept an incoming call */
  const acceptCall = useCallback(async () => {
    if (!state.callId || !state.type) {
      console.warn('[CALL] Cannot accept: no callId or type');
      return;
    }

    // Set connecting state immediately so UI updates
    setState((prev) => ({
      ...prev,
      status: 'connecting',
      mediaError: undefined,
    }));

    const stream = await requestMedia(state.type);
    if (!stream) {
      // mediaError was set by requestMedia — keep UI visible
      return;
    }

    localStreamRef.current = stream;
    setState((prev) => ({
      ...prev,
      localStream: stream,
    }));

    socketService.acceptCall(state.callId);
  }, [state.callId, state.type, requestMedia]);

  /** Decline an incoming call */
  const declineCall = useCallback(() => {
    console.log('[CALL] Declining:', state.callId);
    if (state.callId) socketService.rejectCall(state.callId);
    cleanup();
  }, [state.callId, cleanup]);

  /** End the current call */
  const endCall = useCallback(() => {
    console.log('[CALL] Ending:', state.callId);
    if (state.callId) socketService.endCall(state.callId);
    cleanup();
  }, [state.callId, cleanup]);

  /** Toggle microphone mute */
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const track = stream.getAudioTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    setState((prev) => ({ ...prev, isMuted: !track.enabled }));
  }, []);

  /** Toggle camera on/off */
  const toggleVideo = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const existingTrack = stream.getVideoTracks()[0];

    if (existingTrack) {
      existingTrack.enabled = !existingTrack.enabled;
      setState((prev) => ({ ...prev, isVideoOff: !existingTrack.enabled }));
    } else {
      if (!hasMediaDevices()) return;

      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        const camTrack = camStream.getVideoTracks()[0];
        if (!camTrack) throw new Error('No video track');

        stream.addTrack(camTrack);

        // Add track to all active peer connections
        pcsRef.current.forEach((pc) => pc.addTrack(camTrack, stream));

        setState((prev) => ({
          ...prev,
          isVideoOff: false,
          localStream: stream,
          type: 'video',
          mediaError: undefined,
        }));
      } catch (err: unknown) {
        const error = err as DOMException;
        let msg = "Impossible d'activer la caméra.";
        if (error.name === 'NotAllowedError') {
          msg = "Accès à la caméra refusé.";
        } else if (error.name === 'NotFoundError') {
          msg = 'Aucune caméra détectée.';
        } else if (error.name === 'NotReadableError') {
          msg = 'La caméra est utilisée par une autre application.';
        }
        setState((prev) => ({ ...prev, mediaError: msg }));
      }
    }
  }, []);

  /** Start screen sharing — addTrack sur un stream séparé, la caméra reste intacte */
  const startScreenShare = useCallback(async () => {
    if (!localStreamRef.current) return;

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
        audio: false,
      });

      const screenTrack = displayStream.getVideoTracks()[0];
      screenStreamRef.current = displayStream;

      // Stream séparé contenant UNIQUEMENT le screen track (pas d'audio)
      // → le receiver identifie ce stream par l'absence d'audio tracks
      const screenOnlyStream = new MediaStream([screenTrack]);

      pcsRef.current.forEach((pc) => {
        // IMPORTANT: addTrack (pas replaceTrack) → caméra reste dans son sender
        pc.addTrack(screenTrack, screenOnlyStream);
      });

      setState((prev) => ({ ...prev, isScreenSharing: true, screenStream: displayStream }));

      if (callIdRef.current) {
        socketService.notifyScreenShare(callIdRef.current, true);
      }

      screenTrack.onended = () => stopScreenShare();
    } catch {
      // User cancelled
    }
  }, []);

  /** Stop screen sharing — retire le sender screen de chaque PC */
  const stopScreenShare = useCallback(async () => {
    const screenStream = screenStreamRef.current;
    if (screenStream) {
      const screenTrackIds = new Set(screenStream.getVideoTracks().map((t) => t.id));

      pcsRef.current.forEach((pc) => {
        pc.getSenders().forEach((sender) => {
          if (sender.track && screenTrackIds.has(sender.track.id)) {
            pc.removeTrack(sender);
          }
        });
      });

      screenStream.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    originalVideoTrackRef.current = null;
    setState((prev) => ({ ...prev, isScreenSharing: false, screenStream: null }));

    if (callIdRef.current) {
      socketService.notifyScreenShare(callIdRef.current, false);
    }
  }, []);

  /** Switch audio input device live */
  const switchAudioInput = useCallback(async (deviceId: string) => {
    if (!localStreamRef.current || !hasMediaDevices()) return;

    const prefs = getAudioPreferences();

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: prefs.echoCancellation,
          noiseSuppression: prefs.noiseSuppression,
          autoGainControl: prefs.autoGainControl,
        },
      });

      const newTrack = newStream.getAudioTracks()[0];
      const oldTrack = localStreamRef.current.getAudioTracks()[0];

      // Replace in all peer connections
      const replacePromises: Promise<void>[] = [];
      pcsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
        if (sender) replacePromises.push(sender.replaceTrack(newTrack));
      });
      await Promise.all(replacePromises);

      if (oldTrack) {
        localStreamRef.current.removeTrack(oldTrack);
        oldTrack.stop();
      }
      localStreamRef.current.addTrack(newTrack);
      setAudioPreferences({ inputDeviceId: deviceId });
    } catch (err) {
      console.error('[CALL] Error switching audio input:', err);
    }
  }, []);

  /** Initiate a group call — rings all members in the conversation simultaneously */
  const initiateGroupCall = useCallback(
    async (conversationId: string, type: 'voice' | 'video', groupName?: string) => {
      console.log('[CALL] Initiating group call:', conversationId, type);

      setState((prev) => ({
        ...prev,
        type,
        status: 'calling',
        callerName: groupName,
        callConversationId: conversationId,
        mediaError: undefined,
      }));

      const stream = await requestMedia(type);
      if (!stream) return;

      localStreamRef.current = stream;
      setState((prev) => ({ ...prev, localStream: stream }));

      socketService.initiateCall(
        { conversationId, type },
        (response: Record<string, unknown>) => {
          console.log('[CALL] Group call initiate response:', response);
          if (response?.callId || response?.id) {
            setState((prev) => ({
              ...prev,
              callId: (response.callId || response.id) as string,
            }));
          } else if (response?.error) {
            console.error('[CALL] Group call error:', response.error);
            setState((prev) => ({
              ...prev,
              mediaError: `Erreur serveur : ${response.error}`,
            }));
          }
        },
      );
    },
    [requestMedia, userId],
  );

  return {
    ...state,
    initiateCall,
    initiateGroupCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    switchAudioInput,
  };
}
