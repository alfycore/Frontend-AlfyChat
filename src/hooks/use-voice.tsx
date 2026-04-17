'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { getAudioPreferences } from '@/hooks/use-call';

// ── Types ──

export interface VoiceParticipant {
  userId: string;
  username: string;
  avatarUrl?: string;
  muted: boolean;
  deafened: boolean;
}

export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

export interface NetworkStats {
  quality: NetworkQuality;
  rtt: number | null;       // round-trip time in ms
  packetLoss: number | null; // percentage 0-100
  jitter: number | null;    // seconds
}

interface VoiceState {
  /** The channel the current user is connected to */
  currentChannelId: string | null;
  currentServerId: string | null;
  /** Participants in the current voice channel */
  participants: VoiceParticipant[];
  /** All voice states across channels (channelId → participants) */
  channelParticipants: Map<string, VoiceParticipant[]>;
  /** Local state */
  isMuted: boolean;
  isDeafened: boolean;
  isConnecting: boolean;
  /** Audio streams from other users */
  remoteStreams: Map<string, MediaStream>;
  /** Aggregated network quality across all active peer connections */
  networkStats: NetworkStats;
}

interface VoiceContextType extends VoiceState {
  joinChannel: (serverId: string, channelId: string) => Promise<void>;
  leaveChannel: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  getChannelParticipants: (channelId: string) => VoiceParticipant[];
  /** Fetch the current voice snapshot from the gateway (on mount/server-change). */
  refreshVoiceState: (serverId: string) => void;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

// ── ICE Configuration ──
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
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
  ],
  iceCandidatePoolSize: 10,
};

// ── Provider ──

