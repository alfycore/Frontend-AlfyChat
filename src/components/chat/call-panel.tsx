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
  Minimize2Icon,
} from '@/components/icons';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/locale-provider';
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
  /** Group call participants (excludes self). When provided, renders N tiles instead of the 1:1 fallback. */
  participants?: { userId: string; name: string; avatar?: string; handRaised?: boolean }[];
  callCategory?: 'dm' | 'group' | 'server';
  callMode?: 'p2p' | 'sfu';
  tierLabel?: string;
  handRaised?: boolean;
  /** When true, all tiles render in a single horizontal row (compact mode) */
  compact?: boolean;
  /** Called when user clicks the minimize/PiP button (mobile) */
  onMinimize?: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  onEndCall: () => void;
  onToggleHand?: () => void;
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
            active ? 'bg-success animate-pulse' : 'bg-white/25',
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
  /** Click to pin/unpin this tile */
  onClick?: () => void;
  isPinned?: boolean;
}

function ParticipantTile({
  label, avatarSrc, stream, micMuted, muteVideo, muteAudio, isLocal,
  isConnected, isScreenShare, onClick, isPinned,
}: TileProps) {
  const { t } = useTranslation();
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
    <div
      className={cn(
        'group relative flex h-full flex-col items-center justify-center overflow-hidden bg-zinc-900/90 shadow-inner shadow-black/40 transition-all duration-200',
        speaking
          ? 'ring-2 ring-success shadow-lg shadow-success/20'
          : isPinned
            ? 'ring-2 ring-primary shadow-lg shadow-primary/20'
            : 'ring-1 ring-white/10',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >

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
            'rounded-2xl p-0.5 transition-all duration-200',
            speaking ? 'ring-2 ring-success shadow-lg shadow-success/30' : '',
          )}>
            <Avatar className="size-10 rounded-2xl shadow-xl ring-1 ring-white/10 sm:size-12">
              <AvatarImage src={resolveMediaUrl(avatarSrc)} />
              <AvatarFallback className="rounded-2xl bg-primary/80 text-white font-heading text-xl">
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
        <span className="rounded-lg bg-black/50 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md ring-1 ring-white/10">
          {label}
        </span>
        {isScreenShare && (
          <span className="rounded-lg bg-linear-to-br from-destructive to-destructive/80 px-1.5 py-0.5 font-heading text-[9px] font-bold uppercase tracking-[0.15em] text-white shadow-md shadow-destructive/40">
            {t.callOverlay.live}
          </span>
        )}
      </div>

      {/* Mic muted badge */}
      {micMuted && (
        <div className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-lg bg-destructive shadow-md shadow-destructive/40">
          <MicOffIcon size={11} className="text-destructive-foreground" />
        </div>
      )}

      {/* Connecté badge (voice only, remote) */}
      {isConnected && !hasVideo && !isLocal && !micMuted && !isPlayBlocked && (
        <div className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-lg bg-black/50 ring-1 ring-white/10 shadow-md backdrop-blur-md">
          <WifiIcon size={11} className="text-white/60" />
        </div>
      )}

      {/* Bouton pour forcer le son si le navigateur le bloque */}
      {isPlayBlocked && !isLocal && (
        <button
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-black/70 text-white backdrop-blur-md transition-colors hover:bg-black/80"
          onClick={(e) => {
            e.stopPropagation();
            videoRef.current?.play().then(() => setIsPlayBlocked(false)).catch(console.error);
          }}
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground/10 ring-1 ring-white/20">
            <MicIcon size={24} className="text-white" />
          </div>
          <span className="text-xs font-medium">{t.callOverlay.clickEnableSound}</span>
        </button>
      )}

      {/* Pin hover hint */}
      {onClick && !isPlayBlocked && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <span className="rounded-xl bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md ring-1 ring-white/15">
            {isPinned ? '✕ Désépingler' : '📌 Épingler'}
          </span>
        </div>
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
          'flex size-11 items-center justify-center rounded-2xl transition-all duration-200 hover:scale-110 active:scale-95',
          danger
            ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/40 hover:shadow-xl hover:shadow-destructive/50'
            : active
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40'
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
  participants,
  callCategory,
  callMode,
  tierLabel,
  handRaised = false,
  compact = false,
  onMinimize,
  onToggleMute,
  onToggleVideo,
  onStartScreenShare,
  onStopScreenShare,
  onEndCall,
  onToggleHand,
}: CallPanelProps) {
  const { t } = useTranslation();
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const isConnected = status === 'connected';

  const statusLabel =
    status === 'calling' ? t.callOverlay.calling
    : status === 'ringing' ? t.callOverlay.ringing
    : status === 'connecting' ? t.callOverlay.connecting
    : isConnected ? formatDuration(duration)
    : '';

  const showLocalScreenTile = isScreenSharing && !!screenStream;

  // Build ordered tile list
  interface TileDef {
    key: string;
    tileProps: Omit<TileProps, 'onClick' | 'isPinned'>;
  }

  const tiles: TileDef[] = [
    {
      key: 'local',
      tileProps: {
        label: currentUserName || t.callOverlay.you,
        avatarSrc: currentUserAvatar,
        stream: localStream,
        micMuted: isMuted,
        muteVideo: isVideoOff,
        isLocal: true,
        isConnected,
      },
    },
  ];

  const useGroupTiles = participants && participants.length > 0;

  if (useGroupTiles) {
    // N-participant mode: one tile per remote participant
    for (const peer of participants!) {
      const peerStream = remoteStreams.get(peer.userId) ?? null;
      const peerScreenStream = remoteStreams.get(`${peer.userId}_screen`) ?? null;
      tiles.push({
        key: peer.userId,
        tileProps: {
          label: peer.name,
          avatarSrc: peer.avatar,
          stream: peerStream,
          isLocal: false,
          muteAudio: true,
          isConnected: isConnected && (!!peerStream || !!peerScreenStream),
        },
      });
      if (peerScreenStream) {
        tiles.push({
          key: `${peer.userId}_screen`,
          tileProps: {
            label: t.callOverlay.screenOf.replace('{name}', peer.name),
            avatarSrc: peer.avatar,
            stream: peerScreenStream,
            isLocal: false,
            muteAudio: true,
            isConnected,
            isScreenShare: true,
          },
        });
      }
    }
  } else {
    // 1:1 fallback
    let remoteStream: MediaStream | null = null;
    let remoteScreenStream: MediaStream | null = null;
    for (const [key, s] of remoteStreams.entries()) {
      if (key.endsWith('_screen')) remoteScreenStream = s;
      else remoteStream = s;
    }
    tiles.push({
      key: 'remote',
      tileProps: {
        label: recipientName,
        avatarSrc: recipientAvatar,
        stream: remoteStream,
        isLocal: false,
        muteAudio: true,
        isConnected: isConnected && (!!remoteStream || remoteIsScreenSharing),
      },
    });
    if (remoteScreenStream) {
      tiles.push({
        key: 'remote_screen',
        tileProps: {
          label: t.callOverlay.screenOf.replace('{name}', recipientName),
          avatarSrc: recipientAvatar,
          stream: remoteScreenStream,
          isLocal: false,
          muteAudio: true,
          isConnected,
          isScreenShare: true,
        },
      });
    }
  }

  if (showLocalScreenTile) {
    tiles.push({
      key: 'local_screen',
      tileProps: {
        label: t.callOverlay.myScreen,
        avatarSrc: currentUserAvatar,
        stream: screenStream,
        isLocal: true,
        isConnected,
        isScreenShare: true,
      },
    });
  }

  const hasLocalVideo =
    !!localStream && !isVideoOff &&
    localStream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled);

  const handlePin = (key: string) => setPinnedKey(prev => prev === key ? null : key);

  // If the pinned tile was removed (e.g. screen share stopped), clear pin
  const effectivePinned = tiles.some(t => t.key === pinnedKey) ? pinnedKey : null;

  const pinnedTile = effectivePinned ? tiles.find(t => t.key === effectivePinned) : null;
  const otherTiles = effectivePinned ? tiles.filter(t => t.key !== effectivePinned) : tiles;

  // Dynamic grid columns based on tile count
  const gridCols =
    tiles.length <= 1 ? 'grid-cols-1'
    : tiles.length <= 4 ? 'grid-cols-2'
    : tiles.length <= 9 ? 'grid-cols-3'
    : 'grid-cols-4';

  return (
    <div className="flex h-full flex-col border-b border-white/5 bg-zinc-950">

      {/* ── STATUS BAR ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-2">
        <div className={cn(
          'flex items-center gap-1.5 text-[11px] font-semibold',
          isConnected ? 'text-success' : 'text-white/50',
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
        <div className="flex items-center gap-2">
          {/* Quality / mode badge for group and server calls */}
          {isConnected && callCategory && callCategory !== 'dm' && (
            <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-white/40">
              {callMode === 'sfu' ? (tierLabel ?? 'SFU') : 'P2P'}
            </span>
          )}
          <span className="text-[11px] font-medium text-white/30">
            {useGroupTiles
              ? `${(participants?.length ?? 0) + 1} · ${type === 'video' ? t.calls.videoLabel : t.calls.voiceLabel}`
              : (type === 'video' ? t.calls.videoLabel : t.calls.voiceLabel)}
          </span>
          {onMinimize && (
            <button
              type="button"
              onClick={onMinimize}
              className="flex size-6 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/8 hover:text-white"
              aria-label="Réduire"
            >
              <Minimize2Icon size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── SERVER STAGE LAYOUT ── */}
      {callCategory === 'server' && useGroupTiles && (
        <div className="flex flex-1 min-h-0 gap-2 p-3">
          {/* Main tile — active / pinned speaker */}
          <div className="min-h-0 min-w-0 flex-[3] overflow-hidden rounded-2xl">
            {pinnedTile ? (
              <ParticipantTile
                {...pinnedTile.tileProps}
                onClick={() => handlePin(pinnedTile.key)}
                isPinned
              />
            ) : tiles[0] && (
              <ParticipantTile
                {...tiles[0].tileProps}
                onClick={() => handlePin(tiles[0].key)}
                isPinned={false}
              />
            )}
          </div>

          {/* Participant strip — avatars + hand-raise indicators */}
          <div className="flex w-[88px] shrink-0 flex-col gap-1.5 overflow-y-auto">
            {tiles.map((tile) => {
              if (tile.key === (pinnedTile?.key ?? tiles[0]?.key)) return null;
              const peer = participants?.find((p) => p.userId === tile.key);
              return (
                <button
                  key={tile.key}
                  type="button"
                  onClick={() => handlePin(tile.key)}
                  className="relative flex flex-col items-center gap-1 rounded-xl bg-zinc-900/80 p-1.5 ring-1 ring-white/10 hover:ring-white/25 active:scale-95 transition-transform"
                >
                  <Avatar className="size-10 rounded-xl">
                    <AvatarImage src={resolveMediaUrl(tile.tileProps.avatarSrc)} />
                    <AvatarFallback className="rounded-xl bg-primary/80 text-white font-heading text-base">
                      {tile.tileProps.label[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-full truncate text-[9px] text-white/50">{tile.tileProps.label}</span>
                  {peer?.handRaised && (
                    <span className="absolute -right-0.5 -top-0.5 text-[11px]">✋</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TILES (DM / Group / Server fallback) ── */}
      {callCategory !== 'server' && (
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden p-3">
        {pinnedTile ? (
          /* ── Spotlight mode: large pinned tile + thumbnail strip ── */
          <div className="flex h-full flex-col gap-2">
            {/* Main tile — fills remaining space */}
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl">
              <ParticipantTile
                {...pinnedTile.tileProps}
                onClick={() => handlePin(pinnedTile.key)}
                isPinned={true}
              />
            </div>
            {/* Thumbnails strip */}
            {otherTiles.length > 0 && (
              <div className="flex shrink-0 gap-2">
                {otherTiles.map(tile => (
                  <div key={tile.key} className="aspect-video flex-1 overflow-hidden rounded-2xl">
                    <ParticipantTile
                      {...tile.tileProps}
                      onClick={() => handlePin(tile.key)}
                      isPinned={false}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : compact ? (
          /* ── Compact (1-row): all tiles in a single horizontal row ── */
          <div className="flex h-full items-center gap-2 overflow-x-auto">
            {tiles.map(tile => (
              <div key={tile.key} className="aspect-video h-28 shrink-0 overflow-hidden rounded-xl sm:h-32">
                <ParticipantTile
                  {...tile.tileProps}
                  onClick={() => handlePin(tile.key)}
                  isPinned={false}
                />
              </div>
            ))}
          </div>
        ) : (
          /* ── Equal grid — tiles fill the available height ── */
          <div className={cn('grid h-full gap-2', gridCols)}>
            {tiles.map(tile => (
              <div key={tile.key} className="min-h-0 overflow-hidden rounded-2xl">
                <ParticipantTile
                  {...tile.tileProps}
                  onClick={() => handlePin(tile.key)}
                  isPinned={false}
                />
              </div>
            ))}
          </div>
        )}

        {/* Media error */}
        {mediaError && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-destructive/30 bg-linear-to-r from-destructive/15 to-destructive/5 px-3 py-2 shadow-sm shadow-destructive/10">
            <AlertTriangleIcon size={14} className="shrink-0 text-destructive" />
            <p className="text-xs leading-relaxed text-destructive">{mediaError}</p>
          </div>
        )}
      </div>
      )}

      {/* Media error for server stage layout */}
      {callCategory === 'server' && mediaError && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl border border-destructive/30 bg-linear-to-r from-destructive/15 to-destructive/5 px-3 py-2 shadow-sm shadow-destructive/10">
          <AlertTriangleIcon size={14} className="shrink-0 text-destructive" />
          <p className="text-xs leading-relaxed text-destructive">{mediaError}</p>
        </div>
      )}

      {/* ── CONTROLS ── */}
      <div className="flex shrink-0 items-center justify-center gap-5 border-t border-white/5 bg-zinc-900/80 px-4 py-3 md:gap-6">
        <CtrlBtn active={isMuted} onClick={onToggleMute} label={isMuted ? t.callOverlay.muted : t.callOverlay.mic}>
          {isMuted ? <MicOffIcon size={18} /> : <MicIcon size={18} />}
        </CtrlBtn>

        <CtrlBtn active={hasLocalVideo} onClick={onToggleVideo} label={t.callOverlay.camera}>
          {isVideoOff || !hasLocalVideo ? <VideoOffIcon size={18} /> : <VideoIcon size={18} />}
        </CtrlBtn>

        {isConnected && callCategory !== 'server' && (
          <CtrlBtn
            active={isScreenSharing}
            onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
            label={isScreenSharing ? t.callOverlay.stopShare : t.callOverlay.shareScreen}
          >
            {isScreenSharing ? <MonitorOffIcon size={18} /> : <MonitorUpIcon size={18} />}
          </CtrlBtn>
        )}

        {/* Raise / lower hand (server calls only) */}
        {isConnected && callCategory === 'server' && onToggleHand && (
          <CtrlBtn active={handRaised} onClick={onToggleHand} label={handRaised ? 'Baisser' : 'Lever la main'}>
            <span className="text-lg leading-none">✋</span>
          </CtrlBtn>
        )}

        {/* End call — bigger */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={onEndCall}
            aria-label={t.callOverlay.hangup}
            className="flex size-13 items-center justify-center rounded-2xl bg-destructive text-destructive-foreground shadow-xl shadow-destructive/40 transition-all duration-200 hover:scale-110 hover:shadow-2xl hover:shadow-destructive/60 active:scale-95"
          >
            <PhoneOffIcon size={22} />
          </button>
          <span className="text-[10px] font-medium tracking-wide text-white/50">{t.callOverlay.hangup}</span>
        </div>
      </div>
    </div>
  );
}
