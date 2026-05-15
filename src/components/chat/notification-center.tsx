'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BellIcon, XIcon, CheckIcon, AtSignIcon, MessageSquareIcon, UserPlusIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { api, resolveMediaUrl } from '@/lib/api';
import {
  useNotificationStore,
  markHistoryRead,
  markAllHistoryRead,
  clearHistory,
  getUnreadHistoryCount,
  type NotificationEntry,
} from '@/lib/notification-store';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Helpers ────────────────────────────────────────────────────────────────────

function typeIcon(type: NotificationEntry['type']) {
  switch (type) {
    case 'mention':        return <AtSignIcon size={11} className="text-violet-500" />;
    case 'friend_request':
    case 'friend_accept':  return <UserPlusIcon size={11} className="text-emerald-500" />;
    default:               return <MessageSquareIcon size={11} className="text-muted-foreground" />;
  }
}

function typeLabel(type: NotificationEntry['type']): string {
  switch (type) {
    case 'mention':        return 'Mention';
    case 'friend_request': return 'Demande d\'ami';
    case 'friend_accept':  return 'Ami ajouté';
    default:               return 'Message';
  }
}

function conversationPath(entry: NotificationEntry): string {
  const { conversationKey } = entry;
  if (conversationKey.startsWith('channel:')) return `/channels/${conversationKey.replace('channel:', '')}`;
  if (conversationKey.startsWith('group:'))   return `/channels/me?group=${conversationKey.replace('group:', '')}`;
  const userId = conversationKey.startsWith('dm:') ? conversationKey.replace('dm:', '') : conversationKey;
  if (userId) return `/channels/me/${userId}`;
  return '/channels/me';
}

function groupByDay(entries: NotificationEntry[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;

  const groups: { label: string; entries: NotificationEntry[] }[] = [];
  const today: NotificationEntry[] = [];
  const yesterday: NotificationEntry[] = [];
  const older: NotificationEntry[] = [];

  for (const e of entries) {
    const t = new Date(e.timestamp).getTime();
    if (t >= todayStart)      today.push(e);
    else if (t >= yesterdayStart) yesterday.push(e);
    else                       older.push(e);
  }

  if (today.length)     groups.push({ label: 'Aujourd\'hui', entries: today });
  if (yesterday.length) groups.push({ label: 'Hier',         entries: yesterday });
  if (older.length)     groups.push({ label: 'Plus anciens', entries: older });
  return groups;
}

// ── NotificationItem ──────────────────────────────────────────────────────────

function NotificationItem({
  entry,
  onNavigate,
}: {
  entry: NotificationEntry;
  onNavigate: (entry: NotificationEntry) => void;
}) {
  return (
    <button
      onClick={() => onNavigate(entry)}
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        'hover:bg-foreground/5',
        !entry.read && 'bg-foreground/[0.03]',
      )}
    >
      {/* Dot non-lu */}
      {!entry.read && (
        <span className="absolute left-1 top-3.5 size-1.5 rounded-full bg-violet-500" />
      )}

      {/* Avatar */}
      <Avatar className="mt-0.5 size-8 shrink-0">
        {entry.senderAvatar && <AvatarImage src={resolveMediaUrl(entry.senderAvatar)} />}
        <AvatarFallback className="text-[10px]">
          {entry.senderName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Contenu */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {typeIcon(entry.type)}
          <span className="text-[10px] font-medium text-muted-foreground">{typeLabel(entry.type)}</span>
          {entry.channelName && (
            <span className="text-[10px] text-muted-foreground/60">· #{entry.channelName}</span>
          )}
        </div>
        <p className="mt-0.5 text-sm font-semibold leading-tight text-foreground">{entry.senderName}</p>
        {entry.preview && (
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{entry.preview}</p>
        )}
      </div>

      {/* Timestamp */}
      <span className="mt-1 shrink-0 text-[10px] text-muted-foreground/60">
        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true, locale: fr })}
      </span>
    </button>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function NotificationCenter() {
  const router  = useRouter();
  const notif   = useNotificationStore();
  const history = notif.history ?? [];
  const unreadCount = history.filter((e) => !e.read).length;
  const groups  = groupByDay(history);

  const handleNavigate = useCallback((entry: NotificationEntry) => {
    markHistoryRead(entry.id);
    router.push(conversationPath(entry));
  }, [router]);

  const handleMarkAllRead = useCallback(() => {
    markAllHistoryRead();
    api.patch('/api/messages/notifications/read').catch(() => {});
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 shrink-0"
          aria-label="Notifications"
        >
          <BellIcon size={16} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0 shadow-xl"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <BellIcon size={14} className="text-muted-foreground" />
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handleMarkAllRead}
                title="Tout marquer comme lu"
              >
                <CheckIcon size={13} />
              </Button>
            )}
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={clearHistory}
                title="Effacer l'historique"
              >
                <XIcon size={13} />
              </Button>
            )}
          </div>
        </div>

        {/* Liste */}
        <ScrollArea className="max-h-[420px]">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <BellIcon size={28} className="opacity-30" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="p-1">
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {group.label}
                  </p>
                  {group.entries.map((entry) => (
                    <NotificationItem
                      key={entry.id}
                      entry={entry}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
