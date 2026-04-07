'use client';

import { useEffect, useRef, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  PhoneOffIcon,
  MonitorUpIcon,
  MonitorOffIcon,
  PhoneIcon,
  WifiIcon,
  AlertTriangleIcon,
} from '@/components/icons';
import { Avatar } from '@heroui/react';
import { resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Types ──

interface CallPanelProps {
  type: 'voice' | 'video';
  status: 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  screenStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  recipientName: string;
  recipientAvatar?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  duration: number;
  mediaError?: string;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  onEndCall: () => void;
}

// ── Helpers ──

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ── Component ──

export function CallPanel({
  type,
  status,
  localStream,
  remoteStreams,
  screenStream,
  isMuted,
  isVideoOff,
  isScreenSharing,
  recipientName,
  recipientAvatar,
  currentUserName,
  currentUserAvatar,
  duration,
  mediaError,
  onToggleMute,
  onToggleVideo,
  onStartScreenShare,
  onStopScreenShare,
  onEndCall,
}: CallPanelProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // ── Attach local video ──
  const attachLocal = useCallback(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => { attachLocal(); }, [attachLocal, isVideoOff]);
  useEffect(() => { attachLocal(); });

  // ── Attach remote video + backup audio ──
  useEffect(() => {
    if (remoteStreams.size > 0) {
      const firstStream = remoteStreams.values().next().value as MediaStream | undefined;
      if (firstStream) {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = firstStream;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = firstStream;
          remoteAudioRef.current.volume = 1.0;
          remoteAudioRef.current.play().catch((err) => {
            console.warn('[CALL-PANEL] Audio play failed:', err.message);
          });
        }
      }
    }
  }, [remoteStreams]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStreams.size > 0) {
      const firstStream = remoteStreams.values().next().value as MediaStream | undefined;
      if (firstStream) remoteVideoRef.current.srcObject = firstStream;
    }
  });

  // ── Attach screen share ──
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // ── State helpers ──
  const isWaiting = status === 'calling' || status === 'ringing' || status === 'connecting';
  const isConnected = status === 'connected';

  const remoteStream = remoteStreams.size > 0
    ? (remoteStreams.values().next().value as MediaStream | undefined)
    : undefined;
  const hasRemoteVideo = !!(
    remoteStream &&
    remoteStream.getVideoTracks().length > 0 &&
    remoteStream.getVideoTracks().some((t) => t.enabled)
  );
  const hasLocalVideo =
    !!localStream &&
    !isVideoOff &&
    localStream.getVideoTracks().length > 0 &&
    localStream.getVideoTracks().some((t) => t.enabled);

  const showScreenShare = isScreenSharing && screenStream;

  // ── Status label ──
  const statusLabel =
    status === 'calling'
      ? 'Appel en cours…'
      : status === 'ringing'
        ? 'Sonnerie…'
        : status === 'connecting'
          ? 'Connexion…'
          : isConnected
            ? formatDuration(duration)
            : '';

  // ── Control button helper ──
  function CtrlBtn({
    active,
    danger,
    onClick,
    label,
    children,
  }: {
    active?: boolean;
    danger?: boolean;
    onClick: () => void;
    label: string;
    children: React.ReactNode;
  }) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'flex size-12 items-center justify-center rounded-2xl shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 md:size-11',
            danger
              ? 'bg-red-500/90 text-white shadow-red-500/25 hover:bg-red-500'
              : active
                ? 'bg-[var(--accent)]/90 text-[var(--accent-foreground)] shadow-[var(--accent)]/20 hover:bg-[var(--accent)]'
                : 'border border-[var(--border)]/60 bg-[var(--surface)]/80 text-[var(--muted)] shadow-sm backdrop-blur-xl hover:bg-[var(--surface)] hover:text-[var(--foreground)]',
          )}
        >
          {children}
        </button>
        <span className="text-[10px] font-medium tracking-wide text-[var(--muted)]/70">{label}</span>
      </div>
    );
  }

  return (
    <div className="border-b border-[var(--border)]/40">
      {/* Backup audio for remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only" />

      {/* Screen share — full width above the cards */}
      {showScreenShare && (
        <div className="relative flex h-48 items-center justify-center bg-black/90 sm:h-64 md:h-72">
          <video ref={screenVideoRef} autoPlay muted playsInline className="size-full object-contain" />
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-xl border border-[var(--border)]/60 bg-[var(--background)]/60 px-3 py-1.5 text-xs font-medium backdrop-blur-xl">
            <HugeiconsIcon icon={MonitorUpIcon} size={14} className="text-[var(--accent)]" />
            <span>Partage d&apos;écran</span>
          </div>
        </div>
      )}

      {/* Two participant boxes */}
      <div className="relative overflow-hidden bg-[var(--background)]/60 backdrop-blur-xl">
        {isWaiting && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-[var(--accent)]/10 blur-3xl" />
          </div>
        )}
        {isConnected && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500/8 blur-3xl" />
          </div>
        )}

        <div className="relative flex flex-col items-center gap-3 py-5 sm:gap-4 sm:py-6">
          {/* Status badge */}
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider',
              isConnected
                ? 'bg-green-500/10 text-green-500'
                : 'bg-[var(--surface-secondary)]/40 text-[var(--muted)]',
            )}
          >
            {isConnected ? (
              <HugeiconsIcon icon={PhoneIcon} size={12} />
            ) : (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--accent)]/60" />
                <span className="relative inline-flex size-2 rounded-full bg-[var(--accent)]" />
              </span>
            )}
            {statusLabel}
          </div>

          {/* Two participant boxes side by side */}
          <div className="flex w-full items-stretch justify-center gap-3 px-4 sm:gap-4 sm:px-6">
            {/* Current user (you) */}
            <div
              className={cn(
                'relative flex min-h-44 w-full max-w-64 flex-col items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/60 shadow-xl backdrop-blur-xl transition-all duration-300 sm:min-h-52 sm:max-w-72',
                isMuted && 'border-red-500/30',
              )}
            >
              {hasLocalVideo && !showScreenShare ? (
                <>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 size-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/70 to-transparent" />

                  {isMuted && (
                    <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/80 shadow-md">
                      <HugeiconsIcon icon={MicOffIcon} size={12} className="text-white" />
                    </span>
                  )}

                  <span className="absolute bottom-2.5 left-3 z-10 text-xs font-semibold text-white drop-shadow-lg sm:text-sm">
                    Vous
                  </span>
                </>
              ) : (
                <>
                  <div className="relative">
                    <Avatar className="size-16 rounded-xl sm:size-20">
                      <Avatar.Image src={resolveMediaUrl(currentUserAvatar)} />
                      <Avatar.Fallback className="bg-[var(--accent)]/80 text-[var(--accent-foreground)] text-2xl font-bold sm:text-3xl">
                        {(currentUserName || 'V')[0]?.toUpperCase()}
                      </Avatar.Fallback>
                    </Avatar>

                    {isMuted && (
                      <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-lg border-2 border-[var(--surface)] bg-red-500/90 shadow-md">
                        <HugeiconsIcon icon={MicOffIcon} size={12} className="text-white" />
                      </span>
                    )}

                    {!isMuted && isConnected && (
                      <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-lg border-2 border-[var(--surface)] bg-green-500 shadow-md shadow-green-500/30">
                        <HugeiconsIcon icon={WifiIcon} size={12} className="text-white" />
                      </span>
                    )}
                  </div>

                  <span className="mt-2 text-xs font-semibold text-[var(--foreground)]/90 sm:text-sm">Vous</span>
                  <span className="text-[10px] font-medium text-[var(--muted)]/50">{currentUserName}</span>
                </>
              )}
            </div>

            {/* Remote user */}
            <div
              className={cn(
                'relative flex min-h-44 w-full max-w-64 flex-col items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/60 shadow-xl backdrop-blur-xl transition-all duration-300 sm:min-h-52 sm:max-w-72',
                isConnected && !!remoteStream && 'border-green-500/40 shadow-green-500/10',
              )}
            >
              {isConnected && !!remoteStream && (
                <div className="pointer-events-none absolute inset-0 rounded-2xl">
                  <div className="absolute inset-0 animate-pulse rounded-2xl border-2 border-green-500/20" />
                </div>
              )}

              {hasRemoteVideo && isConnected && !showScreenShare ? (
                <>
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 size-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/70 to-transparent" />

                  <span className="absolute bottom-2.5 left-3 z-10 text-xs font-semibold text-white drop-shadow-lg sm:text-sm">
                    {recipientName}
                  </span>
                </>
              ) : (
                <>
                  {isWaiting && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="absolute size-20 animate-ping rounded-full border border-[var(--accent)]/20 sm:size-24" />
                    </div>
                  )}

                  <div className="relative">
                    <Avatar className="size-16 rounded-xl sm:size-20">
                      <Avatar.Image src={resolveMediaUrl(recipientAvatar)} />
                      <Avatar.Fallback className="bg-[var(--accent)]/80 text-[var(--accent-foreground)] text-2xl font-bold sm:text-3xl">
                        {recipientName[0]?.toUpperCase() || '?'}
                      </Avatar.Fallback>
                    </Avatar>

                    {isConnected && (
                      <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-lg border-2 border-[var(--surface)] bg-green-500 shadow-md shadow-green-500/30">
                        <HugeiconsIcon icon={WifiIcon} size={12} className="text-white" />
                      </span>
                    )}
                  </div>

                  <span className="mt-2 text-xs font-semibold text-[var(--foreground)]/90 sm:text-sm">{recipientName}</span>
                </>
              )}
            </div>
          </div>

          {/* Media error */}
          {mediaError && (
            <div className="mx-auto flex max-w-xs items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 backdrop-blur-sm">
              <HugeiconsIcon icon={AlertTriangleIcon} size={16} className="shrink-0 text-red-500" />
              <p className="text-xs leading-relaxed text-red-500/90">{mediaError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-4 border-t border-[var(--border)]/40 bg-[var(--background)]/60 px-4 py-4 backdrop-blur-xl md:gap-5 md:py-3">
        <CtrlBtn active={isMuted} onClick={onToggleMute} label={isMuted ? 'Muet' : 'Micro'}>
          {isMuted ? <HugeiconsIcon icon={MicOffIcon} size={20} /> : <HugeiconsIcon icon={MicIcon} size={20} />}
        </CtrlBtn>

        <CtrlBtn active={!isVideoOff && hasLocalVideo} onClick={onToggleVideo} label="Caméra">
          {isVideoOff || !hasLocalVideo ? <HugeiconsIcon icon={VideoOffIcon} size={20} /> : <HugeiconsIcon icon={VideoIcon} size={20} />}
        </CtrlBtn>

        {isConnected && (
          <CtrlBtn active={isScreenSharing} onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare} label={isScreenSharing ? 'Arrêter' : 'Écran'}>
            {isScreenSharing ? <HugeiconsIcon icon={MonitorOffIcon} size={20} /> : <HugeiconsIcon icon={MonitorUpIcon} size={20} />}
          </CtrlBtn>
        )}

        <CtrlBtn danger onClick={onEndCall} label="Raccrocher">
          <HugeiconsIcon icon={PhoneOffIcon} size={20} />
        </CtrlBtn>
      </div>
    </div>
  );
}
