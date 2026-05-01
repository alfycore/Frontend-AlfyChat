'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { useNotificationStore, getUnread, clearUnread } from '@/lib/notification-store';
import { serverListStore } from '@/lib/server-list-store';
import { conversationsStore } from '@/lib/conversations-store';
import { statusColor } from '@/lib/status';
import { cn } from '@/lib/utils';
import { useUIStyle } from '@/hooks/use-ui-style';
import {
  HashIcon,
  Volume2Icon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UsersRoundIcon,
  CompassIcon,
  MegaphoneIcon,
  SettingsIcon,
  LogOutIcon,
  Trash2Icon,
  CopyIcon,
  Link2Icon,
  SearchIcon,
  MessageCircleIcon,
} from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { UserPanel } from '@/components/chat/user-panel';
import { ServerSettingsDialog } from '@/components/chat/server-settings-dialog';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Channel {
  id: string;
  name: string;
  type: string;
  parentId?: string | null;
  position?: number;
}

interface AppSidebarProps {
  className?: string;
}

// ── Channel icon map ──────────────────────────────────────────────────────────

const CHANNEL_ICON: Record<string, any> = {
  text: HashIcon,
  announcement: MegaphoneIcon,
  voice: Volume2Icon,
  default: HashIcon,
};

// ── Workspace color palette (deterministic) ───────────────────────────────────

const WS_TONES = [
  '#5865F2', '#2ECC71', '#FAA819', '#ED4245', '#EB459E',
  '#9C84EF', '#1ABC9C', '#E67E22', '#3498DB', '#57D7A1',
];

function workspaceTone(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return WS_TONES[Math.abs(h) % WS_TONES.length];
}

// ── WsMark — colored workspace square ────────────────────────────────────────

