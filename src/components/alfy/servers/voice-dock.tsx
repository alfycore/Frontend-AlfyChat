'use client';

import { Button, Chip, Tooltip } from '@heroui/react';
import { PhoneOff, Signal } from 'lucide-react';

/** Encart « connecté au vocal » au-dessus du user-dock. */
export function VoiceDock({ channelName, onLeave }: { channelName: string; onLeave?: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Signal className="size-3.5 text-success" aria-hidden />
          <span className="text-xs font-medium text-success">Voix connectée</span>
        </div>
        <p className="truncate text-[11px] text-muted">{channelName}</p>
      </div>
      <Chip size="sm" color="success" variant="soft" className="cursor-default">
        23 ms
      </Chip>
      <Tooltip delay={300}>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="size-7 text-muted hover:text-danger"
          onPress={onLeave}
          aria-label="Quitter le salon vocal"
        >
          <PhoneOff className="size-4" />
        </Button>
        <Tooltip.Content>
          <p>Quitter le salon vocal</p>
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
}