export function VoiceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [currentServerId, setCurrentServerId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [channelParticipants, setChannelParticipants] = useState<Map<string, VoiceParticipant[]>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    quality: 'unknown',
    rtt: null,
    packetLoss: null,
    jitter: null,
  });

  // Refs for WebRTC
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const currentChannelRef = useRef<string | null>(null);
  const currentServerRef = useRef<string | null>(null);
  // ICE candidate queue: holds candidates that arrive before remote desc is set
  const iceQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteDescSetRef = useRef<Map<string, boolean>>(new Map());

  // Keep refs in sync
  useEffect(() => { currentChannelRef.current = currentChannelId; }, [currentChannelId]);
  useEffect(() => { currentServerRef.current = currentServerId; }, [currentServerId]);

  // ── Flush queued ICE candidates once remote desc is set ──
  const flushIceCandidates = useCallback(async (peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (!pc || !remoteDescSetRef.current.get(peerId)) return;
    const queue = iceQueuesRef.current.get(peerId) ?? [];
    iceQueuesRef.current.set(peerId, []);
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore
      }
    }
  }, []);

  // ── Cleanup peer connection ──
  const cleanupPeerConnection = useCallback((peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.onnegotiationneeded = null;
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    iceQueuesRef.current.delete(peerId);
    remoteDescSetRef.current.delete(peerId);
    setRemoteStreams(prev => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  // ── Create peer connection to a user ──
  const createPeerConnection = useCallback((targetUserId: string, channelId: string): RTCPeerConnection => {
    // Clean up existing connection
    cleanupPeerConnection(targetUserId);

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(targetUserId, pc);
    remoteDescSetRef.current.set(targetUserId, false);
    iceQueuesRef.current.set(targetUserId, []);

    // Add local tracks if stream is already available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendVoiceICE(channelId, targetUserId, event.candidate.toJSON());
      }
    };

    // Handle remote tracks
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.set(targetUserId, stream);
          return next;
        });
        stream.onaddtrack = () => {
          setRemoteStreams(prev => {
            const next = new Map(prev);
            next.set(targetUserId, stream);
            return next;
          });
        };
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[Voice] PC[${targetUserId}] state:`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        pc.restartIce();
      } else if (pc.connectionState === 'disconnected') {
        cleanupPeerConnection(targetUserId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') pc.restartIce();
    };

    return pc;
  }, [cleanupPeerConnection]);

  // Stable ref to leaveChannelInternal so joinChannel doesn't depend on its declaration order
  const leaveChannelInternalRef = useRef<() => void>(() => {});

  // ── Join a voice channel ──
  const joinChannel = useCallback(async (serverId: string, channelId: string) => {
    if (currentChannelRef.current === channelId) return;

    // Leave current channel first
    if (currentChannelRef.current) {
      leaveChannelInternalRef.current();
    }

    setIsConnecting(true);

    try {
      // Get microphone access
      const audioPrefs = getAudioPreferences();
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: audioPrefs.echoCancellation,
        noiseSuppression: audioPrefs.noiseSuppression,
        autoGainControl: audioPrefs.autoGainControl,
      };
      if (audioPrefs.inputDeviceId && audioPrefs.inputDeviceId !== 'default') {
        audioConstraints.deviceId = { exact: audioPrefs.inputDeviceId };
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });
      localStreamRef.current = stream;

      // Apply mute state
      stream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });

      // If offers already arrived before stream was ready, add tracks to existing PCs
      peerConnectionsRef.current.forEach((pc) => {
        stream.getTracks().forEach(track => {
          const alreadyAdded = pc.getSenders().some(s => s.track?.id === track.id);
          if (!alreadyAdded) pc.addTrack(track, stream);
        });
      });

      // Update refs IMMEDIATELY (before joinVoiceChannel) so incoming offers
      // are not rejected while React state update is still pending
      currentChannelRef.current = channelId;
      currentServerRef.current = serverId;
      setCurrentChannelId(channelId);
      setCurrentServerId(serverId);

      // Tell gateway we joined
      socketService.joinVoiceChannel(serverId, channelId);
    } catch (err) {
      console.error('[Voice] Failed to get microphone:', err);
      // Still join even without mic (listen-only)
      currentChannelRef.current = channelId;
      currentServerRef.current = serverId;
      setCurrentChannelId(channelId);
      setCurrentServerId(serverId);
      socketService.joinVoiceChannel(serverId, channelId);
    } finally {
      setIsConnecting(false);
    }
  }, [isMuted]);

  // ── Leave voice channel (internal) ──
  const leaveChannelInternal = useCallback(() => {
    const chId = currentChannelRef.current;
    const sId = currentServerRef.current;

    // Update refs IMMEDIATELY so late-arriving events are ignored
    currentChannelRef.current = null;
    currentServerRef.current = null;

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.onnegotiationneeded = null;
      pc.close();
    });
    peerConnectionsRef.current.clear();
    iceQueuesRef.current.clear();
    remoteDescSetRef.current.clear();

    // Stop local stream
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    // Clear remote streams
    setRemoteStreams(new Map());
    setParticipants([]);
    setCurrentChannelId(null);
    setCurrentServerId(null);
    setNetworkStats({ quality: 'unknown', rtt: null, packetLoss: null, jitter: null });

    if (chId && sId) {
      socketService.leaveVoiceChannel(sId, chId);
    }
  }, []);

  // Keep the ref up to date
  leaveChannelInternalRef.current = leaveChannelInternal;

  const leaveChannel = useCallback(() => {
    leaveChannelInternal();
  }, [leaveChannelInternal]);

  // ── Toggle mute ──  
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
      
      if (currentChannelRef.current && currentServerRef.current) {
        socketService.updateVoiceState(currentServerRef.current, currentChannelRef.current, { muted: newMuted });
      }
      return newMuted;
    });
  }, []);

  // ── Toggle deafen ──
  const toggleDeafen = useCallback(() => {
    setIsDeafened(prev => {
      const newDeafened = !prev;
      
      // Mute all remote audio when deafened
      remoteStreams.forEach(stream => {
        stream.getAudioTracks().forEach(t => { t.enabled = !newDeafened; });
      });

      if (currentChannelRef.current && currentServerRef.current) {
        socketService.updateVoiceState(currentServerRef.current, currentChannelRef.current, { deafened: newDeafened });
      }

      // Also mute self when deafening
      if (newDeafened && !isMuted) {
        setIsMuted(true);
        localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; });
        if (currentChannelRef.current && currentServerRef.current) {
          socketService.updateVoiceState(currentServerRef.current, currentChannelRef.current, { muted: true, deafened: true });
        }
      }
      return newDeafened;
    });
  }, [remoteStreams, isMuted]);

  // ── Get participants for a specific channel ──
  const getChannelParticipants = useCallback((channelId: string): VoiceParticipant[] => {
    return channelParticipants.get(channelId) || [];
  }, [channelParticipants]);

  const refreshVoiceState = useCallback((serverId: string) => {
    socketService.requestVoiceState(serverId, (channels) => {
      if (channels.length === 0) return;
      setChannelParticipants((prev) => {
        const next = new Map(prev);
        channels.forEach(({ channelId, participants: ps }) => {
          if (ps && ps.length > 0) {
            next.set(channelId, ps);
          }
        });
        return next;
      });
    });
  }, []);

  // ── Socket event handlers ──
  useEffect(() => {
    const handleVoiceStateUpdate = (data: any) => {
      const payload = data?.payload ?? data;
      const { channelId, participants: ps } = payload;
      
      setChannelParticipants(prev => {
        const next = new Map(prev);
        if (ps && ps.length > 0) {
          next.set(channelId, ps);
        } else {
          next.delete(channelId);
        }
        return next;
      });

      // Update current channel participants
      if (channelId === currentChannelRef.current) {
        setParticipants(ps || []);
      }
    };

    const handleVoiceUserJoined = async (data: any) => {
      const payload = data?.payload ?? data;
      const { channelId, userId: joinedUserId } = payload;

      if (channelId !== currentChannelRef.current || joinedUserId === userId) return;

      console.log('[Voice] User joined, creating offer for:', joinedUserId);
      try {
        const pc = createPeerConnection(joinedUserId, channelId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketService.sendVoiceOffer(channelId, joinedUserId, offer);
      } catch (err) {
        console.error('[Voice] Failed to create offer for', joinedUserId, err);
      }
    };

    const handleVoiceUserLeft = (data: any) => {
      const payload = data?.payload ?? data;
      const { channelId, userId: leftUserId } = payload;

      if (channelId !== currentChannelRef.current) return;
      cleanupPeerConnection(leftUserId);
    };

    const handleVoiceOffer = async (data: any) => {
      const payload = data?.payload ?? data;
      const { channelId, fromUserId, offer } = payload;

      if (channelId !== currentChannelRef.current) return;
      console.log('[Voice] Received offer from:', fromUserId);

      try {
        const pc = createPeerConnection(fromUserId, channelId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        remoteDescSetRef.current.set(fromUserId, true);
        await flushIceCandidates(fromUserId);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketService.sendVoiceAnswer(channelId, fromUserId, answer);
      } catch (err) {
        console.error('[Voice] Failed to handle offer from', fromUserId, err);
      }
    };

    const handleVoiceAnswer = async (data: any) => {
      const payload = data?.payload ?? data;
      const { channelId, fromUserId, answer } = payload;

      if (channelId !== currentChannelRef.current) return;
      console.log('[Voice] Received answer from:', fromUserId);

      const pc = peerConnectionsRef.current.get(fromUserId);
      if (!pc) return;
      try {
        if (pc.signalingState !== 'have-local-offer') {
          console.warn('[Voice] Unexpected signalingState for answer:', pc.signalingState);
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        remoteDescSetRef.current.set(fromUserId, true);
        await flushIceCandidates(fromUserId);
      } catch (err) {
        console.error('[Voice] Failed to handle answer from', fromUserId, err);
      }
    };

    const handleVoiceICE = async (data: any) => {
      const payload = data?.payload ?? data;
      const { channelId, fromUserId, candidate } = payload;

      if (channelId !== currentChannelRef.current || !candidate) return;

      const pc = peerConnectionsRef.current.get(fromUserId);
      // Queue if remote desc not yet set
      if (!pc || !remoteDescSetRef.current.get(fromUserId)) {
        if (!iceQueuesRef.current.has(fromUserId)) iceQueuesRef.current.set(fromUserId, []);
        iceQueuesRef.current.get(fromUserId)!.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore errors during teardown
      }
    };

    socketService.on('VOICE_STATE_UPDATE', handleVoiceStateUpdate);
    socketService.on('VOICE_USER_JOINED', handleVoiceUserJoined);
    socketService.on('VOICE_USER_LEFT', handleVoiceUserLeft);
    socketService.on('VOICE_OFFER', handleVoiceOffer);
    socketService.on('VOICE_ANSWER', handleVoiceAnswer);
    socketService.on('VOICE_ICE_CANDIDATE', handleVoiceICE);

    return () => {
      socketService.off('VOICE_STATE_UPDATE', handleVoiceStateUpdate);
      socketService.off('VOICE_USER_JOINED', handleVoiceUserJoined);
      socketService.off('VOICE_USER_LEFT', handleVoiceUserLeft);
      socketService.off('VOICE_OFFER', handleVoiceOffer);
      socketService.off('VOICE_ANSWER', handleVoiceAnswer);
      socketService.off('VOICE_ICE_CANDIDATE', handleVoiceICE);
    };
  }, [userId, createPeerConnection, cleanupPeerConnection, flushIceCandidates]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveChannelInternal();
    };
  }, [leaveChannelInternal]);

  // ── Network quality polling (every 3s while in a voice channel) ──
  useEffect(() => {
    if (!currentChannelId) {
      setNetworkStats({ quality: 'unknown', rtt: null, packetLoss: null, jitter: null });
      return;
    }

    let cancelled = false;

    const computeQuality = (rttMs: number | null, lossPct: number | null): NetworkQuality => {
      if (rttMs === null && lossPct === null) return 'unknown';
      const rtt = rttMs ?? 0;
      const loss = lossPct ?? 0;
      if (rtt < 100 && loss < 2) return 'excellent';
      if (rtt < 200 && loss < 5) return 'good';
      if (rtt < 350 && loss < 10) return 'fair';
      return 'poor';
    };

    const pollStats = async () => {
      const pcs = Array.from(peerConnectionsRef.current.values());
      if (pcs.length === 0) {
        if (!cancelled) {
          setNetworkStats({ quality: 'unknown', rtt: null, packetLoss: null, jitter: null });
        }
        return;
      }

      let worstRtt: number | null = null;
      let worstLoss: number | null = null;
      let worstJitter: number | null = null;

      for (const pc of pcs) {
        try {
          const report = await pc.getStats();
          let rttSec: number | null = null;
          let packetsLost = 0;
          let packetsReceived = 0;
          let jitter: number | null = null;

          report.forEach((stat: any) => {
            if (stat.type === 'candidate-pair' && stat.state === 'succeeded' && stat.nominated) {
              if (typeof stat.currentRoundTripTime === 'number') {
                rttSec = stat.currentRoundTripTime;
              }
            }
            if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
              if (typeof stat.packetsLost === 'number') packetsLost += stat.packetsLost;
              if (typeof stat.packetsReceived === 'number') packetsReceived += stat.packetsReceived;
              if (typeof stat.jitter === 'number' && (jitter === null || stat.jitter > jitter)) {
                jitter = stat.jitter;
              }
            }
          });

          const rttMs = rttSec !== null ? Math.round((rttSec as number) * 1000) : null;
          const totalPackets = packetsLost + packetsReceived;
          const lossPct = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : null;

          if (rttMs !== null && (worstRtt === null || rttMs > worstRtt)) worstRtt = rttMs;
          if (lossPct !== null && (worstLoss === null || lossPct > worstLoss)) worstLoss = lossPct;
          if (jitter !== null && (worstJitter === null || jitter > worstJitter)) worstJitter = jitter;
        } catch {
          // ignore stats errors for this peer
        }
      }

      if (cancelled) return;
      setNetworkStats({
        quality: computeQuality(worstRtt, worstLoss),
        rtt: worstRtt,
        packetLoss: worstLoss,
        jitter: worstJitter,
      });
    };

    pollStats();
    const interval = setInterval(pollStats, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentChannelId]);

  const value: VoiceContextType = {
    currentChannelId,
    currentServerId,
    participants,
    channelParticipants,
    isMuted,
    isDeafened,
    isConnecting,
    remoteStreams,
    networkStats,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    getChannelParticipants,
    refreshVoiceState,
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
      {/* Render hidden audio elements for remote streams */}
      {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
        <RemoteAudio key={peerId} stream={stream} deafened={isDeafened} />
      ))}
    </VoiceContext.Provider>
  );
}

// ── Remote Audio Component ──
function RemoteAudio({ stream, deafened }: { stream: MediaStream; deafened: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
      audioRef.current.muted = deafened;
    }
  }, [stream, deafened]);

  return <audio ref={audioRef} autoPlay />;
}

// ── Hook ──
export function useVoice(): VoiceContextType | null {
  return useContext(VoiceContext);
}
