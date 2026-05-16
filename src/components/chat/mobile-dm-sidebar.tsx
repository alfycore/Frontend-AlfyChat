'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  UsersIcon,
  PlusIcon,
  UsersRoundIcon,
  FileTextIcon,
  SearchIcon,
  MessageCircleIcon,
  PencilIcon,
} from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import {
  useNotificationStore,
  clearUnread,
  pruneUnread,
} from '@/lib/notification-store';
import { conversationsStore } from '@/lib/conversations-store';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GroupCreateDialog } from '@/components/chat/group-create-dialog';
import { useUIStyle } from '@/hooks/use-ui-style';
import { cn } from '@/lib/utils';
import { statusIcon, formatLastSeen } from '@/lib/status';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  type: 'dm' | 'group';
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  participants?: string[];
}

interface MobileDMSidebarProps {
  selectedChannel: string | null;
  onSelectChannel: (ch: string | null) => void;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimestamp(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) {
    return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (diffDays === 1) return 'hier';
  if (diffDays < 7) {
    return ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'][d.getDay()];
  }
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ── ConversationRow ───────────────────────────────────────────────────────────

function ConversationRow({
  conv,
  isActive,
  presence,
  customStatus,
  emoji,
  unread,
  onClick,
}: {
  conv: Conversation;
  isActive: boolean;
  presence?: string;
  customStatus?: string | null;
  emoji?: string | null;
  unread: number;
  onClick: () => void;
}) {
  const isGroup = conv.type === 'group';
  const subtext = !isGroup
    ? customStatus
      ? emoji ? `${emoji} ${customStatus}` : customStatus
      : (presence === 'offline' ? formatLastSeen((conv as any).lastSeenAt) : null)
    : conv.lastMessage && !conv.lastMessage.startsWith('ecdh:')
      ? conv.lastMessage
      : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150',
        isActive ? 'bg-primary/12 text-primary' : 'text-foreground hover:bg-foreground/6',
      )}
    >
      {/* Avatar + presence dot */}
      <div className="relative shrink-0">
        <Avatar className={cn('size-11', isGroup ? 'rounded-[10px]' : 'rounded-full')}>
          <AvatarImage src={conv.recipientAvatar ? resolveMediaUrl(conv.recipientAvatar) : undefined} />
          <AvatarFallback className={cn('text-[13px] font-bold bg-muted text-muted-foreground', isGroup ? 'rounded-[10px]' : 'rounded-full')}>
            {conv.recipientName?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        {!isGroup && (
          <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-sidebar ring-2 ring-sidebar">
            <img src={statusIcon(presence)} width={13} height={13} alt="" draggable={false} className="block" />
          </span>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn(
            'truncate text-[14px] font-semibold leading-tight',
            isActive ? 'text-primary' : 'text-foreground',
            unread > 0 && !isActive && 'font-bold',
          )}>
            {conv.recipientName || (isGroup ? 'Groupe' : 'Utilisateur')}
          </p>
          <span className="shrink-0 text-[11px] text-muted-foreground/50">
            {formatTimestamp(conv.lastMessageAt)}
          </span>
        </div>
        {subtext && (
          <p className="mt-0.5 truncate text-[12px] leading-tight text-muted-foreground/55">{subtext}</p>
        )}
      </div>

      {/* Unread badge */}
      {unread > 0 && !isActive && (
        <span className="ml-1 flex min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1 py-px text-[10px] font-bold leading-none text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MobileDMSidebar({ selectedChannel, onSelectChannel, onClose }: MobileDMSidebarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const ui = useUIStyle();
  const notifStore = useNotificationStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState(false);
  const conversationsRef = useRef<Conversation[]>([]);
  const prevUserIdRef = useRef<string | null>(null);

  const [presenceMap, setPresenceMap] = useState<Map<string, string>>(new Map());
  const [customStatusMap, setCustomStatusMap] = useState<Map<string, string | null>>(new Map());
  const [emojiMap, setEmojiMap] = useState<Map<string, string | null>>(new Map());

  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const loadConversations = useCallback(async (attempt = 0) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('alfychat_token') : null;
    if (!token) return;
    if (attempt === 0) {
      setConversationsLoading(true);
      setConversationsError(false);
    }
    try {
      const response = await api.getConversations();
      if (!response.success || !response.data) {
        if (attempt < 3) {
          const delay = attempt === 0 ? 1500 : attempt === 1 ? 3000 : 5000;
          setTimeout(() => loadConversationsRef.current(attempt + 1), delay);
          return;
        }
        setConversationsError(true);
        setConversationsLoading(false);
        return;
      }

      const raw = response.data as any[];
      const initialPresence = new Map<string, string>();
      const initialCustomStatus = new Map<string, string | null>();

      const withNames = await Promise.all(
        raw.map(async (conv) => {
          if (conv.type === 'dm' && conv.recipientId) {
            const userRes = await api.getUser(conv.recipientId).catch(() => null);
            const userData = (userRes?.success && userRes.data) ? userRes.data as any : null;
            if (userData?.status) initialPresence.set(conv.recipientId, userData.status);
            if (userData?.customStatus !== undefined) initialCustomStatus.set(conv.recipientId, userData.customStatus ?? null);
            return {
              id: conv.id,
              type: 'dm' as const,
              recipientId: conv.recipientId,
              recipientName: userData?.displayName || userData?.username || conv.name || conv.recipientId,
              recipientAvatar: userData?.avatarUrl,
              lastMessage: conv.lastMessage,
              lastMessageAt: conv.lastMessageAt || conv.updatedAt,
            };
          }
          if (conv.type === 'group') {
            return {
              id: conv.id,
              type: 'group' as const,
              recipientId: conv.id,
              recipientName: conv.name || 'Groupe',
              recipientAvatar: conv.avatarUrl,
              lastMessage: conv.lastMessage,
              lastMessageAt: conv.lastMessageAt || conv.updatedAt,
              participants: conv.participants,
            };
          }
          return {
            id: conv.id,
            type: (conv.type || 'dm') as 'dm' | 'group',
            recipientId: conv.recipientId || conv.id,
            recipientName: conv.name || 'Conversation',
            lastMessage: conv.lastMessage,
            lastMessageAt: conv.lastMessageAt || conv.updatedAt,
          };
        }),
      );

      let sorted = (withNames.filter(Boolean) as Conversation[]).sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      });

      const validKeys = [
        ...sorted.filter(c => c.type === 'dm').map(c => c.recipientId),
        ...sorted.filter(c => c.type === 'group').map(c => `group:${c.id}`),
      ];
      pruneUnread(validKeys);
      conversationsStore.set(sorted, initialPresence, initialCustomStatus);
      setConversations(sorted);
      if (initialPresence.size > 0) setPresenceMap(prev => { const n = new Map(prev); initialPresence.forEach((v, k) => n.set(k, v)); return n; });
      if (initialCustomStatus.size > 0) setCustomStatusMap(prev => { const n = new Map(prev); initialCustomStatus.forEach((v, k) => n.set(k, v)); return n; });
      setConversationsLoading(false);

      const dmRecipientIds = sorted.filter(c => c.type === 'dm').map(c => c.recipientId).filter(Boolean);
      if (dmRecipientIds.length > 0) {
        socketService.requestBulkPresence(dmRecipientIds, (presence) => {
          if (!presence || presence.length === 0) return;
          const fp = new Map(initialPresence);
          const fc = new Map(initialCustomStatus);
          const fe = new Map<string, string | null>();
          presence.forEach((p) => {
            fp.set(p.userId, p.status);
            if (p.customStatus !== undefined) fc.set(p.userId, p.customStatus);
            if (p.emoji !== undefined) fe.set(p.userId, p.emoji);
          });
          conversationsStore.set(sorted, fp, fc);
          setPresenceMap(prev => { const n = new Map(prev); fp.forEach((v, k) => n.set(k, v)); return n; });
          setCustomStatusMap(prev => { const n = new Map(prev); fc.forEach((v, k) => n.set(k, v)); return n; });
          if (fe.size > 0) setEmojiMap(prev => { const n = new Map(prev); fe.forEach((v, k) => n.set(k, v)); return n; });
        });
      }
    } catch {
      if (attempt < 3) {
        const delay = attempt === 0 ? 1500 : attempt === 1 ? 3000 : 5000;
        setTimeout(() => loadConversationsRef.current(attempt + 1), delay);
        return;
      }
      setConversationsError(true);
      setConversationsLoading(false);
    }
  }, []);

  const loadConversationsRef = useRef(loadConversations);
  useEffect(() => { loadConversationsRef.current = loadConversations; }, [loadConversations]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  // Load from cache or fetch
  useEffect(() => {
    if (conversationsStore.isLoaded()) {
      setConversations(conversationsStore.get());
      const cached = conversationsStore.getPresence();
      const cachedCustom = conversationsStore.getCustomStatus();
      const cachedEmoji = conversationsStore.getEmojiMap();
      if (cached.size > 0) setPresenceMap(new Map(cached));
      if (cachedCustom.size > 0) setCustomStatusMap(new Map(cachedCustom));
      if (cachedEmoji.size > 0) setEmojiMap(new Map(cachedEmoji));
    } else {
      loadConversations();
    }
  }, [loadConversations]);

  // Reload when user logs in
  useEffect(() => {
    if (user?.id && user.id !== prevUserIdRef.current) {
      prevUserIdRef.current = user.id;
      loadConversations();
    }
  }, [user?.id, loadConversations]);

  // ── Socket listeners ──────────────────────────────────────────────────────

  useEffect(() => {
    const handleMessageNew = (message: any) => {
      const content = message.content || '';
      const convId = message.conversationId;
      const msgAuthorId = message.senderId || message.authorId;
      const msgRecipientId = message.recipientId;
      const createdAt = message.createdAt || new Date().toISOString();

      setConversations((prev) => {
        const idx = prev.findIndex((c) => {
          if (c.id === convId) return true;
          if (msgRecipientId && c.type === 'dm') {
            return c.recipientId === msgAuthorId || c.recipientId === msgRecipientId;
          }
          return false;
        });
        if (idx === -1) {
          loadConversationsRef.current();
          return prev;
        }
        const conv = prev[idx];
        const updated = [...prev];
        updated[idx] = { ...conv, lastMessage: content, lastMessageAt: createdAt };
        const [moved] = updated.splice(idx, 1);
        conversationsStore.updateLastMessage(moved.id, content, createdAt);
        return [moved, ...updated];
      });
    };

    const handlePresence = (data: any) => {
      const payload = data?.payload || data;
      const userId = payload?.userId;
      const status = payload?.status;
      const text = payload?.text ?? payload?.customStatus;
      const emoji = payload?.emoji ?? undefined;
      if (!userId) return;
      conversationsStore.setPresence(userId, status, text, emoji);
      setPresenceMap(prev => { const n = new Map(prev); n.set(userId, status); return n; });
      if (text !== undefined) setCustomStatusMap(prev => { const n = new Map(prev); n.set(userId, text); return n; });
      if (emoji !== undefined) setEmojiMap(prev => { const n = new Map(prev); n.set(userId, emoji ?? null); return n; });
    };

    const handleConversationCreate = (data: any) => {
      if (!data?.id) return;
      const conv = {
        id: data.id,
        type: (data.type || 'dm') as 'dm' | 'group',
        recipientId: data.recipientId || '',
        recipientName: data.recipientName || '',
        recipientAvatar: data.recipientAvatar || undefined,
      };
      conversationsStore.addConversation(conv);
      setConversations(conversationsStore.get());
    };

    const handleProfileUpdate = (data: any) => {
      const p = data?.payload ?? data;
      if (!p?.userId) return;
      conversationsStore.updateRecipientProfile(p.userId, { displayName: p.displayName, avatarUrl: p.avatarUrl });
      setConversations(conversationsStore.get());
    };

    const handleReconnect = () => loadConversationsRef.current();
    const handleFriendAccepted = () => loadConversationsRef.current();

    socketService.on('message:new', handleMessageNew);
    socketService.onPresenceUpdate(handlePresence);
    socketService.on('CONVERSATION_CREATE', handleConversationCreate);
    socketService.on('PROFILE_UPDATE', handleProfileUpdate);
    socketService.on('socket:reconnected', handleReconnect);
    socketService.onFriendAccepted(handleFriendAccepted);

    return () => {
      socketService.off('message:new', handleMessageNew);
      socketService.off('PRESENCE_UPDATE', handlePresence);
      socketService.off('CONVERSATION_CREATE', handleConversationCreate);
      socketService.off('PROFILE_UPDATE', handleProfileUpdate);
      socketService.off('socket:reconnected', handleReconnect);
      socketService.off('FRIEND_ACCEPT', handleFriendAccepted);
    };
  }, []);

  // ── Navigation helpers ────────────────────────────────────────────────────

  const navigate = (conv: Conversation) => {
    const unreadKey = conv.type === 'group' ? `group:${conv.id}` : conv.recipientId;
    clearUnread(unreadKey);
    if (conv.type === 'group') {
      router.push(`/channels/groups/${conv.id}`);
    } else {
      router.push(`/channels/me/${conv.recipientId}`);
    }
    onClose();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={cn('flex h-full w-full flex-col overflow-hidden', ui.sidebarBg)}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={cn(
        'flex h-14 shrink-0 items-center gap-3 border-b border-border/40 px-4',
        ui.isGlass ? 'bg-background/60' : 'bg-sidebar',
      )}>
        {/* User avatar */}
        {user && (
          <Avatar className="size-8 shrink-0 rounded-full">
            <AvatarImage src={user.avatarUrl ? resolveMediaUrl(user.avatarUrl) : undefined} />
            <AvatarFallback className="rounded-full text-[11px] font-bold bg-primary/15 text-primary">
              {user.displayName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Title */}
        <span className="flex-1 text-[15px] font-bold tracking-tight text-foreground">Messages</span>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCreateGroup(true)}
            className="flex size-8 items-center justify-center rounded-xl text-muted-foreground/60 transition-colors hover:bg-foreground/8 hover:text-foreground"
            aria-label="Créer un groupe"
          >
            <PencilIcon size={16} />
          </button>
          <button
            onClick={() => {
              onSelectChannel('friends');
              onClose();
            }}
            className="flex size-8 items-center justify-center rounded-xl text-muted-foreground/60 transition-colors hover:bg-foreground/8 hover:text-foreground"
            aria-label="Nouvelle conversation"
          >
            <PlusIcon size={19} />
          </button>
        </div>
      </div>

      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-3 pb-1">
        <button
          onClick={() => {
            router.push('/channels/me');
            onClose();
          }}
          className="flex h-9 w-full items-center gap-2 rounded-xl bg-foreground/8 px-3 text-muted-foreground/60 transition-colors hover:bg-foreground/10"
        >
          <SearchIcon size={14} className="shrink-0" />
          <span className="flex-1 text-left text-[13px]">Trouver une conversation</span>
        </button>
      </div>

      {/* ── Quick nav ──────────────────────────────────────────────────── */}
      <div className="shrink-0 px-2 pt-2">
        {([
          { label: 'Amis', icon: UsersIcon, action: () => { onSelectChannel('friends'); onClose(); router.push('/channels/me'); } },
          { label: 'Changelogs', icon: FileTextIcon, action: () => { router.push('/channels/me/changelogs'); onClose(); } },
          { label: 'Hébergements', icon: MessageCircleIcon, action: () => { router.push('/channels/hosting'); onClose(); } },
          { label: 'Créer un groupe', icon: UsersRoundIcon, action: () => setShowCreateGroup(true) },
        ] as const).map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            onClick={action}
            className="flex w-full items-center gap-3.5 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-muted-foreground/70 transition-colors hover:bg-foreground/6 hover:text-foreground"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-foreground/8">
              <Icon size={15} className="text-foreground/60" />
            </div>
            {label}
          </button>
        ))}
      </div>

      {/* ── Conversations section ───────────────────────────────────────── */}
      <div className="mt-3 mb-1 shrink-0 px-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/40">Conversations</p>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="space-y-0.5 px-2 pb-2">
          {conversationsLoading ? (
            <p className="py-6 text-center text-[12px] text-muted-foreground/40">Chargement…</p>
          ) : conversationsError ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <p className="text-center text-[12px] text-destructive/70">Impossible de charger les conversations.</p>
              <button
                onClick={() => loadConversationsRef.current()}
                className="rounded-xl bg-foreground/8 px-4 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-foreground/12 hover:text-foreground"
              >
                Réessayer
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-muted-foreground/40">Aucune conversation</p>
          ) : (
            conversations.map((conv) => {
              const isGroup = conv.type === 'group';
              const unreadKey = isGroup ? `group:${conv.id}` : conv.recipientId;
              const isActive = isGroup
                ? selectedChannel === `group:${conv.id}` || selectedChannel === conv.id
                : selectedChannel === conv.recipientId || selectedChannel === `dm:${conv.recipientId}`;
              const unread = notifStore.unread.get(unreadKey) ?? 0;

              return (
                <ConversationRow
                  key={conv.id}
                  conv={conv}
                  isActive={isActive}
                  presence={presenceMap.get(conv.recipientId)}
                  customStatus={customStatusMap.get(conv.recipientId)}
                  emoji={emojiMap.get(conv.recipientId)}
                  unread={unread}
                  onClick={() => navigate(conv)}
                />
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* ── Modale: Créer un groupe ─────────────────────────────────────── */}
      <GroupCreateDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        onCreated={(groupId) => {
          if (groupId) {
            router.push(`/channels/groups/${groupId}`);
            onClose();
          }
        }}
      />
    </div>
  );
}
