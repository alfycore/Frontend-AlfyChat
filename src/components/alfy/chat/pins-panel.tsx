'use client';

import { Popover, ScrollShadow, Tooltip } from '@heroui/react';
import { Pin } from 'lucide-react';

import type { AlfyMessage } from '@/components/alfy/mock/types';
import { useUserById } from '@/components/alfy/user-directory';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { EmptyState } from '@/components/alfy/primitives/empty-state';
import { useTranslation } from '@/components/locale-provider';

const timeFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Bouton + popover listant les messages épinglés du salon. */
export function PinsPanel({ messages, onJump }: { messages: AlfyMessage[]; onJump?: (id: string) => void }) {
  const { t, tx } = useTranslation();
  const userById = useUserById();
  const pinned = messages.filter((m) => m.pinned);
  return (
    <Popover>
      <Tooltip delay={300}>
        <Popover.Trigger
          aria-label={t.chat.pinsTooltip}
          className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Pin className="size-4.5" />
        </Popover.Trigger>
        <Tooltip.Content>
          <p>{t.chat.pinsTooltip}</p>
        </Tooltip.Content>
      </Tooltip>
      <Popover.Content className="w-88 p-0">
        <Popover.Dialog aria-label={t.chat.pinsTooltip} className="p-0">
          <div className="border-b border-separator px-3 py-2 text-sm font-semibold">
            {tx(t.chat.pinsHeading, { n: pinned.length })}
          </div>
          {pinned.length === 0 ? (
            <EmptyState icon={Pin} title={t.chat.pinsEmpty} description={t.chat.pinsEmptyDesc} />
          ) : (
            <ScrollShadow className="max-h-96 overflow-y-auto p-2" orientation="vertical">
              <div className="flex flex-col gap-1">
                {pinned.map((m) => {
                  const author = userById(m.authorId);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onJump?.(m.id)}
                      className="flex w-full cursor-pointer gap-2.5 rounded-md p-2 text-left outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <AlfyAvatar name={author.displayName} avatarUrl={author.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-baseline gap-2">
                          <span className="truncate text-xs font-semibold">{author.displayName}</span>
                          <span className="shrink-0 text-[10px] text-muted">{timeFmt.format(new Date(m.createdAt))}</span>
                        </p>
                        <p className="line-clamp-2 text-xs text-foreground/75">{m.content}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollShadow>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
