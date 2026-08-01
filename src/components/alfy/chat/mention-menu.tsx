'use client';

import { Hash, Volume2 } from 'lucide-react';

import type { AlfyChannel, AlfyUser } from '@/components/alfy/mock/types';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';

export type MentionItem =
  | { kind: 'user'; user: AlfyUser }
  | { kind: 'channel'; channel: AlfyChannel };

interface MentionMenuProps {
  items: MentionItem[];
  onPick: (item: MentionItem) => void;
}

/** Suggestions @membre / #salon ancrées au-dessus du composer (inline, garde le focus). */
export function MentionMenu({ items, onPick }: MentionMenuProps) {
  if (items.length === 0) return null;
  return (
    <div className="alfy-enter absolute right-0 bottom-full left-0 z-10 mb-2 overflow-hidden rounded-md border border-border bg-overlay shadow-lg">
      <div className="max-h-64 overflow-y-auto p-1">
        {items.map((item) =>
          item.kind === 'user' ? (
            <button
              key={`u-${item.user.id}`}
              type="button"
              onClick={() => onPick(item)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
            >
              <AlfyAvatar name={item.user.displayName} avatarUrl={item.user.avatarUrl} size="sm" status={item.user.status} statusRingClass="ring-overlay" />
              <span className="text-sm font-medium">{item.user.displayName}</span>
              <span className="text-xs text-muted">@{item.user.username}</span>
            </button>
          ) : (
            <button
              key={`c-${item.channel.id}`}
              type="button"
              onClick={() => onPick(item)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
            >
              {item.channel.type === 'voice' ? (
                <Volume2 className="size-4 text-muted" aria-hidden />
              ) : (
                <Hash className="size-4 text-muted" aria-hidden />
              )}
              <span className="text-sm font-medium">{item.channel.name}</span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}
