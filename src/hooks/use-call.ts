'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { socketService } from '@/lib/socket';
import { useSfuTransport } from './use-sfu-transport';
import { useCallQuality } from './use-call-quality';
import { useCallDm } from './call-strategies/use-call-dm';
import { useCallGroup } from './call-strategies/use-call-group';
import { useCallServer } from './call-strategies/use-call-server';

// ==========================================
// TYPES
// ==========================================

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';
export type CallCategory = 'dm' | 'group' | 'server';
export type QualityTier = 0 | 1 | 2 | 3;

export interface CallParticipantInfo {
  name: string;
  avatar?: string;
}

interface PendingSfuProducer {
  callId: string;
  producerId: string;
  userId: string;
  kind: 'audio' | 'video';
}

interface CallState {
  callId: string | null;
  type: 'voice' | 'video' | null;
  status: CallStatus;
  participants: string[];
  participantInfo: Map<string, CallParticipantInfo>;
  participantCount: number;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  screenStream: MediaStream | null;
  remoteIsScreenSharing: boolean;
  callerName?: string;
  callerAvatar?: string;
  mediaError?: string;
  callConversationId?: string;
  callRecipientId?: string;
  callChannelId?: string;
  isGroup: boolean;
  callCategory: CallCategory | null;
  callMode: 'p2p' | 'sfu';
  currentTier: number | null;
}

const INITIAL_STATE: CallState = {
  callId: null,
  type: null,
  status: 'idle',
  participants: [],
  participantInfo: new Map(),
  participantCount: 0,
  localStream: null,
  remoteStreams: new Map(),
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  screenStream: null,
  remoteIsScreenSharing: false,
  isGroup: false,
  callCategory: null,
  callMode: 'p2p',
  currentTier: null,
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
];

if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TURN_URL) {
  ICE_SERVERS.push({
    urls: process.env.NEXT_PUBLIC_TURN_URL,
    username: process.env.NEXT_PUBLIC_TURN_USERNAME ?? '',
    credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL ?? '',
  });
}

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

async function unlockAudioPlayback(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 1, 22050);
    source.connect(ctx.destination);
    source.start(0);
    source.stop(0);

    queueMicrotask(() => {
      ctx.close().catch(() => {});
    });
  } catch {
    // Best-effort only
  }
}

// ==========================================
// HOOK
// ==========================================

interface UseCallOptions {
  userId?: string;
}

