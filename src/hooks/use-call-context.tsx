'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCall } from '@/hooks/use-call';
import { useAuth } from '@/hooks/use-auth';

interface CallContextValue {
  callId: string | null;
  callType: 'voice' | 'video' | null;
  callStatus: 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';
  callerName?: string;
  callerAvatar?: string;
  callConversationId?: string;
  callRecipientId?: string;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  screenStream: MediaStream | null;
  mediaError?: string;
  callDuration: number;
  initiateCall: (recipientId: string, type: 'voice' | 'video', conversationId?: string, recipientName?: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  switchAudioInput: (deviceId: string) => Promise<void>;
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
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    isScreenSharing,
    screenStream,
    mediaError,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    switchAudioInput,
  } = useCall({ userId: user?.id });

  const [callDuration, setCallDuration] = useState(0);

  // Call duration timer
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
        localStream,
        remoteStreams,
        isMuted,
        isVideoOff,
        isScreenSharing,
        screenStream,
        mediaError,
        callDuration,
        initiateCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
        switchAudioInput,
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
