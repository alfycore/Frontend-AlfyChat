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
  PhoneIcon,
  AlertTriangleIcon,
  WifiIcon,
} from '@/components/icons';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAudioLevel } from '@/hooks/use-audio-level';
import { getAudioPreferences } from '@/hooks/use-call';

// ── Types ──────────────────────────────────────────────────────────

interface CallPanelProps {
  type: 'voice' | 'video';
  status: 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  screenStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  remoteIsScreenSharing?: boolean;
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

// ── Helpers ────────────────────────────────────────────────────────

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

// ── Audio level bars ───────────────────────────────────────────────

function SpeakingBars({ active }: { active: boolean }) {
  return (
    <span className="flex items-end gap-0.5" aria-hidden>
      {[3, 5, 4].map((h, i) => (
        <span
          key={i}
          className={cn(
            'w-0.75 rounded-full transition-all duration-100',
            active ? 'bg-green-400 animate-pulse' : 'bg-white/25',
          )}
          style={{
            height: active ? `${h * 2}px` : '4px',
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </span>
  );
}

// ── Participant tile ───────────────────────────────────────────────

interface TileProps {
  label: string;
  avatarSrc?: string;
  /** The stream to display/analyse. For remote audio-only, video is hidden but audio plays. */
  stream: MediaStream | null;
  /** Mute the mic (don't show as speaking even if audio detected) */
  micMuted?: boolean;
  /** Video track is disabled — show avatar instead */
  muteVideo?: boolean;
  /** Mute the audio output of this element (audio handled externally) */
  muteAudio?: boolean;
  /** Local tile — mute the <video> element to avoid echo */
  isLocal?: boolean;
  isConnected?: boolean;
  isScreenShare?: boolean;
}

function ParticipantTile({
  label, avatarSrc, stream, micMuted, muteVideo, muteAudio, isLocal,
  isConnected, isScreenShare,
}: TileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Real-time audio level detection (never routes audio to speakers)
  const speaking = useAudioLevel(micMuted ? null : stream);

  const [isPlayBlocked, setIsPlayBlocked] = useState(false);

  // Toujours attacher le stream — runs after every render pour gérer les
  // changements de track (replaceTrack / addTrack) sans re-monter le DOM.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream ?? null;
    }

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
    
    // Retry on user gestures
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
      'group relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-zinc-800 transition-all duration-200',
      speaking
        ? 'ring-2 ring-green-400'
        : 'ring-1 ring-white/8',
    )}>

      {/*
        UN SEUL <video> toujours monté — évite le problème de srcObject
        non-ré-attaché quand hasVideo change (nouveau DOM = ref perdue).
        - local  : muted=true (pas d'écho)
        - remote : muted=false → porte l'audio quand pas de vidéo (hidden)
      */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={!!isLocal || !!muteAudio}
        className={cn(
          'absolute inset-0 size-full transition-opacity duration-200',
          // Screen share → object-contain pour voir tout l'écran sans crop
          // Webcam → object-cover pour un rendu portrait propre
          isScreenShare ? 'object-contain bg-black' : 'object-cover',
          !hasVideo && 'opacity-0 pointer-events-none',
        )}
      />

      {/* Avatar affiché par-dessus quand pas de vidéo */}
      {!hasVideo && (
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className={cn(
            'rounded-full p-0.5 transition-all duration-200',
            speaking ? 'ring-2 ring-green-400' : '',
          )}>
            <Avatar className="size-10 rounded-full shadow-xl ring-1 ring-white/10 sm:size-12">
              <AvatarImage src={resolveMediaUrl(avatarSrc)} />
              <AvatarFallback className="bg-zinc-600 text-white text-xl font-bold">
                {label[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
          {!isConnected && !isLocal && (
            <span className="flex gap-1">
              {[0, 0.12, 0.24].map((d) => (
                <span key={d} className="size-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${d}s` }} />
              ))}
            </span>
          )}
        </div>
      )}

      {/* Bottom gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-black/70 to-transparent" />

      {/* Name + speaking bars */}
      <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5">
        <SpeakingBars active={speaking} />
        <span className="rounded-md bg-black/40 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
          {label}
        </span>
        {isScreenShare && (
          <span className="rounded-md bg-red-500/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            EN DIRECT
          </span>
        )}
      </div>

      {/* Mic muted badge */}
      {micMuted && (
        <div className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-red-500/90 shadow-md">
          <MicOffIcon size={11} className="text-white" />
        </div>
      )}

      {/* Connecté badge (voice only, remote) */}
      {isConnected && !hasVideo && !isLocal && !micMuted && !isPlayBlocked && (
        <div className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-zinc-700/90 shadow-md">
          <WifiIcon size={11} className="text-white/60" />
        </div>
      )}

      {/* Bouton pour forcer le son si le navigateur le bloque */}
      {isPlayBlocked && !isLocal && (
        <button
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          onClick={(e) => {
            e.stopPropagation();
            videoRef.current?.play().then(() => setIsPlayBlocked(false)).catch(console.error);
          }}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-white/20">
            <MicIcon size={24} className="text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Cliquez pour activer le son</span>
        </button>
      )}
    </div>
  );
}

// ── Control button ─────────────────────────────────────────────────

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
          'flex size-11 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95',
          danger
            ? 'bg-red-500 text-white shadow-lg hover:bg-red-400'
            : active
              ? 'bg-(--accent) text-accent-foreground shadow-lg hover:brightness-110'
              : 'bg-white/10 text-white hover:bg-white/20',
        )}
      >
        {children}
      </button>
      <span className="text-[10px] font-medium tracking-wide text-white/50">{label}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

export function CallPanel({
  type,
  status,
  localStream,
  remoteStreams,
  screenStream,
  isMuted,
  isVideoOff,
  isScreenSharing,
  remoteIsScreenSharing = false,
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
  const isConnected = status === 'connected';

  const statusLabel =
    status === 'calling' ? 'Appel en cours…'
    : status === 'ringing' ? 'Sonnerie…'
    : status === 'connecting' ? 'Connexion…'
    : isConnected ? formatDuration(duration)
    : '';

  // Stream caméra remote = stream avec audio (key sans "_screen")
  // Stream screen share remote = stream sans audio (key se termine par "_screen")
  let remoteStream: MediaStream | null = null;
  let remoteScreenStream: MediaStream | null = null;
  for (const [key, s] of remoteStreams.entries()) {
    if (key.endsWith('_screen')) {
      remoteScreenStream = s;
    } else {
      remoteStream = s;
    }
  }

  const hasLocalVideo =
    !!localStream && !isVideoOff &&
    localStream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled);

  // Tuile screen share locale (quand JE partage mon écran)
  const showLocalScreenTile = isScreenSharing && !!screenStream;
  // Tuile screen share remote (quand L'AUTRE partage)
  const showRemoteScreenTile = !!remoteScreenStream;
  // 3 colonnes quand il y a une 3e tuile (partage local OU remote)
  const threeCol = showLocalScreenTile || showRemoteScreenTile;

  return (
    <div className="border-b border-white/5 bg-zinc-950">

      {/* ── STATUS BAR ── */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
        <div className={cn(
          'flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider',
          isConnected ? 'text-green-400' : 'text-white/50',
        )}>
          {isConnected ? (
            <PhoneIcon size={11} />
          ) : (
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-current" />
            </span>
          )}
          {statusLabel}
        </div>
        <span className="text-[11px] font-medium text-white/30">
          {type === 'video' ? 'Appel vidéo' : 'Appel vocal'}
        </span>
      </div>

      {/* ── TILES GRID ── */}
      <div className="p-3">
        {/* Grille hauteur fixe — indépendant de la largeur du container */}
        <div className={cn(
          'grid h-44 gap-2',
          threeCol ? 'grid-cols-3' : 'grid-cols-2',
        )}>

          {/* Tuile locale */}
          <ParticipantTile
            label="Vous"
            avatarSrc={currentUserAvatar}
            stream={localStream}
            micMuted={isMuted}
            muteVideo={isVideoOff}
            isLocal={true}
            isConnected={isConnected}
          />

          {/* Tuile remote — caméra */}
          <ParticipantTile
            label={recipientName}
            avatarSrc={recipientAvatar}
            stream={remoteStream}
            isLocal={false}
            isConnected={isConnected && (!!remoteStream || remoteIsScreenSharing)}
          />

          {/* Tuile screen share remote (l'autre partage son écran) */}
          {showRemoteScreenTile && (
            <ParticipantTile
              label={`${recipientName} — écran`}
              avatarSrc={recipientAvatar}
              stream={remoteScreenStream}
              isLocal={false}
              isConnected={isConnected}
              isScreenShare={true}
            />
          )}

          {/* Tuile partage local (je partage mon écran) */}
          {showLocalScreenTile && (
            <ParticipantTile
              label="Mon écran"
              avatarSrc={currentUserAvatar}
              stream={screenStream}
              isLocal={true}
              isConnected={isConnected}
              isScreenShare={true}
            />
          )}
        </div>

        {/* Media error */}
        {mediaError && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2">
            <AlertTriangleIcon size={14} className="shrink-0 text-red-400" />
            <p className="text-xs leading-relaxed text-red-400">{mediaError}</p>
          </div>
        )}
      </div>

      {/* ── CONTROLS ── */}
      <div className="flex items-center justify-center gap-5 border-t border-white/5 bg-zinc-900/80 px-4 py-3 md:gap-6">
        <CtrlBtn active={isMuted} onClick={onToggleMute} label={isMuted ? 'Muet' : 'Micro'}>
          {isMuted ? <MicOffIcon size={18} /> : <MicIcon size={18} />}
        </CtrlBtn>

        <CtrlBtn active={hasLocalVideo} onClick={onToggleVideo} label="Caméra">
          {isVideoOff || !hasLocalVideo ? <VideoOffIcon size={18} /> : <VideoIcon size={18} />}
        </CtrlBtn>

        {isConnected && (
          <CtrlBtn
            active={isScreenSharing}
            onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
            label={isScreenSharing ? 'Arrêter' : 'Écran'}
          >
            {isScreenSharing ? <MonitorOffIcon size={18} /> : <MonitorUpIcon size={18} />}
          </CtrlBtn>
        )}

        {/* End call — bigger */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={onEndCall}
            aria-label="Raccrocher"
            className="flex size-13 items-center justify-center rounded-full bg-red-500 text-white shadow-xl transition-all duration-200 hover:scale-110 hover:bg-red-400 active:scale-95"
          >
            <PhoneOffIcon size={22} />
          </button>
          <span className="text-[10px] font-medium tracking-wide text-white/50">Raccrocher</span>
        </div>
      </div>
    </div>
  );
}
