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

// ── Types ──

export interface VoiceParticipant {
  userId: string;
  username: string;
  avatarUrl?: string;
  muted: boolean;
  deafened: boolean;
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
}

interface VoiceContextType extends VoiceState {
  joinChannel: (serverId: string, channelId: string) => Promise<void>;
  leaveChannel: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  getChannelParticipants: (channelId: string) => VoiceParticipant[];
}

const VoiceContext = createContext<VoiceContextType | null>(null);

// ── ICE Configuration ──
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
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

  // Refs for WebRTC
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const currentChannelRef = useRef<string | null>(null);
  const currentServerRef = useRef<string | null>(null);

  // Keep refs in sync
  useEffect(() => { currentChannelRef.current = currentChannelId; }, [currentChannelId]);
  useEffect(() => { currentServerRef.current = currentServerId; }, [currentServerId]);

  // ── Cleanup peer connection ──
  const cleanupPeerConnection = useCallback((peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
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

    // Add local tracks
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
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        cleanupPeerConnection(targetUserId);
      }
    };

    return pc;
  }, [cleanupPeerConnection]);

  // ── Join a voice channel ──
  const joinChannel = useCallback(async (serverId: string, channelId: string) => {
    if (currentChannelRef.current === channelId) return;
    
    // Leave current channel first
    if (currentChannelRef.current) {
      leaveChannelInternal();
    }

    setIsConnecting(true);

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;

      // Apply mute state
      stream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });

      setCurrentChannelId(channelId);
      setCurrentServerId(serverId);

      // Tell gateway we joined
      socketService.joinVoiceChannel(serverId, channelId);
    } catch (err) {
      console.error('[Voice] Failed to get microphone:', err);
      // Still join even without mic (listen-only)
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

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc, peerId) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();

    // Stop local stream
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    // Clear remote streams
    setRemoteStreams(new Map());
    setParticipants([]);
    setCurrentChannelId(null);
    setCurrentServerId(null);

    if (chId && sId) {
      socketService.leaveVoiceChannel(sId, chId);
    }
  }, []);

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

      // Create an offer to the new user
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

      try {
        const pc = createPeerConnection(fromUserId, channelId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
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
      
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (pc && pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('[Voice] Failed to handle answer from', fromUserId, err);
        }
      }
    };

    const handleVoiceICE = async (data: any) => {
      const payload = data?.payload ?? data;
      const { channelId, fromUserId, candidate } = payload;
      
      if (channelId !== currentChannelRef.current) return;
      
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          // Ignore ICE candidate errors (common during teardown)
        }
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
  }, [userId, createPeerConnection, cleanupPeerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveChannelInternal();
    };
  }, [leaveChannelInternal]);

  const value: VoiceContextType = {
    currentChannelId,
    currentServerId,
    participants,
    channelParticipants,
    isMuted,
    isDeafened,
    isConnecting,
    remoteStreams,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    getChannelParticipants,
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
