'use client';

import { Button, Tooltip } from '@heroui/react';
import { Maximize2, Mic, MicOff, PhoneOff, Signal } from 'lucide-react';

import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

interface CallBarProps {
  label: string;
  durationSeconds: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpen?: () => void;
  onLeave?: () => void;
}

/** Barre d'appel persistante affichée quand une session vocale est active. */
export function CallBar({ label, durationSeconds, isMuted, onToggleMute, onOpen, onLeave }: CallBarProps) {
  const { t } = useTranslation();
  const mmss = `${String(Math.floor(durationSeconds / 60)).padStart(2, '0')}:${String(durationSeconds % 60).padStart(2, '0')}`;

  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-separator bg-success/10 px-4">
      <span className="flex items-center gap-2">
        <span className="alfy-pulse size-2 rounded-full bg-success" aria-hidden />
        <span className="text-xs font-semibold text-success">{t.calls.bar.voiceConnected}</span>
      </span>
      <span className="flex items-center gap-1.5 text-xs text-muted">
        <Signal className="size-3.5" aria-hidden />
        {label} · <span className="tabular-nums">{mmss}</span>
      </span>

      <div className="ml-auto flex items-center gap-0.5">
        <Tooltip delay={300}>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            className={cn('size-8', isMuted ? 'text-danger' : 'text-muted')}
            aria-label={isMuted ? t.callBar.unmuteMic : t.callBar.muteMic}
            onPress={onToggleMute}
          >
            {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>
          <Tooltip.Content>
            <p>{isMuted ? t.callBar.unmuteMic : t.callBar.muteMic}</p>
          </Tooltip.Content>
        </Tooltip>
        <Tooltip delay={300}>
          <Button isIconOnly size="sm" variant="ghost" className="size-8 text-muted" aria-label={t.calls.bar.openCall} onPress={onOpen}>
            <Maximize2 className="size-4" />
          </Button>
          <Tooltip.Content>
            <p>{t.calls.bar.openCall}</p>
          </Tooltip.Content>
        </Tooltip>
        <Tooltip delay={300}>
          <Button isIconOnly size="sm" variant="danger" className="size-8" aria-label={t.calls.hangup} onPress={onLeave}>
            <PhoneOff className="size-4" />
          </Button>
          <Tooltip.Content>
            <p>{t.calls.hangup}</p>
          </Tooltip.Content>
        </Tooltip>
      </div>
    </div>
  );
}