function WsMark({ name, iconUrl, size = 20 }: { name: string; iconUrl?: string | null; size?: number }) {
  const radius = Math.round(size * 0.28);
  if (iconUrl) {
    return (
      <img
        src={resolveMediaUrl(iconUrl) ?? iconUrl}
        alt={name}
        className="shrink-0 object-cover"
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: workspaceTone(name),
        fontSize: Math.round(size * 0.46),
        fontWeight: 600,
        letterSpacing: '-0.02em',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        color: 'white',
      }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// ── NavButton — context-free SidebarMenuButton equivalent ────────────────────
// Replicates sidebarMenuButtonVariants classes without requiring SidebarProvider

function NavButton({
  isActive,
  size = 'default',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isActive?: boolean;
  size?: 'default' | 'sm';
}) {
  return (
    <button
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive || undefined}
      className={cn(
        'peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left text-sm',
        'ring-sidebar-ring outline-hidden transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        'focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground',
        '[&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate',
        size === 'sm' ? 'h-7 text-xs' : 'h-8 text-sm',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AppSidebar({ className }: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const notifStore = useNotificationStore();
  const ui = useUIStyle();

  // ── Parse active route ────────────────────────────────────────────────────
  const serverMatch = pathname.match(/\/channels\/server\/([^/]+)/);
  const channelMatch = pathname.match(/\/channels\/server\/[^/]+\/([^/]+)/);
  const dmMatch = pathname.match(/\/channels\/me\/([^/]+)/);
  const groupMatch = pathname.match(/\/channels\/(?:me\/g|groups)\/([^/]+)/);

  const activeServerId = serverMatch?.[1] ?? null;
  const activeChannelId = channelMatch?.[1] ?? null;
  const activeDmId = dmMatch?.[1] ?? null;
  const activeGroupId = groupMatch?.[1] ?? null;
  const isFriendsPage = pathname === '/channels/me' || pathname === '/channels/me/';

  // ── Servers ───────────────────────────────────────────────────────────────
  const servers = useSyncExternalStore(
    serverListStore.subscribe,
    serverListStore.getSnapshot,
    serverListStore.getServerSnapshot,
  );
  const [onlineNodeIds, setOnlineNodeIds] = useState<Set<string>>(new Set());
  const [serversLoading, setServersLoading] = useState(!serverListStore.isLoaded());

  // ── Conversations ─────────────────────────────────────────────────────────
  const conversations = useSyncExternalStore(
    conversationsStore.subscribe,
    conversationsStore.getSnapshot,
    conversationsStore.getServerSnapshot,
  );
  const [presenceMap, setPresenceMap] = useState<Map<string, string>>(
    () => conversationsStore.getPresence(),
  );
  const [convsLoading, setConvsLoading] = useState(!conversationsStore.isLoaded());

  // ── Server channels cache ──────────────────────────────────────────────────
  const [channelsMap, setChannelsMap] = useState<Map<string, Channel[]>>(new Map());

  // ── Expanded servers ───────────────────────────────────────────────────────
  const [expandedServers, setExpandedServers] = useState<Set<string>>(() =>
    activeServerId ? new Set([activeServerId]) : new Set(),
  );

  // ── Dialogs ────────────────────────────────────────────────────────────────
  const [settingsServerId, setSettingsServerId] = useState<string | null>(null);
  const [leaveServerId, setLeaveServerId] = useState<string | null>(null);
  const [deleteServerId, setDeleteServerId] = useState<string | null>(null);

  // ── Load servers ───────────────────────────────────────────────────────────
  const loadServers = useCallback(async () => {
    setServersLoading(true);
    const res = await api.getServers();
    if (res.success && res.data) {
      let list = (res.data as any[]).map((s: any) => ({
        id: s.id,
        name: s.name,
        iconUrl: s.iconUrl ?? s.icon_url ?? undefined,
        ownerId: s.ownerId ?? s.owner_id ?? undefined,
      }));
      try {
        const order = JSON.parse(
          localStorage.getItem('alfychat_server_order') ?? '[]',
        ) as string[];
        if (order.length) {
          const rank = new Map(order.map((id, i) => [id, i]));
          list = list.sort(
            (a, b) => (rank.get(a.id) ?? list.length) - (rank.get(b.id) ?? list.length),
          );
        }
      } catch {}
      serverListStore.set(list);
    }
    setServersLoading(false);
  }, []);

  useEffect(() => {
    if (!serverListStore.isLoaded()) loadServers();
    else setServersLoading(false);
  }, [loadServers]);

  // ── Load conversations ─────────────────────────────────────────────────────
  const loadConvs = useCallback(async (attempt = 0) => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('alfychat_token') : null;
    if (!token) return;
    if (attempt === 0) setConvsLoading(true);

    try {
      const response = await api.getConversations();
      if (!response.success || !response.data) {
        if (attempt < 3) {
          const delay = [1500, 3000, 5000][attempt] ?? 5000;
          setTimeout(() => loadConvs(attempt + 1), delay);
          return;
        }
        setConvsLoading(false);
        return;
      }
      const raw = response.data as any[];
      const initialPresence = new Map<string, string>();
      const initialCustomStatus = new Map<string, string | null>();

      const withNames = await Promise.all(
        raw.map(async (conv) => {
          if (conv.type === 'dm' && conv.recipientId) {
            const userRes = await api.getUser(conv.recipientId).catch(() => null);
            const userData =
              userRes?.success && userRes.data ? (userRes.data as any) : null;
            if (userData?.status) initialPresence.set(conv.recipientId, userData.status);
            if (userData?.customStatus !== undefined)
              initialCustomStatus.set(conv.recipientId, userData.customStatus ?? null);
            return {
              id: conv.id,
              type: 'dm' as const,
              recipientId: conv.recipientId,
              recipientName:
                userData?.displayName || userData?.username || conv.recipientId,
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
          return null;
        }),
      );

      const sorted = (withNames.filter(Boolean) as any[]).sort((a, b) => {
        const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bt - at;
      });

      conversationsStore.set(sorted, initialPresence, initialCustomStatus);
      setPresenceMap(new Map(initialPresence));

      // Bulk presence refresh
      const dmIds = sorted.filter((c) => c.type === 'dm').map((c) => c.recipientId);
      if (dmIds.length > 0) {
        socketService.requestBulkPresence(dmIds, (presence: any[]) => {
          if (!presence?.length) return;
          const fp = new Map(initialPresence);
          const fc = new Map(initialCustomStatus);
          presence.forEach(({ userId, status, customStatus }) => {
            fp.set(userId, status);
            if (customStatus !== undefined) fc.set(userId, customStatus);
          });
          conversationsStore.set(sorted, fp, fc);
          setPresenceMap(new Map(fp));
        });
      }
      setConvsLoading(false);
    } catch {
      if (attempt < 3) {
        setTimeout(() => loadConvs(attempt + 1), [1500, 3000, 5000][attempt] ?? 5000);
        return;
      }
      setConvsLoading(false);
    }
  }, []);

  const loadConvsRef = useRef(loadConvs);
  useEffect(() => {
    loadConvsRef.current = loadConvs;
  }, [loadConvs]);

  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    if (user.id !== prevUserIdRef.current) {
      prevUserIdRef.current = user.id;
      if (!conversationsStore.isLoaded()) {
        loadConvs();
      } else {
        setConvsLoading(false);
        setPresenceMap(new Map(conversationsStore.getPresence()));
      }
    }
  }, [user?.id, loadConvs]);

  // ── Load channels for a server ─────────────────────────────────────────────
  const loadServerChannels = useCallback(
    (serverId: string) => {
      if (channelsMap.has(serverId)) return;
      socketService.requestServerChannels(serverId, (raw: any) => {
        const arr = Array.isArray(raw) ? raw : raw?.channels ?? [];
        const chs: Channel[] = arr.map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          type: ch.type,
          parentId: ch.parentId ?? ch.parent_id ?? null,
          position: ch.position ?? 0,
        }));
        setChannelsMap((prev) => new Map(prev).set(serverId, chs));
      });
    },
    [channelsMap],
  );

  // Auto-expand + load channels for active server
  useEffect(() => {
    if (!activeServerId) return;
    setExpandedServers((prev) => new Set(prev).add(activeServerId));
    loadServerChannels(activeServerId);
  }, [activeServerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Socket events ──────────────────────────────────────────────────────────
  useEffect(() => {
    const getId = (d: any): string | null =>
      d?.payload?.serverId ?? d?.serverId ?? null;

    const onNodeOnline = (d: any) => {
      const id = getId(d);
      if (id) setOnlineNodeIds((p) => new Set(p).add(id));
    };
    const onNodeOffline = (d: any) => {
      const id = getId(d);
      if (id)
        setOnlineNodeIds((p) => {
          const s = new Set(p);
          s.delete(id);
          return s;
        });
    };
    const onServerUpdate = (d: any) => {
      const p = d?.payload ?? d?.updates ?? d;
      const id = p?.id ?? p?.serverId;
      if (!id) return;
      serverListStore.update(id, {
        ...(p.name != null ? { name: p.name } : {}),
        ...(p.iconUrl !== undefined ? { iconUrl: p.iconUrl || undefined } : {}),
      });
    };
    const onServerGone = (d: any, warn?: string) => {
      const id = getId(d);
      if (!id) return;
      serverListStore.remove(id);
      if (warn) toast.warning(warn);
      if (activeServerId === id) router.push('/channels/me');
    };
    const onServerJoined = (d: any) => {
      const s = d?.payload ?? d;
      if (s?.id) {
        serverListStore.add({
          id: s.id,
          name: s.name,
          iconUrl: s.iconUrl ?? s.icon_url,
          ownerId: s.ownerId ?? s.owner_id,
        });
      }
    };
    const onChannelCreate = (d: any) => {
      const sId = d?.payload?.serverId ?? d?.serverId;
      if (!sId || !channelsMap.has(sId)) return;
      const ch = d?.payload ?? d;
      setChannelsMap((prev) => {
        const chs = [...(prev.get(sId) ?? [])];
        if (!chs.find((c) => c.id === ch.id)) {
          chs.push({ id: ch.id, name: ch.name, type: ch.type, parentId: ch.parentId ?? null, position: ch.position ?? 0 });
        }
        return new Map(prev).set(sId, chs);
      });
    };
    const onChannelDelete = (d: any) => {
      const sId = d?.payload?.serverId ?? d?.serverId;
      const cId = d?.payload?.channelId ?? d?.channelId ?? d?.payload?.id ?? d?.id;
      if (!sId || !cId) return;
      setChannelsMap((prev) => {
        const chs = (prev.get(sId) ?? []).filter((c) => c.id !== cId);
        return new Map(prev).set(sId, chs);
      });
    };
    const onPresenceUpdate = (d: any) => {
      const p = d?.payload ?? d;
      const userId = p?.userId ?? p?.user_id;
      const status = p?.status;
      if (userId && status) {
        conversationsStore.setPresence(userId, status, p?.customStatus);
        setPresenceMap((prev) => new Map(prev).set(userId, status));
      }
    };
    const onNewMessage = (d: any) => {
      const p = d?.payload ?? d;
      const convId = p?.conversationId ?? p?.conversation_id;
      const recipId = p?.recipientId ?? p?.recipient_id;
      const msg = p?.content ?? p?.message ?? '';
      const at = p?.createdAt ?? p?.created_at ?? new Date().toISOString();
      if (convId) conversationsStore.updateLastMessage(convId, msg, at);
      else if (recipId) conversationsStore.updateLastMessage(recipId, msg, at);
    };

    socketService.on('SERVER_NODE_ONLINE', onNodeOnline);
    socketService.on('SERVER_NODE_OFFLINE', onNodeOffline);
    socketService.on('SERVER_UPDATE', onServerUpdate);
    socketService.on('SERVER_DELETE', (d) => onServerGone(d));
    socketService.on('SERVER_KICKED', (d) => onServerGone(d, 'Vous avez été retiré du serveur.'));
    socketService.on('SERVER_BANNED', (d) => onServerGone(d, 'Vous avez été banni du serveur.'));
    socketService.on('SERVER_JOINED', onServerJoined);
    socketService.on('CHANNEL_CREATE', onChannelCreate);
    socketService.on('CHANNEL_DELETE', onChannelDelete);
    socketService.on('PRESENCE_UPDATE', onPresenceUpdate);
    socketService.on('NEW_MESSAGE', onNewMessage);

    return () => {
      socketService.off('SERVER_NODE_ONLINE', onNodeOnline);
      socketService.off('SERVER_NODE_OFFLINE', onNodeOffline);
      socketService.off('SERVER_UPDATE', onServerUpdate);
      socketService.off('SERVER_DELETE', onServerGone);
      socketService.off('SERVER_KICKED', onServerGone);
      socketService.off('SERVER_BANNED', onServerGone);
      socketService.off('SERVER_JOINED', onServerJoined);
      socketService.off('CHANNEL_CREATE', onChannelCreate);
      socketService.off('CHANNEL_DELETE', onChannelDelete);
      socketService.off('PRESENCE_UPDATE', onPresenceUpdate);
      socketService.off('NEW_MESSAGE', onNewMessage);
    };
  }, [activeServerId, router, channelsMap]);

  // ── Server actions ─────────────────────────────────────────────────────────
  const handleLeaveServer = async () => {
    if (!leaveServerId) return;
    await api.leaveServer(leaveServerId);
    serverListStore.remove(leaveServerId);
    if (activeServerId === leaveServerId) router.push('/channels/me');
    setLeaveServerId(null);
  };

  const handleDeleteServer = async () => {
    if (!deleteServerId) return;
    await api.deleteServer(deleteServerId);
    serverListStore.remove(deleteServerId);
    if (activeServerId === deleteServerId) router.push('/channels/me');
    setDeleteServerId(null);
  };

  const handleCopyServerId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => toast.success('ID copié'));
  };

  const handleCopyInvite = async (id: string) => {
    const res = await api.createServerInvite(id, {});
    if (res.success && res.data) {
      const code = (res.data as any).code ?? (res.data as any).invite?.code;
      if (code) {
        navigator.clipboard.writeText(`${window.location.origin}/invite/${code}`);
        toast.success("Lien d'invitation copié");
      }
    }
  };

  // ── DM total unread ────────────────────────────────────────────────────────
  const dmTotalUnread = conversations.reduce((acc, conv) => {
    const key = conv.type === 'group' ? `group:${conv.id}` : conv.recipientId;
    return acc + (notifStore.unread.get(key) ?? 0);
  }, 0);

  // ── Server total unread ────────────────────────────────────────────────────
  const serverUnread = (sId: string) => notifStore.unread.get(`server:${sId}`) ?? 0;

  // ── Toggle expand server ───────────────────────────────────────────────────
  const toggleServer = (sId: string) => {
    setExpandedServers((prev) => {
      const next = new Set(prev);
      if (next.has(sId)) {
        next.delete(sId);
      } else {
        next.add(sId);
        loadServerChannels(sId);
      }
      return next;
    });
  };

  // ── Navigate ───────────────────────────────────────────────────────────────
  const goToServer = (sId: string) => {
    const chs = channelsMap.get(sId);
    const first = chs?.find((c) => c.type === 'text' || c.type === 'announcement');
    if (first) router.push(`/channels/server/${sId}/${first.id}`);
    else router.push(`/channels/server/${sId}`);
  };

  const goToDM = (conv: (typeof conversations)[number]) => {
    const key = conv.type === 'group' ? `group:${conv.id}` : conv.recipientId;
    clearUnread(key);
    if (conv.type === 'group') router.push(`/channels/groups/${conv.id}`);
    else router.push(`/channels/me/${conv.recipientId}`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={400}>
      <div
        className={cn(
          'flex h-full w-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground',
          ui.sidebarBg,
          className,
        )}
      >
        {/* ── Header chip ─────────────────────────────────────────────────── */}
        <SidebarHeader className={cn('shrink-0 border-b border-sidebar-border p-2 pb-2', ui.header)}>
          <div className="flex items-center gap-2 px-1 py-0.5">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-primary">
              <div className="size-3 rounded-sm bg-primary-foreground" />
            </div>
            <span className="flex-1 truncate text-[13px] font-semibold tracking-tight text-sidebar-foreground">
              AlfyChat
            </span>
            <button
              onClick={() => router.push('/channels/discover-server')}
              className="flex size-6 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              title="Rechercher"
            >
              <SearchIcon size={13} />
            </button>
          </div>
        </SidebarHeader>

        {/* ── Scrollable content ──────────────────────────────────────────── */}
        <SidebarContent className="flex-1 min-h-0">

          {/* ── DMs section ──────────────────────────────────────────────── */}
          <SidebarGroup>
            <SidebarGroupLabel>Messages</SidebarGroupLabel>
            <SidebarGroupAction
              onClick={() => router.push('/channels/me')}
              title="Nouveau message"
            >
              <PlusIcon size={13} />
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>

                {/* Friends */}
                <SidebarMenuItem>
                  <NavButton
                    isActive={isFriendsPage}
                    onClick={() => router.push('/channels/me')}
                  >
                    <div
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-md transition-colors',
                        isFriendsPage
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'bg-sidebar-accent/60 text-sidebar-foreground/60',
                      )}
                    >
                      <UsersRoundIcon size={12} />
                    </div>
                    <span className="flex-1">Amis</span>
                  </NavButton>
                  {dmTotalUnread > 0 && !isFriendsPage && (
                    <SidebarMenuBadge className="bg-destructive/90 text-white">
                      {dmTotalUnread > 99 ? '99+' : dmTotalUnread}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>

                {/* Conversations */}
                {convsLoading ? (
                  [1, 2, 3].map((i) => (
                    <SidebarMenuItem key={i}>
                      <div className="flex h-9 items-center gap-2.5 px-2">
                        <Skeleton className="size-6 shrink-0 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-2.5 w-20 rounded" />
                          <Skeleton className="h-2 w-14 rounded" />
                        </div>
                      </div>
                    </SidebarMenuItem>
                  ))
                ) : (
                  conversations.map((conv) => {
                    const unreadKey =
                      conv.type === 'group' ? `group:${conv.id}` : conv.recipientId;
                    const unread = notifStore.unread.get(unreadKey) ?? 0;
                    const isActive =
                      conv.type === 'group'
                        ? activeGroupId === conv.id
                        : activeDmId === conv.recipientId;
                    const presence = presenceMap.get(conv.recipientId) ?? 'offline';

                    return (
                      <SidebarMenuItem key={conv.id}>
                        <NavButton
                          isActive={isActive}
                          onClick={() => goToDM(conv)}
                          className={cn(
                            unread > 0 && !isActive ? 'text-sidebar-foreground' : '',
                          )}
                        >
                          <div className="relative shrink-0">
                            <Avatar className="size-6">
                              <AvatarImage
                                src={
                                  conv.recipientAvatar
                                    ? resolveMediaUrl(conv.recipientAvatar) ?? undefined
                                    : undefined
                                }
                              />
                              <AvatarFallback className="text-[9px]">
                                {conv.recipientName?.charAt(0)?.toUpperCase() ?? '?'}
                              </AvatarFallback>
                            </Avatar>
                            {conv.type === 'dm' && (
                              <span
                                className={cn(
                                  'absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-[1.5px] border-sidebar',
                                  statusColor(presence),
                                )}
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                'truncate text-[12.5px] leading-tight',
                                unread > 0 && !isActive ? 'font-semibold' : 'font-medium',
                              )}
                            >
                              {conv.recipientName}
                            </p>
                            {conv.lastMessage && (
                              <p className="truncate text-[11px] leading-tight text-sidebar-foreground/50">
                                {conv.lastMessage}
                              </p>
                            )}
                          </div>
                        </NavButton>
                        {unread > 0 && !isActive && (
                          <SidebarMenuBadge className="bg-destructive/90 text-white">
                            {unread > 99 ? '99+' : unread}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* ── Servers section ─────────────────────────────────────────── */}
          <SidebarGroup>
            <SidebarGroupLabel>Serveurs</SidebarGroupLabel>
            <SidebarGroupAction
              onClick={() => router.push('/channels/discover-server')}
              title="Rejoindre ou créer un serveur"
            >
              <PlusIcon size={13} />
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                {serversLoading ? (
                  [1, 2, 3].map((i) => (
                    <SidebarMenuItem key={i}>
                      <div className="flex h-8 items-center gap-2.5 px-2">
                        <Skeleton className="size-5 shrink-0 rounded-md" />
                        <Skeleton className="h-2.5 flex-1 rounded" />
                      </div>
                    </SidebarMenuItem>
                  ))
                ) : servers.length === 0 ? (
                  <p className="px-2 py-1 text-[11px] text-sidebar-foreground/50">
                    Aucun serveur — rejoins-en un !
                  </p>
                ) : (
                  servers.map((server) => {
                    const isActive = server.id === activeServerId;
                    const expanded = expandedServers.has(server.id);
                    const channels = channelsMap.get(server.id) ?? [];
                    const unread = serverUnread(server.id);
                    const nodeOnline = onlineNodeIds.has(server.id);
                    const isOwner = (server as any).ownerId === user?.id;

                    const textChannels = channels.filter(
                      (c) => c.type !== 'voice' && c.type !== 'category',
                    );
                    const voiceChannels = channels.filter((c) => c.type === 'voice');

                    return (
                      <ContextMenu key={server.id}>
                        <ContextMenuTrigger asChild>
                          <SidebarMenuItem>
                            <NavButton
                              isActive={isActive}
                              onClick={() => {
                                if (!expanded) {
                                  toggleServer(server.id);
                                  goToServer(server.id);
                                } else {
                                  toggleServer(server.id);
                                }
                              }}
                              className={cn(
                                unread > 0 && !isActive ? 'text-sidebar-foreground' : '',
                              )}
                            >
                              <span className="text-sidebar-foreground/40">
                                {expanded ? (
                                  <ChevronDownIcon size={11} />
                                ) : (
                                  <ChevronRightIcon size={11} />
                                )}
                              </span>
                              <div className="relative shrink-0">
                                <WsMark name={server.name} iconUrl={server.iconUrl} size={20} />
                                {nodeOnline && (
                                  <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-[1.5px] border-sidebar bg-green-500" />
                                )}
                              </div>
                              <span
                                className={cn(
                                  'flex-1 truncate text-[12.5px]',
                                  unread > 0 && !isActive ? 'font-semibold' : 'font-medium',
                                )}
                              >
                                {server.name}
                              </span>
                            </NavButton>
                            {unread > 0 && !isActive && (
                              <SidebarMenuBadge className="bg-destructive/90 text-white">
                                {unread > 99 ? '99+' : unread}
                              </SidebarMenuBadge>
                            )}

                            {/* Expanded channels */}
                            {expanded && (
                              <SidebarMenu className="ml-6 mt-0.5 pb-1">
                                {channels.length === 0 ? (
                                  <li className="px-2 py-1 text-[11px] text-sidebar-foreground/50">
                                    Aucun salon
                                  </li>
                                ) : (
                                  <>
                                    {textChannels.map((ch) => {
                                      const chUnread =
                                        notifStore.unread.get(`channel:${ch.id}`) ?? 0;
                                      const chActive = ch.id === activeChannelId;
                                      const Icon =
                                        CHANNEL_ICON[ch.type] ?? CHANNEL_ICON.default;
                                      return (
                                        <SidebarMenuItem key={ch.id}>
                                          <NavButton
                                            size="sm"
                                            isActive={chActive}
                                            onClick={() =>
                                              router.push(
                                                `/channels/server/${server.id}/${ch.id}`,
                                              )
                                            }
                                            className={cn(
                                              chUnread > 0 && !chActive
                                                ? 'text-sidebar-foreground font-semibold'
                                                : '',
                                            )}
                                          >
                                            <Icon
                                              size={12}
                                              className="text-sidebar-foreground/50 shrink-0"
                                            />
                                            <span className="flex-1 truncate">
                                              {ch.name}
                                            </span>
                                          </NavButton>
                                          {chUnread > 0 && !chActive && (
                                            <SidebarMenuBadge className="bg-destructive/90 text-white text-[9px]">
                                              {chUnread > 99 ? '99+' : chUnread}
                                            </SidebarMenuBadge>
                                          )}
                                        </SidebarMenuItem>
                                      );
                                    })}
                                    {voiceChannels.length > 0 && (
                                      <>
                                        {textChannels.length > 0 && (
                                          <li className="my-1 h-px bg-sidebar-border" />
                                        )}
                                        {voiceChannels.map((ch) => {
                                          const chActive = ch.id === activeChannelId;
                                          return (
                                            <SidebarMenuItem key={ch.id}>
                                              <NavButton
                                                size="sm"
                                                isActive={chActive}
                                                onClick={() =>
                                                  router.push(
                                                    `/channels/server/${server.id}/${ch.id}`,
                                                  )
                                                }
                                                className={chActive ? 'text-green-600' : ''}
                                              >
                                                <Volume2Icon
                                                  size={12}
                                                  className="text-sidebar-foreground/50 shrink-0"
                                                />
                                                <span className="flex-1 truncate">
                                                  {ch.name}
                                                </span>
                                              </NavButton>
                                            </SidebarMenuItem>
                                          );
                                        })}
                                      </>
                                    )}
                                  </>
                                )}
                              </SidebarMenu>
                            )}
                          </SidebarMenuItem>
                        </ContextMenuTrigger>

                        <ContextMenuContent className="min-w-44">
                          <ContextMenuItem
                            onClick={() =>
                              router.push(`/channels/server/${server.id}`)
                            }
                          >
                            Ouvrir le serveur
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() => setSettingsServerId(server.id)}
                          >
                            <SettingsIcon size={13} className="mr-2 opacity-60" />
                            Paramètres
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() => handleCopyInvite(server.id)}
                          >
                            <Link2Icon size={13} className="mr-2 opacity-60" />
                            Copier le lien d&apos;invitation
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() => handleCopyServerId(server.id)}
                          >
                            <CopyIcon size={13} className="mr-2 opacity-60" />
                            Copier l&apos;ID
                          </ContextMenuItem>
                          {isOwner ? (
                            <ContextMenuItem
                              variant="destructive"
                              onClick={() => setDeleteServerId(server.id)}
                            >
                              <Trash2Icon size={13} className="mr-2" />
                              Supprimer le serveur
                            </ContextMenuItem>
                          ) : (
                            <ContextMenuItem
                              variant="destructive"
                              onClick={() => setLeaveServerId(server.id)}
                            >
                              <LogOutIcon size={13} className="mr-2" />
                              Quitter le serveur
                            </ContextMenuItem>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })
                )}

                {/* Discover */}
                {!serversLoading && (
                  <SidebarMenuItem>
                    <NavButton onClick={() => router.push('/channels/discover-server')}>
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-md border border-dashed border-sidebar-border">
                        <CompassIcon size={12} />
                      </div>
                      <span className="flex-1 truncate text-[12.5px] font-medium">
                        Découvrir des serveurs
                      </span>
                    </NavButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* ── User panel ──────────────────────────────────────────────────── */}
        {user && (
          <SidebarFooter className="shrink-0 p-0 border-t border-sidebar-border">
            <UserPanel user={user} />
          </SidebarFooter>
        )}
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      {settingsServerId && (
        <ServerSettingsDialog
          serverId={settingsServerId}
          open={!!settingsServerId}
          onOpenChange={(o) => !o && setSettingsServerId(null)}
          onServerUpdated={() => setSettingsServerId(null)}
        />
      )}

      <AlertDialog
        open={!!leaveServerId}
        onOpenChange={(o) => !o && setLeaveServerId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter le serveur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu devras être réinvité pour rejoindre à nouveau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveServer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Quitter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteServerId}
        onOpenChange={(o) => !o && setDeleteServerId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le serveur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les salons et messages seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteServer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
