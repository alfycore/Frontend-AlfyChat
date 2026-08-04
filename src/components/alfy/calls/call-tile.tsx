'use client';

import { useEffect, useRef } from 'react';
import { Hand, MicOff, MonitorUp } from 'lucide-react';

import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { cn } from '@/lib/utils';

interface CallTileProps {
  name: string;
  avatarUrl?: string;
  /** Flux média du participant (absent = pas encore de piste vidéo/audio). */
  stream?: MediaStream | null;
  /** Vrai pour la tuile de l'utilisateur courant (vidéo locale coupée du son pour éviter le larsen). */
  isLocal?: boolean;
  muted?: boolean;
  screenSharing?: boolean;
  handRaised?: boolean;
  /** Grande tuile (appel 1:1) ou compacte (salon vocal). */
  size?: 'lg' | 'md';
}

export function CallTile({ name, avatarUrl, stream, isLocal, muted, screenSharing, handRaised, size = 'md' }: CallTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = !!stream && stream.getVideoTracks().some((t) => t.enabled);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    el.play().catch(() => {});
  }, [stream]);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-lg bg-surface-secondary',
        'transition-shadow duration-150',
        size === 'lg' ? 'aspect-video' : 'aspect-4/3',
      )}
    >
      {hasVideo ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <AlfyAvatar name={name} avatarUrl={avatarUrl} size="lg" />
      )}

      {handRaised && (
        <span
          className="at-pop absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-warning text-warning-foreground shadow-sm"
          aria-label={`${name} a levé la main`}
          title={`${name} a levé la main`}
        >
          <Hand className="size-3.5" aria-hidden />
        </span>
      )}

      <div className="absolute right-2 bottom-2 left-2 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 rounded-md bg-black/55 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {muted && <MicOff className="size-3 text-red-400" aria-label="Micro coupé" />}
          {screenSharing && (
            <MonitorUp className="size-3 text-sky-300" aria-label="Partage d'écran" />
          )}
          <span className="truncate">{name}</span>
        </span>
      </div>
    </div>
  );
}
