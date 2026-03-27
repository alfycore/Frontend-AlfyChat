'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  PhoneOffIcon,
  Maximize2Icon,
  Minimize2Icon,
  Volume2Icon,
} from '@/components/icons';
import { Avatar, Button, Tooltip } from '@heroui/react';
import { resolveMediaUrl } from '@/lib/api';

interface CallOverlayProps {
  type: 'voice' | 'video';
  status: 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isMuted: boolean;
  isVideoOff: boolean;
  recipientName: string;
  recipientAvatar?: string;
  duration: number;
  mediaError?: string;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
}

export function CallOverlay({
  type,
  status,
  localStream,
  remoteStreams,
  isMuted,
  isVideoOff,
  recipientName,
  recipientAvatar,
  duration,
  mediaError,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}: CallOverlayProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStreams.size > 0) {
      const firstStream = remoteStreams.values().next().value;
      if (firstStream) {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = firstStream;
          remoteAudioRef.current.play().catch((e) =>
            console.warn('[CALL] Audio autoplay blocked:', e)
          );
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = firstStream;
        }
      }
    }
  }, [remoteStreams]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!overlayRef.current) return;
    if (!isFullscreen) {
      overlayRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const statusLabels: Record<string, string> = {
    calling: 'Appel en cours...',
    ringing: 'Sonnerie...',
    connecting: 'Connexion...',
    connected: formatDuration(duration),
    ended: 'Appel terminé',
  };

  const isWaiting = status === 'calling' || status === 'ringing' || status === 'connecting';

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-50 flex flex-col bg-[var(--background)]"
    >
      {/* Hidden audio element — plays remote audio for ALL call types */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Main video / avatar area */}
      <div className="relative flex flex-1 items-center justify-center">
        {type === 'video' && status === 'connected' && remoteStreams.size > 0 ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="size-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <Avatar className="size-32 ring-4 ring-[var(--border)]/40">
                <Avatar.Image src={resolveMediaUrl(recipientAvatar)} />
                <Avatar.Fallback className="bg-[var(--accent)]/90 text-[var(--accent-foreground)] text-4xl font-bold">
                  {recipientName[0]?.toUpperCase() || '?'}
                </Avatar.Fallback>
              </Avatar>
              {isWaiting && (
                <>
                  <div className="absolute inset-0 animate-ping rounded-full border-2 border-[var(--accent)]/40" />
                  <div className="absolute -inset-3 animate-pulse rounded-full border border-[var(--accent)]/20" />
                </>
              )}
              {status === 'connected' && (
                <div className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-xl bg-green-500 shadow-lg shadow-green-500/30">
                  <Volume2Icon size={16} className="text-white" />
                </div>
              )}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">{recipientName}</h2>
              <p className={`mt-1 text-lg ${status === 'connected' ? 'text-green-400' : 'text-[var(--muted)]'}`}>
                {statusLabels[status]}
              </p>
            </div>

            {/* Media error */}
            {mediaError && (
              <div className="mx-auto max-w-sm rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400 backdrop-blur-sm">
                {mediaError}
              </div>
            )}
          </div>
        )}

        {/* Local video PiP */}
        {type === 'video' && localStream && !isVideoOff && (
          <div className="absolute bottom-4 right-4 overflow-hidden rounded-2xl border-2 border-[var(--border)]/40 shadow-2xl">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="h-36 w-48 object-cover"
            />
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-3 border-t border-[var(--border)]/40 bg-[var(--surface)]/80 px-8 py-4 backdrop-blur-xl">
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant={isMuted ? 'danger' : 'secondary'}
            size="lg"
            className="size-14 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
            onPress={onToggleMute}
          >
            {isMuted ? <MicOffIcon size={24} /> : <MicIcon size={24} />}
          </Button>
          <Tooltip.Content>{isMuted ? 'Activer le micro' : 'Couper le micro'}</Tooltip.Content>
        </Tooltip>

        {type === 'video' && (
          <Tooltip delay={0}>
            <Button
              isIconOnly
              variant={isVideoOff ? 'danger' : 'secondary'}
              size="lg"
              className="size-14 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
              onPress={onToggleVideo}
            >
              {isVideoOff ? <VideoOffIcon size={24} /> : <VideoIcon size={24} />}
            </Button>
            <Tooltip.Content>{isVideoOff ? 'Activer la caméra' : 'Couper la caméra'}</Tooltip.Content>
          </Tooltip>
        )}

        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="danger"
            size="lg"
            className="size-16 rounded-full shadow-xl shadow-red-600/30 transition-all duration-200 hover:scale-105"
            onPress={onEndCall}
          >
            <PhoneOffIcon size={28} />
          </Button>
          <Tooltip.Content>Raccrocher</Tooltip.Content>
        </Tooltip>

        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="secondary"
            size="lg"
            className="size-14 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
            onPress={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2Icon size={24} /> : <Maximize2Icon size={24} />}
          </Button>
          <Tooltip.Content>{isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}</Tooltip.Content>
        </Tooltip>
      </div>
    </div>
  );
}
