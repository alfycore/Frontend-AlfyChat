'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCall, CallParticipantInfo, CallCategory } from '@/hooks/use-call';
import { useAuth } from '@/hooks/use-auth';

interface CallContextValue {
  callId: string | null;
  callType: 'voice' | 'video' | null;
  callStatus: 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';
  callerName?: string;
  callerAvatar?: string;
  callConversationId?: string;
  callRecipientId?: string;
  callChannelId?: string;
  isGroup: boolean;
  callCategory: CallCategory | null;
  callMode: 'p2p' | 'sfu';
  currentTier: number | null;
  tierLabel: string;
  participantCount: number;
  handRaised: boolean;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  remoteIsScreenSharing: boolean;
  screenStream: MediaStream | null;
  mediaError?: string;
  callDuration: number;
  participantInfo: Map<string, CallParticipantInfo>;
  initiateCall: (recipientId: string, type: 'voice' | 'video', conversationId?: string, recipientName?: string) => Promise<void>;
  initiateGroupCall: (channelId: string, type: 'voice' | 'video', channelName?: string) => Promise<void>;
  initiateServerCall: (channelId: string, serverId: string, type: 'voice' | 'video', channelName?: string) => Promise<void>;
  joinCall: () => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  leaveCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  switchAudioInput: (deviceId: string) => Promise<void>;
  raiseHand: () => void;
  lowerHand: () => void;
  toggleHand: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const {
    callId,
    type: callType,
    status: callStatus,
    callerName,
    callerAvatar,
    callConversationId,
    callRecipientId,
    callChannelId,
    isGroup,
    callCategory,
    callMode,
    currentTier,
    tierLabel,
    participantCount,
    handRaised,
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    isScreenSharing,
    remoteIsScreenSharing,
    screenStream,
    mediaError,
    participantInfo,
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
    raiseHand,
    lowerHand,
    toggleHand,
  } = useCall({ userId: user?.id });

  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (callStatus === 'connected') {
      setCallDuration(0);
      const interval = setInterval(() => setCallDuration((d) => d + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [callStatus]);

  return (
    <CallContext.Provider
      value={{
        callId,
        callType,
        callStatus,
        callerName,
        callerAvatar,
        callConversationId,
        callRecipientId,
        callChannelId,
        isGroup,
        callCategory,
        callMode,
        currentTier,
        tierLabel,
        participantCount,
        handRaised,
        localStream,
        remoteStreams,
        isMuted,
        isVideoOff,
        isScreenSharing,
        remoteIsScreenSharing,
        screenStream,
        mediaError,
        callDuration,
        participantInfo,
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
        raiseHand,
        lowerHand,
        toggleHand,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCallContext(): CallContextValue {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCallContext must be used within a CallProvider');
  }
  return context;
}
