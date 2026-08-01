'use client';

import { Button, Popover, ScrollShadow, Tooltip } from '@heroui/react';
import { AtSign, Bell, Heart, MessageSquare, UserPlus } from 'lucide-react';

import {
  markHistoryRead,
  markAllHistoryRead,
  useNotificationStore,
  type NotificationEntry,
} from '@/lib/notification-store';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { EmptyState } from '@/components/alfy/primitives/empty-state';

const ICON: Record<NotificationEntry['type'], typeof AtSign> = {
  mention: AtSign,
  message: MessageSquare,
  friend_request: UserPlus,
  friend_accept: UserPlus,
  reaction: Heart,
};

const timeFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Cloche + centre de notifications. */
export function NotificationCenter() {
  const { history: items } = useNotificationStore();
  const unread = items.filter((n) => !n.read).length;

  return (
    <Popover>
      <Tooltip delay={300}>
        <Popover.Trigger
          aria-label={`Notifications${unread ? ` (${unread} non lues)` : ''}`}
          className="relative flex size-8 cursor-pointer items-center justify-center rounded-md text-muted outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Bell className="size-4.5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex min-w-3.5 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-(--danger-foreground)">
              {unread}
            </span>
          )}
        </Popover.Trigger>
        <Tooltip.Content>
          <p>Notifications</p>
        </Tooltip.Content>
      </Tooltip>
      <Popover.Content className="w-88 p-0">
        <Popover.Dialog aria-label="Notifications" className="p-0">
          <div className="flex items-center justify-between border-b border-separator px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <Button size="sm" variant="ghost" onPress={() => markAllHistoryRead()}>
                Tout marquer comme lu
              </Button>
            )}
          </div>
          {items.length === 0 ? (
            <EmptyState icon={Bell} title="Aucune notification" description="Vous êtes à jour." />
          ) : (
            <ScrollShadow className="max-h-96 overflow-y-auto p-1" orientation="vertical">
              <div className="flex flex-col">
                {items.map((n) => {
                  const Icon = ICON[n.type];
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => markHistoryRead(n.id)}
                      className="flex w-full cursor-pointer items-start gap-2.5 rounded-md p-2 text-left outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <span className="relative shrink-0">
                        {n.senderId ? (
                          <AlfyAvatar name={n.senderName} avatarUrl={n.senderAvatar} size="sm" />
                        ) : (
                          <span className="flex size-8 items-center justify-center rounded-full bg-surface-tertiary text-muted">
                            <Icon className="size-4" aria-hidden />
                          </span>
                        )}
                        <span className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-overlay text-accent ring-2 ring-overlay">
                          <Icon className="size-2.5" aria-hidden />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-xs leading-snug">
                          <span className="font-semibold">{n.senderName} </span>
                          <span className="text-foreground/80">{n.preview}</span>
                          {n.channelName && <span className="font-medium text-accent"> #{n.channelName}</span>}
                          {n.serverName && <span className="font-medium text-accent"> ({n.serverName})</span>}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-muted">{timeFmt.format(new Date(n.timestamp))}</span>
                      </span>
                      {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-label="Non lu" />}
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
