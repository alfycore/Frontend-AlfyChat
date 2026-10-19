'use client';

/**
 * Tuile d'un participant (ou d'un partage d'écran) dans la vue vocale.
 * Sans vidéo : avatar centré sur fond teinté. Avec vidéo : flux plein cadre.
 * Parle → liseré vert ; micro / casque coupés → pictogrammes sur l'étiquette.
 * Le son ne passe JAMAIS par ici (lecteurs globaux) : la vidéo est muette.
 */

import { Avatar } from '@heroui/react';
import { HeadphoneOff, Hand, MicOff, MonitorUp } from 'lucide-react';
import { memo, useEffect, useRef } from 'react';

import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { useIsSpeaking } from '@/components/alfy/guild/hooks';

export interface TileModel {
  key: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  color?: string;
  stream: MediaStream | null;
  isLocal: boolean;
  screen: boolean;
  muted: boolean;
  deafened: boolean;
  handRaised: boolean;
}

export function hasLiveVideo(stream: MediaStream | null | undefined): boolean {
  return !!stream && stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');
}

function Video({ stream, mirror, contain }: { stream: MediaStream; mirror: boolean; contain: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    void el.play().catch(() => {});
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={cn('absolute inset-0 size-full', contain ? 'object-contain' : 'object-cover', mirror && '-scale-x-100')}
    />
  );
}

interface VoiceTileProps {
  tile: TileModel;
  focused?: boolean;
  small?: boolean;
  onSelect?: () => void;
}

export const VoiceTile = memo(function VoiceTile({ tile, focused, small, onSelect }: VoiceTileProps) {
  const { t, tx } = useTranslation();
  const speaking = useIsSpeaking(tile.screen ? null : tile.userId) && !tile.muted;
  const video = hasLiveVideo(tile.stream);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={tile.screen ? tx(t.guild.voice.screenOf, { name: tile.name }) : tile.name}
      className={cn(
        'group/tile relative isolate flex size-full min-h-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg outline-none',
        'bg-surface-tertiary transition-[box-shadow] duration-(--dur-1) focus-visible:ring-2 focus-visible:ring-focus',
        speaking && 'shadow-[inset_0_0_0_2px_var(--success),0_0_0_2px_var(--success)]',
      )}
      style={!video && tile.color ? { backgroundColor: `color-mix(in oklab, ${tile.color} 35%, var(--surface-tertiary))` } : undefined}
    >
      {video && tile.stream ? (
        <Video stream={tile.stream} mirror={tile.isLocal && !tile.screen} contain={tile.screen || !!focused} />
      ) : (
        <span
          className={cn(
            'relative rounded-full transition-shadow duration-(--dur-1)',
            speaking && 'shadow-[0_0_0_3px_var(--surface-tertiary),0_0_0_6px_var(--success)]',
          )}
        >
          <Avatar className={cn(small ? 'size-12' : 'size-20', 'text-2xl')}>
            {tile.avatarUrl && <Avatar.Image src={tile.avatarUrl} alt="" />}
            <Avatar.Fallback>{tile.name.slice(0, 1).toUpperCase()}</Avatar.Fallback>
          </Avatar>
        </span>
      )}

      {tile.screen && (
        <span className="absolute top-2 left-2 flex items-center gap-1 rounded-sm bg-danger px-1.5 text-[11px] leading-5 font-bold tracking-wide text-(--danger-foreground) uppercase">
          <MonitorUp className="size-3" aria-hidden />
          {t.guild.voice.live}
        </span>
      )}
      {tile.handRaised && (
        <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-warning text-(--warning-foreground) shadow-md">
          <Hand className="size-4" aria-hidden />
        </span>
      )}

      <span
        className={cn(
          'absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-md bg-black/55 px-2 py-0.5 text-sm font-medium text-white backdrop-blur-sm',
          small && 'text-xs',
        )}
      >
        {(tile.muted || tile.deafened) && !tile.screen && <MicOff className="size-3.5 shrink-0 text-danger" aria-label={t.guild.voice.muted} />}
        {tile.deafened && !tile.screen && <HeadphoneOff className="size-3.5 shrink-0 text-danger" aria-label={t.guild.voice.deafened} />}
        <span className="truncate">{tile.screen ? tx(t.guild.voice.screenOf, { name: tile.name }) : tile.name}</span>
      </span>
    </button>
  );
});
