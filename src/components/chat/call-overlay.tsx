'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  PhoneOffIcon,
  MonitorUpIcon,
  MonitorOffIcon,
  Maximize2Icon,
  Minimize2Icon,
} from '@/components/icons';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAudioLevel } from '@/hooks/use-audio-level';
import { getAudioPreferences } from '@/hooks/use-call';

interface CallOverlayProps {
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
  onStartScreenShare?: () => void;
  onStopScreenShare?: () => void;
  onEndCall: () => void;
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

// ── Tile ──────────────────────────────────────────────────────────

function SpeakingBars({ active }: { active: boolean }) {
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      {[3, 5, 4].map((h, i) => (
        <span
          key={i}
          className={cn('w-[3px] rounded-full transition-all duration-100', active ? 'bg-success animate-pulse' : 'bg-white/25')}
          style={{ height: active ? `${h * 2}px` : '4px', animationDelay: `${i * 80}ms` }}
        />
      ))}
    </span>
  );
}

function Tile({
  label, avatarSrc, stream, micMuted, muteVideo, muteAudio, isLocal, isConnected, isScreenShare,
}: {
  label: string; avatarSrc?: string; stream: MediaStream | null;
  micMuted?: boolean; muteVideo?: boolean; muteAudio?: boolean; isLocal?: boolean;
  isConnected?: boolean; isScreenShare?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const speaking = useAudioLevel(micMuted ? null : stream);

  const [isPlayBlocked, setIsPlayBlocked] = useState(false);

  // Toujours re-attacher après chaque render — évite le bug srcObject perdu
  // quand hasVideo change (replaceTrack/addTrack sans changement de référence stream).
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream ?? null;
    
    const applyOutputSettings = async () => {
      const prefs = getAudioPreferences();
      const clampedVolume = Math.max(0, Math.min(1, (prefs.outputVolume ?? 100) / 100));
      el.volume = clampedVolume;

      const sinkId = prefs.outputDeviceId;
      const audioWithSink = el as HTMLVideoElement & { setSinkId?: (id: string) => Promise<void> };
      if (sinkId && sinkId !== 'default' && typeof audioWithSink.setSinkId === 'function') {
        try {
          await audioWithSink.setSinkId(sinkId);
        } catch (err: any) {
          console.warn('[AUDIO] setSinkId impossible:', err?.name ?? 'Error', err?.message ?? String(err));
        }
      }
    };
    void applyOutputSettings();

    const tryPlay = () => {
      if (stream && el.paused) {
        el.play()
          .then(() => setIsPlayBlocked(false))
          .catch((err) => {
            if (err.name !== 'AbortError') {
              setIsPlayBlocked(true);
              console.warn('[AUDIO] play() bloqué sur la tuile:', err);
            }
          });
      }
    };

    tryPlay();
    
    window.addEventListener('pointerdown', tryPlay);
    window.addEventListener('keydown', tryPlay);
    return () => {
      window.removeEventListener('pointerdown', tryPlay);
      window.removeEventListener('keydown', tryPlay);
    };
  }, [stream]);

  const hasVideo = !!(
    stream &&
    !muteVideo &&
    stream.getVideoTracks().length > 0 &&
    stream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled)
  );

  return (
    <div className={cn(
      'relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-zinc-900/90 shadow-inner shadow-black/40 transition-all duration-200',
      speaking
        ? 'ring-2 ring-success shadow-lg shadow-success/20'
        : 'ring-1 ring-white/10',
    )}>
      {/* Un seul <video> toujours monté */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={!!isLocal || !!muteAudio}
        className={cn(
          'absolute inset-0 size-full object-cover transition-opacity duration-200',
          !hasVideo && 'opacity-0 pointer-events-none',
        )}
      />

      {!hasVideo && (
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className={cn('rounded-2xl p-0.5 transition-all duration-200', speaking ? 'ring-2 ring-success shadow-lg shadow-success/30' : '')}>
            <Avatar className="size-20 rounded-2xl shadow-2xl ring-1 ring-white/10">
              <AvatarImage src={resolveMediaUrl(avatarSrc)} />
              <AvatarFallback className="rounded-2xl bg-primary/80 text-white font-heading text-3xl">
                {label[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
          {!isConnected && !isLocal && (
            <span className="flex gap-1.5">
              {[0, 0.12, 0.24].map((d) => (
                <span key={d} className="size-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${d}s` }} />
              ))}
            </span>
          )}
        </div>
      )}

      {/* Gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/70 to-transparent" />

      {/* Name + bars */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <SpeakingBars active={speaking} />
        <span className="rounded-lg bg-black/50 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">{label}</span>
        {isScreenShare && (
          <span className="rounded-lg bg-linear-to-br from-destructive to-destructive/80 px-2 py-0.5 font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-white shadow-md shadow-destructive/40">EN DIRECT</span>
        )}
      </div>

      {/* Muted */}
      {micMuted && (
        <div className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-lg bg-destructive shadow-md shadow-destructive/40">
          <MicOffIcon size={13} className="text-destructive-foreground" />
        </div>
      )}

      {/* Forcer le bouton Play si bloqué par Autoplay */}
      {isPlayBlocked && !isLocal && (
        <button
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-black/70 text-white backdrop-blur-md transition-colors hover:bg-black/80"
          onClick={(e) => {
            e.stopPropagation();
            videoRef.current?.play().then(() => setIsPlayBlocked(false)).catch(console.error);
          }}
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-foreground/15 ring-1 ring-white/20">
            <MicIcon size={24} className="text-white" />
          </div>
          <span className="text-xs font-medium">Activer le son</span>
        </button>
      )}
    </div>
  );
}

// ── Overlay ───────────────────────────────────────────────────────

export function CallOverlay({
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
}: CallOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isConnected = status === 'connected';

  const remoteStream = remoteStreams.size > 0
    ? (remoteStreams.values().next().value as MediaStream | undefined) ?? null
    : null;

  const hasLocalVideo =
    !!localStream && !isVideoOff &&
    localStream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      overlayRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const statusLabel =
    status === 'calling' ? 'Appel en cours…'
    : status === 'ringing' ? 'Sonnerie…'
    : status === 'connecting' ? 'Connexion…'
    : isConnected ? formatDuration(duration)
    : '';

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-50 flex flex-col bg-zinc-950"
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-xs font-semibold',
            isConnected ? 'text-success' : 'text-white/50',
          )}>
            {isConnected ? `⬤ ${statusLabel}` : statusLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/8 hover:text-white"
        >
          {isFullscreen ? <Minimize2Icon size={16} /> : <Maximize2Icon size={16} />}
        </button>
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 overflow-hidden p-4">
        <div className={cn(
          'grid h-full gap-3',
          isScreenSharing && screenStream
            ? 'grid-cols-2 grid-rows-2'
            : 'grid-cols-2 grid-rows-1',
        )}>
          {/* Screen share tile (top, full width) */}
          {isScreenSharing && screenStream && (
            <div className="col-span-2 overflow-hidden rounded-2xl">
              <Tile
                label={currentUserName || 'Vous'}
                avatarSrc={currentUserAvatar}
                stream={screenStream}
                isLocal={true}
                isConnected={isConnected}
                isScreenShare={true}
              />
            </div>
          )}

          {/* Local tile */}
          <Tile
            label="Vous"
            avatarSrc={currentUserAvatar}
            stream={localStream}
            micMuted={isMuted}
            muteVideo={isVideoOff}
            isLocal={true}
            isConnected={isConnected}
          />

          {/* Remote tile */}
          <Tile
            label={recipientName}
            avatarSrc={recipientAvatar}
            stream={remoteStream}
            isLocal={false}
            isConnected={isConnected && !!remoteStream}
          />
        </div>

        {/* Media error */}
        {mediaError && (
          <div className="absolute inset-x-4 bottom-24 flex items-center gap-2 rounded-xl border border-destructive/30 bg-linear-to-r from-destructive/15 to-destructive/5 px-3 py-2 shadow-sm shadow-destructive/10 backdrop-blur-md">
            <span className="text-xs text-destructive">{mediaError}</span>
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center justify-center gap-5 border-t border-white/5 bg-zinc-900/60 px-6 py-4 backdrop-blur-md">
        <CtrlBtn active={isMuted} onClick={onToggleMute} label={isMuted ? 'Muet' : 'Micro'}>
          {isMuted ? <MicOffIcon size={20} /> : <MicIcon size={20} />}
        </CtrlBtn>

        <CtrlBtn active={hasLocalVideo} onClick={onToggleVideo} label="Caméra">
          {isVideoOff || !hasLocalVideo ? <VideoOffIcon size={20} /> : <VideoIcon size={20} />}
        </CtrlBtn>

        {isConnected && onStartScreenShare && onStopScreenShare && (
          <CtrlBtn
            active={isScreenSharing}
            onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
            label={isScreenSharing ? 'Arrêter' : 'Écran'}
          >
            {isScreenSharing ? <MonitorOffIcon size={20} /> : <MonitorUpIcon size={20} />}
          </CtrlBtn>
        )}

        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={onEndCall}
            aria-label="Raccrocher"
            className="flex size-14 items-center justify-center rounded-2xl bg-destructive text-destructive-foreground shadow-2xl shadow-destructive/40 transition-all duration-200 hover:scale-110 hover:shadow-2xl hover:shadow-destructive/60 active:scale-95"
          >
            <PhoneOffIcon size={24} />
          </button>
          <span className="text-[10px] font-medium text-white/40">Raccrocher</span>
        </div>
      </div>
    </div>
  );
}

// ── Shared button ─────────────────────────────────────────────────

function CtrlBtn({
  active, danger, onClick, label, children,
}: {
  active?: boolean; danger?: boolean; onClick: () => void;
  label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          'flex size-12 items-center justify-center rounded-2xl transition-all duration-200 hover:scale-110 active:scale-95',
          danger
            ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/40 hover:shadow-xl hover:shadow-destructive/60'
            : active
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40'
              : 'bg-white/10 text-white hover:bg-white/20',
        )}
      >
        {children}
      </button>
      <span className="text-[10px] font-medium text-white/40">{label}</span>
    </div>
  );
}