export function useCall(options: UseCallOptions = {}) {
  const { userId } = options;

  const [state, setState] = useState<CallState>(INITIAL_STATE);

  // ── P2P refs ──
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const callIdRef = useRef<string | null>(null);
  const callTypeRef = useRef<'voice' | 'video' | null>(null);
  const iceQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteDescSetMapRef = useRef<Map<string, boolean>>(new Map());
  const makingOfferMapRef = useRef<Map<string, boolean>>(new Map());
  const settingRemoteMapRef = useRef<Map<string, boolean>>(new Map());
  const cleaningUpRef = useRef(false);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acceptedCallIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | undefined>(undefined);

  // ── SFU state refs ──
  const callModeRef = useRef<'p2p' | 'sfu'>('p2p');
  const callCategoryRef = useRef<CallCategory | null>(null);
  const pendingSfuProducersRef = useRef<PendingSfuProducer[]>([]);

  // Keep refs synced
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { callIdRef.current = state.callId; }, [state.callId]);
  useEffect(() => { callTypeRef.current = state.type; }, [state.type]);
  useEffect(() => { callModeRef.current = state.callMode; }, [state.callMode]);
  useEffect(() => { callCategoryRef.current = state.callCategory; }, [state.callCategory]);

  // ── SFU hooks ──
  const {
    sfuState,
    sfuRemoteStreams,
    producersRef,
    consumersRef,
    initSfu,
    closeSfu,
    consumeProducer,
    produceTrack,
  } = useSfuTransport();

  const { currentTier, tierLabel } = useCallQuality(producersRef);

  // Keep SFU callbacks in refs for stable access from socket handlers
  const initSfuRef = useRef(initSfu);
  const consumeProducerRef = useRef(consumeProducer);
  const closeSfuRef = useRef(closeSfu);
  useEffect(() => { initSfuRef.current = initSfu; }, [initSfu]);
  useEffect(() => { consumeProducerRef.current = consumeProducer; }, [consumeProducer]);
  useEffect(() => { closeSfuRef.current = closeSfu; }, [closeSfu]);

  // Sync quality tier from useCallQuality to state
  useEffect(() => {
    setState((prev) => ({ ...prev, currentTier: currentTier ?? prev.currentTier }));
  }, [currentTier]);

  // ── Strategy hooks ──
  useCallDm(state.callCategory === 'dm' ? state.localStream : null);

  useCallGroup({
    enabled: state.callCategory === 'group' && state.callMode === 'p2p' && state.status !== 'idle',
    onModeSwitchToSfu: useCallback(async (callId: string) => {
      // Close P2P connections
      pcsRef.current.forEach((pc) => {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.close();
      });
      pcsRef.current.clear();
      iceQueuesRef.current.clear();
      remoteDescSetMapRef.current.clear();
      makingOfferMapRef.current.clear();
      settingRemoteMapRef.current.clear();

      setState((prev) => ({
        ...prev,
        callMode: 'sfu',
        remoteStreams: new Map(),
        status: 'connecting',
      }));

      await initSfuRef.current(callId, localStreamRef.current);
      setState((prev) => ({ ...prev, status: 'connected' }));
    }, []),
  });

  const { handRaised, raiseHand, lowerHand, toggleHand, reset: resetHand } = useCallServer();

  // ── Drain pending SFU producers once recv transport is ready ──
  useEffect(() => {
    if (!sfuState.recvTransportReady) return;

    const queue = pendingSfuProducersRef.current.splice(0);
    for (const item of queue) {
      consumeProducerRef.current(item.callId, item.producerId, item.userId, item.kind).catch(console.error);
    }
  }, [sfuState.recvTransportReady]);

  // ── Merge SFU remote streams into state when in SFU mode ──
  useEffect(() => {
    if (callModeRef.current !== 'sfu') return;
    setState((prev) => ({ ...prev, remoteStreams: sfuRemoteStreams }));
  }, [sfuRemoteStreams]);

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

    // Close SFU if active
    if (callIdRef.current && callModeRef.current === 'sfu') {
      closeSfuRef.current(callIdRef.current);
    }

    // Close P2P connections
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
    pendingSfuProducersRef.current = [];

    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    originalVideoTrackRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    acceptedCallIdRef.current = null;
    resetHand();
    setState({ ...INITIAL_STATE });
    cleaningUpRef.current = false;
  }, [resetHand]);

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

    pc.onicecandidate = (event) => {
      if (event.candidate && callIdRef.current) {
        socketService.sendICECandidate(callIdRef.current, event.candidate.toJSON(), peerId);
      }
    };

    // Convention: stream with audio = camera/voice (key=peerId), stream without audio = screen (key=`${peerId}_screen`)
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;

      const hasAudio = stream.getAudioTracks().length > 0;
      const key = hasAudio ? peerId : `${peerId}_screen`;

      console.log(`[CALL] ontrack from ${peerId} — key=${key} hasAudio=${hasAudio}`);

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

    pc.onconnectionstatechange = () => {
      console.log(`[CALL] PC[${peerId}] state:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        setState((prev) => ({ ...prev, status: 'connected' }));
      } else if (pc.connectionState === 'failed') {
        console.warn(`[CALL] PC[${peerId}] failed — ICE restart`);
        pc.restartIce();
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') pc.restartIce();
    };

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
          callId: (p.callId || p.id) as string,
          type: ((p.callType || p.type) as 'voice' | 'video') || 'voice',
          status: 'ringing',
          participants: [p.initiatorId as string].filter(Boolean),
          callerName: p.callerName as string | undefined,
          callerAvatar: p.callerAvatar as string | undefined,
          callConversationId: p.conversationId as string | undefined,
          callRecipientId: p.initiatorId as string | undefined,
          callChannelId: p.channelId as string | undefined,
          isGroup: !!(p.isGroup) || p.callCategory === 'server',
          callCategory: (p.callCategory as CallCategory) || 'dm',
          mediaError: undefined,
        };
      });
    };

    // ── Someone accepted the call ──
    const handleAccepted = (data: unknown) => {
      const p = parsePayload(data);
      const joinedId = p.userId as string;
      if (joinedId === userIdRef.current) return;
      console.log('[CALL] Call accepted by:', joinedId);
      setState((prev) => ({
        ...prev,
        status: prev.status === 'calling' ? 'connecting' : prev.status,
        participants: prev.participants.includes(joinedId)
          ? prev.participants
          : [...prev.participants, joinedId],
      }));
    };

    // ── New participant joined → existing participants create PC + offer (P2P only) ──
    const handleParticipantJoined = async (data: unknown) => {
      const p = parsePayload(data);
      const newPeerId = p.userId as string;
      if (newPeerId === userIdRef.current) return;

      // In SFU mode, producers handle presence via SFU_NEW_PRODUCER
      if (callModeRef.current === 'sfu') {
        setState((prev) => ({
          ...prev,
          participants: prev.participants.includes(newPeerId)
            ? prev.participants
            : [...prev.participants, newPeerId],
          participantInfo: (() => {
            const m = new Map(prev.participantInfo);
            m.set(newPeerId, { name: (p.userName as string) || 'Utilisateur', avatar: p.userAvatar as string | undefined });
            return m;
          })(),
        }));
        return;
      }

      const existingPc = pcsRef.current.get(newPeerId);
      if (existingPc && existingPc.connectionState !== 'failed' && existingPc.connectionState !== 'closed') {
        console.warn('[CALL] Duplicate PARTICIPANT_JOINED for', newPeerId, '— ignoring');
        return;
      }

      console.log('[CALL] New participant joined, creating PC for:', newPeerId);

      const eventCallId = (p.callId as string | undefined) || callIdRef.current;
      if (!eventCallId) return;
      if (!callIdRef.current) callIdRef.current = eventCallId;

      const peerName = (p.userName as string | undefined) || 'Utilisateur';
      const peerAvatar = p.userAvatar as string | undefined;

      setState((prev) => {
        const newInfo = new Map(prev.participantInfo);
        newInfo.set(newPeerId, { name: peerName, avatar: peerAvatar });
        return {
          ...prev,
          status: 'connecting',
          participants: prev.participants.includes(newPeerId)
            ? prev.participants
            : [...prev.participants, newPeerId],
          participantInfo: newInfo,
        };
      });

      const pc = createPeerConnection(newPeerId);
      try {
        makingOfferMapRef.current.set(newPeerId, true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketService.sendWebRTCOffer(eventCallId, offer, newPeerId);
      } catch (err) {
        console.error('[CALL] Error creating offer for new participant:', err);
      } finally {
        makingOfferMapRef.current.set(newPeerId, false);
      }
    };

    const handleRejected = () => { console.log('[CALL] Call rejected'); cleanup(); };
    const handleEnded = () => { console.log('[CALL] Call ended'); cleanup(); };

    // ── Peer left ──
    const handlePeerLeft = (data: unknown) => {
      const p = parsePayload(data);
      const leftId = p.userId as string;
      if (leftId === userIdRef.current) return;
      console.log('[CALL] Peer left:', leftId);

      const pc = pcsRef.current.get(leftId);
      if (pc) { pc.close(); pcsRef.current.delete(leftId); }
      iceQueuesRef.current.delete(leftId);
      remoteDescSetMapRef.current.delete(leftId);

      setState((prev) => {
        const newStreams = new Map(prev.remoteStreams);
        newStreams.delete(leftId);
        newStreams.delete(`${leftId}_screen`);
        const newInfo = new Map(prev.participantInfo);
        newInfo.delete(leftId);
        const remaining = prev.participants.filter((id) => id !== leftId);
        if (remaining.length === 0 && prev.callCategory === 'dm') return { ...INITIAL_STATE };
        return { ...prev, participants: remaining, remoteStreams: newStreams, participantInfo: newInfo };
      });
    };

    // ── WebRTC offer received ──
    const handleOffer = async (data: unknown) => {
      if (callModeRef.current === 'sfu') return; // ignore P2P offers in SFU mode

      const p = parsePayload(data);
      const fromUserId = p.fromUserId as string;
      if (fromUserId === userIdRef.current) return;
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

      const myId = userIdRef.current;
      const polite = !!myId && myId < fromUserId;
      const offerCollision = makingOfferMapRef.current.get(fromUserId) || pc.signalingState !== 'stable';

      if (offerCollision && !polite) {
        console.warn(`[CALL] Impolite — ignoring offer collision from ${fromUserId}`);
        return;
      }

      settingRemoteMapRef.current.set(fromUserId, true);
      try {
        if (pc.signalingState !== 'stable') {
          console.warn(`[CALL] Polite rollback for ${fromUserId}`);
          await pc.setLocalDescription({ type: 'rollback' });
        }
        await pc.setRemoteDescription(new RTCSessionDescription(p.offer as RTCSessionDescriptionInit));
        remoteDescSetMapRef.current.set(fromUserId, true);
        await flushIceCandidates(fromUserId);
        if (pc.signalingState !== 'have-remote-offer' && pc.signalingState !== 'have-local-pranswer') {
          console.warn(`[CALL] Cannot createAnswer in state: ${pc.signalingState}`);
          return;
        }
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
      if (callModeRef.current === 'sfu') return;

      const p = parsePayload(data);
      const fromUserId = p.fromUserId as string;
      if (fromUserId === userIdRef.current) return;

      const pc = pcsRef.current.get(fromUserId);
      if (!pc) return;
      if (pc.signalingState !== 'have-local-offer') {
        console.warn(`[CALL] Ignoring answer from ${fromUserId} in state: ${pc.signalingState}`);
        return;
      }
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
      if (callModeRef.current === 'sfu') return;

      const p = parsePayload(data);
      const fromUserId = p.fromUserId as string;
      if (fromUserId === userIdRef.current) return;
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

      setState((prev) => {
        const newStreams = new Map(prev.remoteStreams);
        if (!active) {
          for (const key of newStreams.keys()) {
            if (key.endsWith('_screen')) newStreams.delete(key);
          }
        }
        return { ...prev, remoteStreams: newStreams, remoteIsScreenSharing: active };
      });
    };

    // ── SFU: new producer from a remote participant ──
    const handleNewProducer = async (data: unknown) => {
      const p = parsePayload(data);
      const producerUserId = p.userId as string;
      if (producerUserId === userIdRef.current) return;

      const callId = (p.callId as string) || callIdRef.current;
      if (!callId) return;

      const item: PendingSfuProducer = {
        callId,
        producerId: p.producerId as string,
        userId: producerUserId,
        kind: p.kind as 'audio' | 'video',
      };

      if (!sfuState.recvTransportReady) {
        pendingSfuProducersRef.current.push(item);
        return;
      }

      await consumeProducerRef.current(item.callId, item.producerId, item.userId, item.kind);
    };

    // ── Participant count update from gateway ──
    const handleParticipantCount = (data: unknown) => {
      const p = parsePayload(data);
      setState((prev) => ({ ...prev, participantCount: p.count as number }));
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

    socketService.onCall(handleIncoming);
    socketService.onCallAccepted(handleAccepted);
    socketService.on('CALL_PARTICIPANT_JOINED', handleParticipantJoined);
    socketService.onCallRejected(handleRejected);
    socketService.onCallEnded(handleEnded);
    socketService.on('CALL_PARTICIPANT_LEFT', handlePeerLeft);
    socketService.onWebRTCOffer(handleOffer);
    socketService.onWebRTCAnswer(handleAnswer);
    socketService.onICECandidate(handleICE);
    socketService.onReconnected(handleReconnect);
    socketService.on('CALL_SCREEN_SHARE', handleRemoteScreenShare);
    socketService.on('SFU_NEW_PRODUCER', handleNewProducer);
    socketService.on('CALL_PARTICIPANT_COUNT', handleParticipantCount);

    return () => {
      socketService.off('CALL_INCOMING', handleIncoming);
      socketService.off('CALL_ACCEPT', handleAccepted);
      socketService.off('CALL_PARTICIPANT_JOINED', handleParticipantJoined);
      socketService.off('CALL_REJECT', handleRejected);
      socketService.off('CALL_END', handleEnded);
      socketService.off('CALL_PARTICIPANT_LEFT', handlePeerLeft);
      socketService.off('WEBRTC_OFFER', handleOffer);
      socketService.off('WEBRTC_ANSWER', handleAnswer);
      socketService.off('WEBRTC_ICE_CANDIDATE', handleICE);
      socketService.off('socket:reconnected', handleReconnect);
      socketService.off('CALL_SCREEN_SHARE', handleRemoteScreenShare);
      socketService.off('SFU_NEW_PRODUCER', handleNewProducer);
      socketService.off('CALL_PARTICIPANT_COUNT', handleParticipantCount);
    };
  }, [createPeerConnection, flushIceCandidates, cleanup, sfuState.recvTransportReady]);

  // ==========================================
  // CALL TIMEOUT (30s, DM only)
  // ==========================================

  useEffect(() => {
    if (state.status === 'calling' && state.callCategory === 'dm') {
      callTimeoutRef.current = setTimeout(() => {
        console.warn('[CALL] DM timeout — no answer after 30s');
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
  }, [state.status, state.callCategory, cleanup]);

  // ==========================================
  // ACTIONS
  // ==========================================

  const initiateCall = useCallback(
    async (recipientId: string, type: 'voice' | 'video', conversationId?: string, recipientName?: string) => {
      console.log('[CALL] Initiating DM call:', recipientId, type);
      await unlockAudioPlayback();

      let convId = conversationId;
      if (!convId && recipientId && userId) {
        const sorted = [userId, recipientId].sort();
        convId = `dm_${sorted[0]}_${sorted[1]}`;
      }

      setState((prev) => ({
        ...prev,
        type,
        status: 'calling',
        callerName: recipientName || undefined,
        callConversationId: convId || undefined,
        callRecipientId: recipientId,
        callCategory: 'dm',
        callMode: 'p2p',
        mediaError: undefined,
      }));

      const stream = await requestMedia(type);
      if (!stream) return;

      localStreamRef.current = stream;
      setState((prev) => ({ ...prev, localStream: stream }));

      socketService.initiateCall(
        { recipientId, conversationId: convId, type },
        (response: Record<string, unknown>) => {
          console.log('[CALL] Initiate response:', response);
          if (response?.callId || response?.id) {
            const cid = (response.callId || response.id) as string;
            callIdRef.current = cid;
            setState((prev) => ({ ...prev, callId: cid }));
          } else if (response?.error) {
            setState((prev) => ({ ...prev, mediaError: `Erreur serveur : ${response.error}` }));
          }
        },
      );
    },
    [requestMedia, userId],
  );

  const acceptCall = useCallback(async () => {
    if (!state.callId || !state.type) {
      console.warn('[CALL] Cannot accept: no callId or type');
      return;
    }
    if (state.status === 'ended') return;
    if (acceptedCallIdRef.current === state.callId) return;
    acceptedCallIdRef.current = state.callId;

    await unlockAudioPlayback();
    setState((prev) => ({ ...prev, status: 'connecting', mediaError: undefined }));

    const stream = await requestMedia(state.type);
    if (!stream) { acceptedCallIdRef.current = null; return; }

    localStreamRef.current = stream;
    setState((prev) => ({ ...prev, localStream: stream }));
    socketService.acceptCall(state.callId);
  }, [state.callId, state.type, state.status, requestMedia]);

  const declineCall = useCallback(() => {
    if (state.callId) socketService.rejectCall(state.callId);
    cleanup();
  }, [state.callId, cleanup]);

  const endCall = useCallback(() => {
    if (state.callId) socketService.endCall(state.callId);
    cleanup();
  }, [state.callId, cleanup]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setState((prev) => ({ ...prev, isMuted: !track.enabled }));
  }, []);

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
        pcsRef.current.forEach((pc) => pc.addTrack(camTrack, stream));
        setState((prev) => ({ ...prev, isVideoOff: false, localStream: stream, type: 'video', mediaError: undefined }));
      } catch (err: unknown) {
        const error = err as DOMException;
        let msg = "Impossible d'activer la caméra.";
        if (error.name === 'NotAllowedError') msg = "Accès à la caméra refusé.";
        else if (error.name === 'NotFoundError') msg = 'Aucune caméra détectée.';
        else if (error.name === 'NotReadableError') msg = 'La caméra est utilisée par une autre application.';
        setState((prev) => ({ ...prev, mediaError: msg }));
      }
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!localStreamRef.current) return;
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
        audio: false,
      });
      const screenTrack = displayStream.getVideoTracks()[0];
      screenStreamRef.current = displayStream;
      const screenOnlyStream = new MediaStream([screenTrack]);
      pcsRef.current.forEach((pc) => pc.addTrack(screenTrack, screenOnlyStream));
      setState((prev) => ({ ...prev, isScreenSharing: true, screenStream: displayStream }));
      if (callIdRef.current) socketService.notifyScreenShare(callIdRef.current, true);
      screenTrack.onended = () => stopScreenShare();
    } catch {
      // User cancelled
    }
  }, []);

  const stopScreenShare = useCallback(async () => {
    const screenStream = screenStreamRef.current;
    if (screenStream) {
      const screenTrackIds = new Set(screenStream.getVideoTracks().map((t) => t.id));
      pcsRef.current.forEach((pc) => {
        pc.getSenders().forEach((sender) => {
          if (sender.track && screenTrackIds.has(sender.track.id)) pc.removeTrack(sender);
        });
      });
      screenStream.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    originalVideoTrackRef.current = null;
    setState((prev) => ({ ...prev, isScreenSharing: false, screenStream: null }));
    if (callIdRef.current) socketService.notifyScreenShare(callIdRef.current, false);
  }, []);

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
      const replacePromises: Promise<void>[] = [];
      pcsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
        if (sender) replacePromises.push(sender.replaceTrack(newTrack));
      });
      await Promise.all(replacePromises);
      if (oldTrack) { localStreamRef.current.removeTrack(oldTrack); oldTrack.stop(); }
      localStreamRef.current.addTrack(newTrack);
      setAudioPreferences({ inputDeviceId: deviceId });
    } catch (err) {
      console.error('[CALL] Error switching audio input:', err);
    }
  }, []);

  /** Initiate a channel group call (P2P mesh, upgrades to SFU at threshold) */
  const initiateGroupCall = useCallback(
    async (channelId: string, type: 'voice' | 'video', channelName?: string) => {
      console.log('[CALL] Initiating group call on channel:', channelId, type);
      await unlockAudioPlayback();

      setState((prev) => ({
        ...prev,
        type,
        status: 'calling',
        callerName: channelName,
        callChannelId: channelId,
        isGroup: true,
        callCategory: 'group',
        callMode: 'p2p',
        mediaError: undefined,
      }));

      const stream = await requestMedia(type);
      if (!stream) return;

      localStreamRef.current = stream;
      setState((prev) => ({ ...prev, localStream: stream }));

      socketService.initiateGroupCall(
        { channelId, type },
        (response: Record<string, unknown>) => {
          console.log('[CALL] Group call initiate response:', response);
          if (response?.callId || response?.id) {
            const cid = (response.callId || response.id) as string;
            callIdRef.current = cid;
            setState((prev) => ({ ...prev, callId: cid, status: 'calling' }));
          } else if (response?.error) {
            setState((prev) => ({ ...prev, mediaError: `Erreur serveur : ${response.error}` }));
          }
        },
      );
    },
    [requestMedia],
  );

  /** Initiate a server/community call (always SFU) */
  const initiateServerCall = useCallback(
    async (channelId: string, serverId: string, type: 'voice' | 'video', channelName?: string) => {
      console.log('[CALL] Initiating server call on channel:', channelId, type);
      await unlockAudioPlayback();

      setState((prev) => ({
        ...prev,
        type,
        status: 'calling',
        callerName: channelName,
        callChannelId: channelId,
        isGroup: true,
        callCategory: 'server',
        callMode: 'sfu',
        mediaError: undefined,
      }));

      const stream = await requestMedia(type);
      if (!stream) return;

      localStreamRef.current = stream;
      setState((prev) => ({ ...prev, localStream: stream }));

      socketService.emitWithAck(
        'CALL_INITIATE_SERVER',
        { channelId, serverId, type },
        async (response: Record<string, unknown>) => {
          console.log('[CALL] Server call initiate response:', response);
          if (response?.callId || response?.id) {
            const cid = (response.callId || response.id) as string;
            callIdRef.current = cid;
            setState((prev) => ({ ...prev, callId: cid }));
            // Server calls are always SFU
            await initSfuRef.current(cid, localStreamRef.current);
            setState((prev) => ({ ...prev, status: 'connected' }));
          } else if (response?.error) {
            setState((prev) => ({ ...prev, mediaError: `Erreur serveur : ${response.error}` }));
          }
        },
      );
    },
    [requestMedia],
  );

  /** Join an existing call (handles both P2P and SFU paths) */
  const joinCall = useCallback(async () => {
    if (!state.callId || !state.type) {
      console.warn('[CALL] Cannot join: no callId or type');
      return;
    }
    await unlockAudioPlayback();

    setState((prev) => ({ ...prev, status: 'connecting', mediaError: undefined }));

    const stream = await requestMedia(state.type);
    if (!stream) return;

    localStreamRef.current = stream;
    setState((prev) => ({ ...prev, localStream: stream }));

    socketService.joinCall(state.callId, async (response: Record<string, unknown>) => {
      console.log('[CALL] Join response:', response);
      if (response?.error) {
        setState((prev) => ({ ...prev, mediaError: `Erreur : ${response.error}` }));
        return;
      }

      const isSfu = response?.callMode === 'sfu' || callCategoryRef.current === 'server';

      if (isSfu) {
        setState((prev) => ({ ...prev, callMode: 'sfu' }));
        await initSfuRef.current(state.callId!, localStreamRef.current);

        // Consume existing producers reported by gateway
        type PeerProd = { userId: string; producerId: string; kind: 'audio' | 'video' };
        const existingProducers = (response?.existingProducers as PeerProd[]) ?? [];
        for (const prod of existingProducers) {
          if (prod.userId !== userId) {
            await consumeProducerRef.current(state.callId!, prod.producerId, prod.userId, prod.kind);
          }
        }

        setState((prev) => ({ ...prev, status: 'connected' }));
        return;
      }

      // ── P2P path ──
      type PeerEntry = { userId: string; userName?: string; userAvatar?: string };
      const rawParticipants = (response?.existingParticipants as Array<string | PeerEntry>) ?? [];

      setState((prev) => {
        const newInfo = new Map(prev.participantInfo);
        for (const peer of rawParticipants) {
          if (typeof peer === 'object' && peer.userName) {
            newInfo.set(peer.userId, { name: peer.userName, avatar: peer.userAvatar });
          }
        }
        return { ...prev, participantInfo: newInfo };
      });

      for (const raw of rawParticipants) {
        const peerId = typeof raw === 'string' ? raw : raw.userId;
        if (peerId === userId) continue;
        const pc = createPeerConnection(peerId);
        setState((prev) => ({
          ...prev,
          status: 'connecting',
          participants: prev.participants.includes(peerId) ? prev.participants : [...prev.participants, peerId],
        }));
        makingOfferMapRef.current.set(peerId, true);
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            if (callIdRef.current && pc.localDescription) {
              socketService.sendWebRTCOffer(callIdRef.current, pc.localDescription, peerId);
            }
          })
          .catch((err) => console.error('[CALL] Error creating offer for existing peer:', err))
          .finally(() => makingOfferMapRef.current.set(peerId, false));
      }
    });
  }, [state.callId, state.type, requestMedia, createPeerConnection, userId]);

  const leaveCall = useCallback(() => {
    console.log('[CALL] Leaving:', state.callId);
    if (state.callId) socketService.leaveCall(state.callId);
    cleanup();
  }, [state.callId, cleanup]);

  const handleRaiseHand = useCallback(() => {
    if (state.callId) raiseHand(state.callId);
  }, [state.callId, raiseHand]);

  const handleLowerHand = useCallback(() => {
    if (state.callId) lowerHand(state.callId);
  }, [state.callId, lowerHand]);

  const handleToggleHand = useCallback(() => {
    if (state.callId) toggleHand(state.callId, handRaised);
  }, [state.callId, toggleHand, handRaised]);

  return {
    ...state,
    tierLabel,
    handRaised,
    sfuState,
    initiateCall,
    initiateGroupCall,
    initiateServerCall,
    joinCall,
    acceptCall,
    declineCall,
    endCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    switchAudioInput,
    raiseHand: handleRaiseHand,
    lowerHand: handleLowerHand,
    toggleHand: handleToggleHand,
  };
}
