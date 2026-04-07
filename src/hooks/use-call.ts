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
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const callIdRef = useRef<string | null>(null);
  const callTypeRef = useRef<'voice' | 'video' | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef(false);
  const cleaningUpRef = useRef(false);
  const makingOfferRef = useRef(false);
  const settingRemoteRef = useRef(false);
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

    // Clear call timeout
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    // Teardown PeerConnection
    const pc = pcRef.current;
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.onnegotiationneeded = null;
      pc.close();
      pcRef.current = null;
    }

    // Stop screen share
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    originalVideoTrackRef.current = null;

    // Stop local media
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    // Reset refs
    remoteDescSetRef.current = false;
    iceCandidateQueueRef.current = [];
    makingOfferRef.current = false;
    settingRemoteRef.current = false;

    setState({ ...INITIAL_STATE });
    cleaningUpRef.current = false;
  }, []);

  // ──────────────────────────────────────────────
  // FLUSH ICE CANDIDATES
  // ──────────────────────────────────────────────

  const flushIceCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !remoteDescSetRef.current) return;

    const queue = iceCandidateQueueRef.current;
    iceCandidateQueueRef.current = [];

    if (queue.length > 0) {
      console.log(`[CALL] Flushing ${queue.length} queued ICE candidates`);
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

  const createPeerConnection = useCallback((): RTCPeerConnection => {
    console.log('[CALL] Creating RTCPeerConnection');

    // Close previous if any
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });

    // ── ICE candidates → send via signaling ──
    pc.onicecandidate = (event) => {
      if (event.candidate && callIdRef.current) {
        socketService.sendICECandidate(callIdRef.current, event.candidate.toJSON());
      }
    };

    // ── Remote tracks ──
    pc.ontrack = (event) => {
      console.log('[CALL] Remote track:', event.track.kind, 'streams:', event.streams.length);
      const remoteStream = event.streams[0];
      if (!remoteStream) return;

      setState((prev) => {
        const newStreams = new Map(prev.remoteStreams);
        newStreams.set('remote', remoteStream);
        return { ...prev, remoteStreams: newStreams };
      });

      // Listen for track changes on this stream (renegotiation)
      remoteStream.onaddtrack = () => {
        setState((prev) => {
          const newStreams = new Map(prev.remoteStreams);
          newStreams.set('remote', remoteStream);
          return { ...prev, remoteStreams: newStreams };
        });
      };
      remoteStream.onremovetrack = () => {
        setState((prev) => {
          const newStreams = new Map(prev.remoteStreams);
          newStreams.set('remote', remoteStream);
          return { ...prev, remoteStreams: newStreams };
        });
      };
    };

    // ── Connection state ──
    pc.onconnectionstatechange = () => {
      console.log('[CALL] Connection state:', pc.connectionState);
      switch (pc.connectionState) {
        case 'connected':
          setState((prev) => ({ ...prev, status: 'connected' }));
          break;
        case 'failed':
          console.error('[CALL] Connection failed — attempting ICE restart');
          if (callIdRef.current && !makingOfferRef.current) {
            makingOfferRef.current = true;
            pc.restartIce();
            pc.createOffer({ iceRestart: true })
              .then((offer) => pc.setLocalDescription(offer))
              .then(() => {
                if (callIdRef.current && pc.localDescription) {
                  socketService.sendWebRTCOffer(callIdRef.current, pc.localDescription);
                }
              })
              .catch((err) => {
                console.error('[CALL] ICE restart failed:', err);
                cleanup();
              })
              .finally(() => {
                makingOfferRef.current = false;
              });
          } else if (!callIdRef.current) {
            cleanup();
          }
          break;
        case 'disconnected':
          console.warn('[CALL] Disconnected — waiting for recovery...');
          break;
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[CALL] ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        pc.restartIce();
      }
    };

    // ── Renegotiation (camera added mid-call etc.) ──
    pc.onnegotiationneeded = async () => {
      if (makingOfferRef.current || settingRemoteRef.current) return;
      if (pc.signalingState !== 'stable') return;

      try {
        makingOfferRef.current = true;
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);
        if (callIdRef.current) {
          socketService.sendWebRTCOffer(callIdRef.current, offer);
        }
      } catch (err) {
        console.error('[CALL] Renegotiation error:', err);
      } finally {
        makingOfferRef.current = false;
      }
    };

    // ── Add local tracks ──
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pcRef.current = pc;
    remoteDescSetRef.current = false;
    iceCandidateQueueRef.current = [];

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

    // ── Call accepted (we are initiator → create offer) ──
    const handleAccepted = async (data: unknown) => {
      const p = parsePayload(data);
      console.log('[CALL] Call accepted by:', p.userId);

      setState((prev) => ({ ...prev, status: 'connecting' }));

      makingOfferRef.current = true;
      const pc = createPeerConnection();
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (callIdRef.current) {
          socketService.sendWebRTCOffer(callIdRef.current, offer);
        }
      } catch (err) {
        console.error('[CALL] Error creating offer:', err);
        cleanup();
      } finally {
        makingOfferRef.current = false;
      }
    };

    // ── Call rejected ──
    const handleRejected = () => {
      console.log('[CALL] Call rejected');
      cleanup();
    };

    // ── Call ended ──
    const handleEnded = () => {
      console.log('[CALL] Call ended by remote');
      cleanup();
    };

    // ── WebRTC offer (we are receiver → create answer) ──
    const handleOffer = async (data: unknown) => {
      const p = parsePayload(data);
      console.log('[CALL] Received offer from:', p.fromUserId);

      settingRemoteRef.current = true;

      let pc = pcRef.current;
      if (!pc) {
        pc = createPeerConnection();
      }

      try {
        // Glare: rollback our local offer if colliding
        if (pc.signalingState === 'have-local-offer') {
          console.warn('[CALL] Glare — rolling back local offer');
          await pc.setLocalDescription({ type: 'rollback' });
        }

        await pc.setRemoteDescription(
          new RTCSessionDescription(p.offer as RTCSessionDescriptionInit),
        );
        remoteDescSetRef.current = true;
        await flushIceCandidates();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (callIdRef.current) {
          socketService.sendWebRTCAnswer(callIdRef.current, answer);
        }
      } catch (err) {
        console.error('[CALL] Error handling offer:', err);
      } finally {
        settingRemoteRef.current = false;
      }
    };

    // ── WebRTC answer (we are initiator) ──
    const handleAnswer = async (data: unknown) => {
      const p = parsePayload(data);
      console.log('[CALL] Received answer from:', p.fromUserId);

      const pc = pcRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(
          new RTCSessionDescription(p.answer as RTCSessionDescriptionInit),
        );
        remoteDescSetRef.current = true;
        await flushIceCandidates();
      } catch (err) {
        console.error('[CALL] Error handling answer:', err);
      }
    };

    // ── ICE candidate ──
    const handleICE = async (data: unknown) => {
      const p = parsePayload(data);
      const candidate = p.candidate as RTCIceCandidateInit | undefined;
      if (!candidate) return;

      const pc = pcRef.current;
      if (!pc || !remoteDescSetRef.current) {
        iceCandidateQueueRef.current.push(candidate);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[CALL] Error adding ICE candidate:', err);
      }
    };

    // ── Socket reconnection ──
    const handleReconnect = () => {
      if (callIdRef.current) {
        console.log('[CALL] Socket reconnected — rejoining call:', callIdRef.current);
        socketService.rejoinCall(callIdRef.current);
        const pc = pcRef.current;
        if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'disconnected')) {
          pc.restartIce();
        }
      }
    };

    // ── Peer reconnected ──
    const handlePeerReconnected = async (data: unknown) => {
      const p = parsePayload(data);
      console.log('[CALL] Peer reconnected:', p.userId);
      const pc = pcRef.current;
      if (!pc || !callIdRef.current || makingOfferRef.current) return;

      try {
        makingOfferRef.current = true;
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);
        socketService.sendWebRTCOffer(callIdRef.current, offer);
      } catch (err) {
        console.warn('[CALL] Peer reconnect offer error:', err);
      } finally {
        makingOfferRef.current = false;
      }
    };

    // Register listeners
    socketService.onCall(handleIncoming);
    socketService.onCallAccepted(handleAccepted);
    socketService.onCallRejected(handleRejected);
    socketService.onCallEnded(handleEnded);
    socketService.onWebRTCOffer(handleOffer);
    socketService.onWebRTCAnswer(handleAnswer);
    socketService.onICECandidate(handleICE);
    socketService.onReconnected(handleReconnect);
    socketService.on('CALL_PEER_RECONNECTED', handlePeerReconnected);

    return () => {
      socketService.off('CALL_INCOMING', handleIncoming);
      socketService.off('CALL_ACCEPT', handleAccepted);
      socketService.off('CALL_REJECT', handleRejected);
      socketService.off('CALL_END', handleEnded);
      socketService.off('WEBRTC_OFFER', handleOffer);
      socketService.off('WEBRTC_ANSWER', handleAnswer);
      socketService.off('WEBRTC_ICE_CANDIDATE', handleICE);
      socketService.off('socket:reconnected', handleReconnect);
      socketService.off('CALL_PEER_RECONNECTED', handlePeerReconnected);
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
    const pc = pcRef.current;
    const stream = localStreamRef.current;
    if (!stream) return;

    const existingTrack = stream.getVideoTracks()[0];

    if (existingTrack) {
      // Toggle existing video track
      existingTrack.enabled = !existingTrack.enabled;
      setState((prev) => ({ ...prev, isVideoOff: !existingTrack.enabled }));
    } else {
      // Acquire camera and add it mid-call
      if (!hasMediaDevices()) return;

      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        const camTrack = camStream.getVideoTracks()[0];
        if (!camTrack) throw new Error('No video track');

        stream.addTrack(camTrack);

        // Add to PeerConnection — onnegotiationneeded will handle renegotiation
        if (pc) {
          pc.addTrack(camTrack, stream);
        }

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

  /** Start screen sharing */
  const startScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    const stream = localStreamRef.current;
    if (!pc || !stream) return;

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
        audio: false,
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      screenStreamRef.current = screenStream;

      // Save original video track to restore later
      const existingVideoTrack = stream.getVideoTracks()[0];
      if (existingVideoTrack) {
        originalVideoTrackRef.current = existingVideoTrack;
      }

      // Replace or add screen track
      const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(screenTrack);
      } else {
        pc.addTrack(screenTrack, stream);
      }

      setState((prev) => ({
        ...prev,
        isScreenSharing: true,
        screenStream,
      }));

      // Handle user stopping share via browser UI
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch {
      // User cancelled the picker — not an error
    }
  }, []);

  /** Stop screen sharing */
  const stopScreenShare = useCallback(async () => {
    const pc = pcRef.current;

    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;

    // Restore original video track
    if (pc && originalVideoTrackRef.current) {
      const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(originalVideoTrackRef.current);
      }
      originalVideoTrackRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isScreenSharing: false,
      screenStream: null,
    }));
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

      // Replace in PeerConnection
      const pc = pcRef.current;
      if (pc) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
        if (sender) await sender.replaceTrack(newTrack);
      }

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

  return {
    ...state,
    initiateCall,
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
