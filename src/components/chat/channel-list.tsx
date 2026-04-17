'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  UsersIcon,
  Volume2Icon,
  PlusIcon,
  UsersRoundIcon,
  WifiOffIcon,
  HashIcon,
  MegaphoneIcon,
  ChevronDownIcon,
  SettingsIcon,
  LogOutIcon,
  UserPlusIcon,
  ChevronRightIcon,
  MicIcon,
  MicOffIcon,
  CheckCircle2Icon,
  HandshakeIcon,
  ForumIcon,
  StageIcon,
  GalleryIcon,
  PollIcon,
  SuggestionIcon,
  DocIcon,
  CountingIcon,
  VentIcon,
  ThreadIcon,
  MediaIcon,
  PencilIcon,
  Trash2Icon,
  FileTextIcon,
  XIcon,
} from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import {
  useNotificationStore,
  clearUnread,
  clearChannelUnread,
  pruneUnread,
} from '@/lib/notification-store';
import { conversationsStore } from '@/lib/conversations-store';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogMedia,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from '@/components/ui/tooltip';
import { UserPanel } from '@/components/chat/user-panel';
import { CallBar } from '@/components/chat/call-bar';
import { useTranslation } from '@/components/locale-provider';

import { useVoice, type VoiceParticipant } from '@/hooks/use-voice';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useLayoutPrefs, densityCls } from '@/hooks/use-layout-prefs';
import { cn } from '@/lib/utils';
import { statusColor, isVisibleOnline } from '@/lib/status';

type ChannelType = 'text' | 'voice' | 'announcement' | 'category' | 'forum' | 'stage' | 'gallery' | 'poll' | 'suggestion' | 'doc' | 'counting' | 'vent' | 'thread' | 'media';

const CHANNEL_ICON: Record<string, any> = {
  text: HashIcon,
  announcement: MegaphoneIcon,
  voice: Volume2Icon,
  forum: ForumIcon,
  stage: StageIcon,
  gallery: GalleryIcon,
  poll: PollIcon,
  suggestion: SuggestionIcon,
  doc: DocIcon,
  counting: CountingIcon,
  vent: VentIcon,
  thread: ThreadIcon,
  media: MediaIcon,
};

const CHANNEL_TYPES = [
  { id: 'text',         icon: HashIcon,        label: 'Texte'      },
  { id: 'announcement', icon: MegaphoneIcon,    label: 'Annonce'    },
  { id: 'voice',        icon: Volume2Icon,      label: 'Vocal'      },
  { id: 'forum',        icon: ForumIcon,        label: 'Forum'      },
  { id: 'stage',        icon: StageIcon,        label: 'Scène'      },
  { id: 'gallery',      icon: GalleryIcon,      label: 'Galerie'    },
  { id: 'poll',         icon: PollIcon,         label: 'Sondage'    },
  { id: 'suggestion',   icon: SuggestionIcon,   label: 'Suggestion' },
  { id: 'doc',          icon: DocIcon,          label: 'Document'   },
  { id: 'counting',     icon: CountingIcon,     label: 'Comptage'   },
  { id: 'vent',         icon: VentIcon,         label: 'Défouloir'  },
  { id: 'thread',       icon: ThreadIcon,       label: 'Fil'        },
  { id: 'media',        icon: MediaIcon,        label: 'Média'      },
] as const;

interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  parentId?: string | null;
  position?: number;
}

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

// Toujours rounded-full — forme cohérente avec les autres composants
const presenceDotShape = (_status?: string) => 'rounded-full';
const presenceDot = (status?: string) => statusColor(status);

interface ChannelListProps {
  serverId: string | null;
  selectedChannel: string | null;
  onSelectChannel: (channelId: string | null) => void;
  onOpenSettings?: () => void;
}

// ── Channel row ───────────────────────────────────────────────────────────────

function ChannelRow({
  channel,
  isActive,
  onClick,
  canManage,
  onRename,
  onDelete,
  unreadCount,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
  canManage?: boolean;
  onRename?: (channel: Channel) => void;
  onDelete?: (channel: Channel) => void;
  unreadCount?: number;
}) {
  const { prefs } = useLayoutPrefs();
  const d = densityCls(prefs.density);
  const hasUnread = (unreadCount ?? 0) > 0;
  const btn = (
    <button
      onClick={onClick}
      className={cn(
        'group/ch relative flex w-full items-center rounded-xl font-medium transition-all duration-150',
        d.channelGap, d.channelPx, d.channelPy, d.channelText,
        isActive
          ? 'bg-linear-to-r from-primary/15 to-primary/5 text-primary shadow-sm shadow-primary/10'
          : hasUnread
            ? 'text-foreground hover:bg-foreground/6'
            : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-linear-to-b from-primary to-[#7c3aed]" />
      )}
      {(() => { const Icon = CHANNEL_ICON[channel.type] ?? HashIcon; return <Icon size={d.channelIcon} className={cn('shrink-0 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground/60 group-hover/ch:text-muted-foreground')} />; })()}
      <span className={cn("truncate", hasUnread && !isActive && "font-semibold")}>{channel.name}</span>
      {hasUnread && !isActive && (
        <Badge variant="destructive" className="ml-auto shrink-0 min-w-5 h-5 text-[10px] shadow-sm shadow-destructive/30 ring-2 ring-sidebar">
          {unreadCount! > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </button>
  );

  if (!canManage) return btn;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{btn}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-40">
        <ContextMenuItem onClick={() => onRename?.(channel)}>
          <PencilIcon size={13} className="mr-2 shrink-0 opacity-60" />
          Renommer
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onClick={() => onDelete?.(channel)}>
          <Trash2Icon size={13} className="mr-2 shrink-0" />
          Supprimer
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ── Voice channel row with participants ───────────────────────────────────────

function VoiceChannelRow({
  channel,
  serverId,
  participants,
  currentChannelId,
  onJoin,
  onLeave,
}: {
  channel: Channel;
  serverId: string;
  participants: VoiceParticipant[];
  currentChannelId: string | null;
  onJoin: (serverId: string, channelId: string) => void;
  onLeave: () => void;
}) {
  const isConnected = currentChannelId === channel.id;

  const { prefs } = useLayoutPrefs();
  const d = densityCls(prefs.density);

  return (
    <div>
      <button
        onClick={() => (isConnected ? onLeave() : onJoin(serverId, channel.id))}
        className={cn(
          'group/vc relative flex w-full items-center rounded-xl font-medium transition-all duration-150',
          d.channelGap, d.channelPx, d.channelPy, d.channelText,
          isConnected
            ? 'bg-linear-to-r from-success/15 to-success/5 text-success shadow-sm shadow-success/10'
            : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
        )}
      >
        {isConnected && (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-success" />
        )}
        <Volume2Icon size={d.channelIcon}
          className={cn(
            'shrink-0 transition-colors',
            isConnected ? 'text-success' : 'text-muted-foreground/60 group-hover/vc:text-muted-foreground',
          )} />
        <span className="truncate">{channel.name}</span>
        {participants.length > 0 && (
          <span className="ml-auto text-[10px] font-semibold tabular-nums text-muted-foreground">{participants.length}</span>
        )}
      </button>
      {participants.length > 0 && (
        <div className="ml-6 mt-0.5 space-y-0.5 pb-1">
          {participants.map((p) => (
            <div key={p.userId} className="flex items-center gap-1.5 px-1.5 py-0.5">
              <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-success/25 to-success/10 text-[8px] font-bold text-success ring-1 ring-success/20">
                {p.username?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span className="flex-1 truncate text-[11px] text-muted-foreground">{p.username}</span>
              {p.muted && <MicOffIcon size={10} className="shrink-0 text-destructive" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  label,
  collapsed,
  onToggle,
  canAdd,
  onAdd,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  canAdd: boolean;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="group flex items-center gap-1 px-1 py-1">
      <button
        onClick={onToggle}
        className="font-heading flex flex-1 items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
      >
        <ChevronRightIcon size={11}
          className={cn('shrink-0 transition-transform', !collapsed && 'rotate-90')} />
        {label}
      </button>
      {canAdd && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-4 min-w-0 rounded p-0 text-muted-foreground/40 opacity-0 transition-opacity hover:text-muted-foreground group-hover:opacity-100"
                onClick={(e: any) => {
                  e?.stopPropagation?.();
                  onAdd();
                }}
              >
                <PlusIcon size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t.channelList.createChannel}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChannelList({
  serverId,
  selectedChannel,
  onSelectChannel,
  onOpenSettings,
}: ChannelListProps) {
  const router = useRouter();
  const { user } = useAuth();
  const prevUserIdRef = useRef<string | null>(null);
  const voice = useVoice();
  const { t } = useTranslation();
  const ui = useUIStyle();
  const { prefs } = useLayoutPrefs();
  const d = densityCls(prefs.density);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const conversationsRef = useRef<Conversation[]>([]);
  const [presenceMap, setPresenceMap] = useState<Map<string, string>>(new Map());
  const [customStatusMap, setCustomStatusMap] = useState<Map<string, string | null>>(new Map());

  const [serverName, setServerName] = useState('Serveur');
  const [serverBannerUrl, setServerBannerUrl] = useState<string | null>(null);
  const [serverBadges, setServerBadges] = useState<{ isCertified: boolean; isPartnered: boolean }>({
    isCertified: false,
    isPartnered: false,
  });
  const [nodeOnline, setNodeOnline] = useState<boolean | null>(null);
  const [canManageChannels, setCanManageChannels] = useState(false);
  const [textCollapsed, setTextCollapsed] = useState(false);
  const [voiceCollapsed, setVoiceCollapsed] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState<ChannelType>('text');
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Drag & drop DM list ───────────────────────────────────────────────────
  const dragDmIdRef = useRef<string | null>(null);
  const [draggingDmId, setDraggingDmId] = useState<string | null>(null);
  const [dragOverDmId, setDragOverDmId] = useState<string | null>(null);

  // ── Context menu (clic droit salon) ──────────────────────────────────────
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [confirmDeleteChannel, setConfirmDeleteChannel] = useState<Channel | null>(null);

  // ── Conversations (DM mode) ──────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    // Ne pas charger si pas encore authentifié
    const token = typeof window !== 'undefined' ? localStorage.getItem('alfychat_token') : null;
    if (!token) return;
    try {
      const response = await api.getConversations();
      if (!response.success || !response.data) return;
      const raw = response.data as any[];
      const initialPresence = new Map<string, string>();
      const initialCustomStatus = new Map<string, string | null>();

      const withNames = await Promise.all(
        raw.map(async (conv) => {
          if (conv.type === 'dm' && conv.recipientId) {
            const userRes = await api.getUser(conv.recipientId).catch(() => null);
            if (userRes?.success && userRes.data) {
              const userData = userRes.data as any;
              if (userData.status) initialPresence.set(conv.recipientId, userData.status);
              if (userData.customStatus !== undefined) initialCustomStatus.set(conv.recipientId, userData.customStatus ?? null);
              return {
                id: conv.id,
                type: 'dm' as const,
                recipientId: conv.recipientId,
                recipientName: userData.displayName || userData.username,
                recipientAvatar: userData.avatarUrl,
                lastMessage: conv.lastMessage,
                lastMessageAt: conv.lastMessageAt || conv.updatedAt,
              };
            }
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
      try {
        const savedOrder = JSON.parse(localStorage.getItem('alfychat_dm_order') || '[]') as string[];
        if (savedOrder.length > 0) {
          const orderMap = new Map(savedOrder.map((id, i) => [id, i]));
          sorted = [...sorted].sort((a, b) =>
            (orderMap.has(a.recipientId) ? orderMap.get(a.recipientId)! : sorted.length) -
            (orderMap.has(b.recipientId) ? orderMap.get(b.recipientId)! : sorted.length),
          );
        }
      } catch {}
      // Refresh presence from Redis first, then render — avoids flicker from stale DB status
      const dmRecipientIds = sorted
        .filter((c) => c.type === 'dm')
        .map((c) => c.recipientId)
        .filter(Boolean);

      if (dmRecipientIds.length > 0) {
        socketService.requestBulkPresence(dmRecipientIds, (presence) => {
          // Merge Redis presence over the API-sourced presence
          const finalPresence = new Map(initialPresence);
          const finalCustomStatus = new Map(initialCustomStatus);
          presence.forEach(({ userId, status, customStatus }) => {
            finalPresence.set(userId, status);
            if (customStatus !== undefined) finalCustomStatus.set(userId, customStatus);
          });
          // Purger les notifications fantômes (clés inconnues du localStorage)
          const validKeys = [
            ...sorted.filter(c => c.type === 'dm').map(c => c.recipientId),
            ...sorted.filter(c => c.type === 'group').map(c => `group:${c.id}`),
          ];
          pruneUnread(validKeys);
          // Single batched render: conversations + correct presence at once
          conversationsStore.set(sorted, finalPresence, finalCustomStatus);
          setConversations(sorted);
          setPresenceMap((prev) => { const next = new Map(prev); finalPresence.forEach((v, k) => next.set(k, v)); return next; });
          setCustomStatusMap((prev) => { const next = new Map(prev); finalCustomStatus.forEach((v, k) => next.set(k, v)); return next; });
        });
      } else {
        // Purger les notifications fantômes même sans présence
        const validKeys = [
          ...sorted.filter(c => c.type === 'dm').map(c => c.recipientId),
          ...sorted.filter(c => c.type === 'group').map(c => `group:${c.id}`),
        ];
        pruneUnread(validKeys);
        conversationsStore.set(sorted, initialPresence, initialCustomStatus);
        setConversations(sorted);
        if (initialPresence.size > 0) setPresenceMap((prev) => { const next = new Map(prev); initialPresence.forEach((v, k) => next.set(k, v)); return next; });
        if (initialCustomStatus.size > 0) setCustomStatusMap((prev) => { const next = new Map(prev); initialCustomStatus.forEach((v, k) => next.set(k, v)); return next; });
      }
    } catch (e) {
      console.error('Erreur chargement conversations:', e);
    }
  }, []);

  const loadConversationsRef = useRef(loadConversations);
  useEffect(() => {
    loadConversationsRef.current = loadConversations;
  }, [loadConversations]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Store de notifications (badges non-lus)
  const notifStore = useNotificationStore();

  // ── Channels (server mode) ───────────────────────────────────────────────

  const loadChannels = useCallback(async () => {
    if (!serverId) return;

    socketService.requestServerChannels(serverId, (channels: any) => {
      const raw = Array.isArray(channels) ? channels : channels?.channels || [];
      const chs: Channel[] = raw.map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        parentId: ch.parentId ?? ch.parent_id ?? null,
        position: ch.position ?? 0,
      }));
      setChannels(chs);
    });

    socketService.requestServerInfo(serverId, (data: any) => {
      if (data?.error) return;
      const s = data;
      setServerName(s.name || 'Serveur');
      setServerBannerUrl(s.bannerUrl || s.banner_url || null);

      api
        .getServerBadges(serverId)
        .then((badgeRes) => {
          if (badgeRes.success && badgeRes.data) {
            setServerBadges(badgeRes.data as { isCertified: boolean; isPartnered: boolean });
          }
        })
        .catch(() => {});

      if (user) {
        const MANAGE_CHANNELS = 0x80;
        const ADMIN = 0x40;
        const isOwner = s.ownerId === user.id || s.owner_id === user.id;
        if (isOwner) {
          setCanManageChannels(true);
        } else {
          socketService.requestMembers(serverId, (memberData: any) => {
            const members = memberData?.members || [];
            socketService.requestRoles(serverId, (roleData: any) => {
              const roles = roleData?.roles || [];
              const member = members.find((m: any) => m.userId === user.id || m.user_id === user.id);
              if (member) {
                const roleIds: string[] = Array.isArray(member.roleIds || member.role_ids)
                  ? member.roleIds || member.role_ids
                  : (() => {
                      try {
                        return JSON.parse(member.roleIds || member.role_ids || '[]');
                      } catch {
                        return [];
                      }
                    })();
                const userRoles = roles.filter((r: any) => roleIds.includes(r.id));
                setCanManageChannels(
                  userRoles.some((r: any) => {
                    const perms = r.permissions;
                    if (Array.isArray(perms)) {
                      return perms.includes('ADMIN') || perms.includes('MANAGE_CHANNELS');
                    }
                    const p = typeof perms === 'number' ? perms : parseInt(perms || '0', 10);
                    return (p & ADMIN) !== 0 || (p & MANAGE_CHANNELS) !== 0;
                  }),
                );
              }
            });
          });
        }
      }
    });
  }, [serverId, user]);

  useEffect(() => {
    if (serverId) {
      loadChannels();
    } else {
      // Utiliser le cache global si disponible — pas de re-fetch à la navigation
      if (conversationsStore.isLoaded()) {
        setConversations(conversationsStore.get());
        const cached = conversationsStore.getPresence();
        const cachedCustom = conversationsStore.getCustomStatus();
        if (cached.size > 0) setPresenceMap(new Map(cached));
        if (cachedCustom.size > 0) setCustomStatusMap(new Map(cachedCustom));
      } else {
        loadConversations();
      }
    }
  }, [serverId, loadChannels, loadConversations]);

  // Reload conversations when the user logs in (resolves empty DM list on hard refresh)
  useEffect(() => {
    if (!serverId && user?.id && user.id !== prevUserIdRef.current) {
      prevUserIdRef.current = user.id;
      loadConversations();
    }
  }, [user?.id, serverId, loadConversations]);

  // Snapshot de l'état vocal du serveur à l'ouverture (évite le compteur "0" avant le 1er VOICE_STATE_UPDATE)
  useEffect(() => {
    if (!serverId || !voice) return;
    voice.refreshVoiceState(serverId);
  }, [serverId]);

  // Quand l'utilisateur sélectionne une conversation → vider son compteur non-lu
  useEffect(() => {
    if (!selectedChannel || serverId) return;
    if (selectedChannel.startsWith('dm:')) {
      clearUnread(selectedChannel.replace('dm:', ''));
    } else if (selectedChannel.startsWith('group:')) {
      clearUnread(`group:${selectedChannel.replace('group:', '')}`);
    } else if (selectedChannel !== 'friends') {
      // Cas où selectedChannel = recipientId directement
      clearUnread(selectedChannel);
    }
  }, [selectedChannel, serverId]);

  // Quand l'utilisateur sélectionne un salon serveur → vider son compteur non-lu
  useEffect(() => {
    if (!selectedChannel || !serverId) return;
    clearChannelUnread(selectedChannel, serverId);
  }, [selectedChannel, serverId]);

  // Socket: DM events
  useEffect(() => {
    if (serverId) return;
    const handleMessageNew = (message: any) => {
      const content = message.content || '';
      const convId = message.conversationId;
      const msgAuthorId = message.senderId || message.authorId;
      const msgRecipientId = message.recipientId;
      const createdAt = message.createdAt || new Date().toISOString();
      const isFromMe = msgAuthorId === user?.id;
      setConversations((prev) => {
        const idx = prev.findIndex(
          (c) =>
            c.id === convId ||
            (user && (c.recipientId === msgAuthorId || c.recipientId === msgRecipientId)),
        );
        if (idx === -1) {
          // Conversation inconnue : recharger la liste sans toucher aux compteurs
          loadConversationsRef.current();
          return prev;
        }
        const conv = prev[idx];
        const updated = [...prev];
        updated[idx] = { ...conv, lastMessage: content, lastMessageAt: createdAt };
        const [moved] = updated.splice(idx, 1);
        // Mettre à jour le store global
        conversationsStore.updateLastMessage(moved.id, content, createdAt);
        return [moved, ...updated];
      });
    };
    const handleRefresh = () => loadConversationsRef.current();
    const handlePresence = (data: any) => {
      const payload = data?.payload || data;
      const userId = payload?.userId;
      const status = payload?.status;
      const customStatus = payload?.customStatus;
      if (!userId) return;
      conversationsStore.setPresence(userId, status, customStatus);
      setPresenceMap((prev) => { const next = new Map(prev); next.set(userId, status); return next; });
      if (customStatus !== undefined) setCustomStatusMap((prev) => { const next = new Map(prev); next.set(userId, customStatus); return next; });
    };
    const handleReconnect = () => loadConversationsRef.current();
    socketService.on('message:new', handleMessageNew);
    socketService.onFriendAccepted(handleRefresh);
    socketService.onPresenceUpdate(handlePresence);
    socketService.on('socket:reconnected', handleReconnect);
    return () => {
      socketService.off('message:new', handleMessageNew);
      socketService.off('FRIEND_ACCEPT', handleRefresh);
      socketService.off('PRESENCE_UPDATE', handlePresence);
      socketService.off('socket:reconnected', handleReconnect);
    };
  }, [serverId, user]);

  // Socket: node status
  useEffect(() => {
    if (!serverId) return;
    const handleOnline = (data: any) => {
      if ((data?.payload?.serverId || data?.serverId) === serverId) setNodeOnline(true);
    };
    const handleOffline = (data: any) => {
      if ((data?.payload?.serverId || data?.serverId) === serverId) setNodeOnline(false);
    };
    socketService.onServerNodeOnline(handleOnline);
    socketService.onServerNodeOffline(handleOffline);
    return () => {
      socketService.off('SERVER_NODE_ONLINE', handleOnline);
      socketService.off('SERVER_NODE_OFFLINE', handleOffline);
    };
  }, [serverId]);

  // Socket: channel CRUD + server name
  useEffect(() => {
    if (!serverId) return;
    const handleCreate = (data: any) => {
      const ch = data?.payload || data;
      if (ch?.serverId === serverId || ch?.server_id === serverId) {
        setChannels((prev) =>
          prev.some((c) => c.id === ch.id)
            ? prev
            : [
                ...prev,
                {
                  id: ch.id,
                  name: ch.name,
                  type: ch.type,
                  parentId: ch.parentId || ch.parent_id || null,
                  position: ch.position,
                },
              ],
        );
      }
    };
    const handleUpdate = (data: any) => {
      const ch = data?.payload || data;
      setChannels((prev) => prev.map((c) => (c.id === ch.id ? { ...c, ...ch } : c)));
    };
    const handleDelete = (data: any) => {
      const id = (data?.payload || data)?.channelId || (data?.payload || data)?.id;
      if (id) setChannels((prev) => prev.filter((c) => c.id !== id));
    };
    const handleServerUpdate = (data: any) => {
      const s = data?.payload || data?.updates || data;
      if (s?.id === serverId || s?.serverId === serverId) {
        if (s?.name != null) setServerName(s.name);
        if (s?.bannerUrl !== undefined) setServerBannerUrl(s.bannerUrl || null);
      }
    };
    socketService.onChannelCreate(handleCreate);
    socketService.onChannelUpdate(handleUpdate);
    socketService.onChannelDelete(handleDelete);
    socketService.on('SERVER_UPDATE', handleServerUpdate);
    return () => {
      socketService.off('CHANNEL_CREATE', handleCreate);
      socketService.off('CHANNEL_UPDATE', handleUpdate);
      socketService.off('CHANNEL_DELETE', handleDelete);
      socketService.off('SERVER_UPDATE', handleServerUpdate);
    };
  }, [serverId]);

  const handleCreateChannel = async () => {
    if (!serverId || !createName.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    socketService.createChannel(serverId, {
      name: createName.trim(),
      type: createType,
      ...(createParentId ? { parentId: createParentId } : {}),
    });
    setIsCreating(false);
    setShowCreateChannel(false);
    setCreateName('');
    setCreateType('text');
    setCreateParentId(null);
  };

  const handleLeaveServer = async () => {
    if (!serverId) return;
    socketService.leaveServer(serverId);
    onSelectChannel(null);
  };

  const handleRenameChannel = () => {
    if (!editingChannel || !editChannelName.trim() || !serverId) return;
    socketService.updateChannel(serverId, editingChannel.id, { name: editChannelName.trim() });
    setEditingChannel(null);
  };

  const handleDeleteChannel = () => {
    if (!confirmDeleteChannel || !serverId) return;
    socketService.deleteChannel(serverId, confirmDeleteChannel.id);
    if (selectedChannel === confirmDeleteChannel.id) onSelectChannel(null);
    setConfirmDeleteChannel(null);
  };

  const openCreate = (type: ChannelType, parentId?: string) => {
    setCreateName('');
    setCreateType(type);
    setCreateParentId(parentId || null);
    setCreateError(null);
    setShowCreateChannel(true);
  };

  const textChannels = channels.filter((c) => c.type !== 'voice' && c.type !== 'category');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  const categories = channels
    .filter((c) => c.type === 'category')
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const channelsByCategory = (categoryId: string) =>
    channels
      .filter((c) => c.type !== 'category' && c.parentId === categoryId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const categoryIds = new Set(categories.map((c) => c.id));
  const uncategorizedText = channels.filter(
    (c) => c.type !== 'voice' && c.type !== 'category' && (!c.parentId || !categoryIds.has(c.parentId)),
  );
  const uncategorizedVoice = channels.filter(
    (c) => c.type === 'voice' && (!c.parentId || !categoryIds.has(c.parentId)),
  );

  const hasCategories = categories.length > 0;

  // ── DM mode ──────────────────────────────────────────────────────────────

  if (!serverId) {
    const dmConversations = conversations.filter((c) => c.type !== 'group');

    return (
      <div className={`flex h-full w-full flex-col overflow-hidden ${ui.sidebarBg}`}>
        {/* ── Header ── */}
        <div className={`flex ${d.headerH} shrink-0 items-center px-4 ${ui.header}`}>
          <span className={`${d.channelText} font-heading tracking-tight text-foreground`}>{t.channelList.messagesTitle}</span>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-0.5 p-2">

            {/* ── Nav buttons ── */}
            <button
              data-tour="friends"
              onClick={() => onSelectChannel('friends')}
              className={cn(
                `group/nav flex w-full items-center ${d.channelGap} rounded-xl ${d.channelPx} ${d.channelPy} ${d.channelText} font-semibold transition-all duration-150`,
                selectedChannel === 'friends'
                  ? 'bg-linear-to-r from-primary/15 to-primary/5 text-primary shadow-sm shadow-primary/10'
                  : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
              )}
            >
              <div className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-lg transition-all',
                selectedChannel === 'friends'
                  ? 'bg-linear-to-br from-primary/25 to-[#7c3aed]/15 text-primary ring-1 ring-primary/30'
                  : 'bg-foreground/5 text-muted-foreground group-hover/nav:bg-foreground/10',
              )}>
                <UsersIcon size={14} />
              </div>
              <span>Amis</span>
            </button>

            <button
              onClick={() => router.push('/channels/me/changelogs')}
              className={cn(
                `group/nav flex w-full items-center ${d.channelGap} rounded-xl ${d.channelPx} ${d.channelPy} ${d.channelText} font-semibold transition-all duration-150`,
                selectedChannel === 'changelogs'
                  ? 'bg-linear-to-r from-primary/15 to-primary/5 text-primary shadow-sm shadow-primary/10'
                  : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
              )}
            >
              <div className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-lg transition-all',
                selectedChannel === 'changelogs'
                  ? 'bg-linear-to-br from-primary/25 to-[#7c3aed]/15 text-primary ring-1 ring-primary/30'
                  : 'bg-foreground/5 text-muted-foreground group-hover/nav:bg-foreground/10',
              )}>
                <FileTextIcon size={14} />
              </div>
              <span>{t.channelList.changelogs}</span>
            </button>
              <button
              onClick={() => router.push('/channels/hosting')}
              className={cn(
                `group/nav flex w-full items-center ${d.channelGap} rounded-xl ${d.channelPx} ${d.channelPy} ${d.channelText} font-semibold transition-all duration-150`,
                selectedChannel === 'hosting'
                  ? 'bg-linear-to-r from-primary/15 to-primary/5 text-primary shadow-sm shadow-primary/10'
                  : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
              )}
            >
              <div className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-lg transition-all',
                selectedChannel === 'hosting'
                  ? 'bg-linear-to-br from-primary/25 to-[#7c3aed]/15 text-primary ring-1 ring-primary/30'
                  : 'bg-foreground/5 text-muted-foreground group-hover/nav:bg-foreground/10',
              )}>
                <FileTextIcon size={14} />
              </div>
              <span>{t.channelList.hosting}</span>
            </button>
            <div className="px-1 py-1.5">
              <Separator />
            </div>

            {/* ── Messages privés ── */}
            <div data-section="dm-list" className="mx-0.5 mt-0.5 rounded-xl  p-1.5 transition-all">
              <div className="mb-1 flex items-center justify-between px-2 pt-1">
                <p data-tour="conversations" className="font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
                  {t.channelList.directMessages}
                </p>
              </div>
              {dmConversations.length === 0 ? (
                <p className="px-3 py-3 text-center text-[11px] text-muted-foreground/40">{t.channelList.noConversations}</p>
              ) : (
                <div className="space-y-0.5">
                  {dmConversations.map((conv) => {
                    const isActive =
                      selectedChannel === conv.recipientId ||
                      selectedChannel === `dm:${conv.recipientId}`;
                    const dmUnread = notifStore.unread.get(conv.recipientId) ?? 0;
                    const presence = presenceMap.get(conv.recipientId);
                    return (
                      <div
                        key={conv.id}
                        draggable
                        onDragStart={(e) => {
                          dragDmIdRef.current = conv.recipientId;
                          setDraggingDmId(conv.recipientId);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragDmIdRef.current !== conv.recipientId) setDragOverDmId(conv.recipientId);
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDmId(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const from = dragDmIdRef.current;
                          if (!from || from === conv.recipientId) { setDragOverDmId(null); return; }
                          setConversations((prev) => {
                            const arr = [...prev];
                            const fromIdx = arr.findIndex((c) => c.recipientId === from);
                            const toIdx = arr.findIndex((c) => c.recipientId === conv.recipientId);
                            if (fromIdx === -1 || toIdx === -1) return prev;
                            const [item] = arr.splice(fromIdx, 1);
                            arr.splice(toIdx, 0, item);
                            try { localStorage.setItem('alfychat_dm_order', JSON.stringify(arr.map((c) => c.recipientId))); } catch {}
                            return arr;
                          });
                          dragDmIdRef.current = null;
                          setDraggingDmId(null);
                          setDragOverDmId(null);
                        }}
                        onDragEnd={() => { dragDmIdRef.current = null; setDraggingDmId(null); setDragOverDmId(null); }}
                        className={cn(
                          'transition-all duration-150',
                          draggingDmId === conv.recipientId && 'opacity-40 scale-95',
                          dragOverDmId === conv.recipientId && draggingDmId !== conv.recipientId && 'translate-y-0.5',
                        )}
                      >
                      <button
                        onClick={() => router.push(`/channels/me/${conv.recipientId}`)}
                        className={cn(
                          `group/dm flex w-full items-center ${d.rowGap} rounded-xl ${d.rowPx} ${d.rowPy} transition-all duration-150`,
                          isActive
                            ? 'bg-linear-to-r from-primary/15 to-primary/5 text-primary shadow-sm shadow-primary/10'
                            : 'text-foreground hover:bg-foreground/6',
                          dragOverDmId === conv.recipientId && 'ring-1 ring-primary/30',
                        )}
                      >
                        <div className="relative shrink-0">
                          <Avatar className={cn(`${d.rowAvatar} ring-2 transition-all`, isActive ? 'ring-primary/40' : 'ring-transparent group-hover/dm:ring-border/40')}>
                            <AvatarImage src={conv.recipientAvatar ? resolveMediaUrl(conv.recipientAvatar) : undefined} />
                            <AvatarFallback className={cn('text-[11px] font-semibold', isActive ? 'bg-linear-to-br from-primary/25 to-[#7c3aed]/15 text-primary' : 'bg-linear-to-br from-primary/15 to-[#7c3aed]/10 text-primary/80')}>
                              {conv.recipientName?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className={cn(
                            'absolute -bottom-0.5 -right-0.5 size-2.5 ring-[1.5px] ring-sidebar',
                            presenceDotShape(presence),
                            presenceDot(presence),
                          )} />
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <p className={cn(`truncate ${d.rowName} font-medium leading-tight`, isActive ? 'text-primary' : 'text-foreground')}>
                            {conv.recipientName || t.channelList.user}
                          </p>
                          {customStatusMap.get(conv.recipientId) ? (
                            <p className={`truncate ${d.rowSub} text-muted-foreground/50 leading-tight`}>
                              {customStatusMap.get(conv.recipientId)}
                            </p>
                          ) : (
                            <p className={`${d.rowSub} text-muted-foreground/40 leading-tight`}>
                              {presence === 'online' ? 'En ligne' : presence === 'idle' ? 'Absent' : presence === 'dnd' ? 'Ne pas déranger' : presence === 'invisible' ? 'Invisible' : 'Hors ligne'}
                            </p>
                          )}
                        </div>
                        {dmUnread > 0 && (
                          <Badge variant="destructive" className="ml-auto shrink-0 min-w-5 h-5 text-[10px] shadow-sm shadow-destructive/30 ring-2 ring-sidebar">
                            {dmUnread}
                          </Badge>
                        )}
                      </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <CallBar />
        {user && <UserPanel user={user} />}


      </div>
    );
  }

  // ── Server mode ───────────────────────────────────────────────────────────

  return (
    <div className={`flex h-full w-full flex-col overflow-hidden ${ui.sidebarBg}`}>
      {/* Server banner */}
      {serverBannerUrl ? (
        <div className="relative h-20 w-full shrink-0 overflow-hidden">
          <img src={resolveMediaUrl(serverBannerUrl)} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/30 to-transparent" />
        </div>
      ) : null}

      {/* Server name header with dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className={`flex h-11 w-full items-center justify-between px-3 font-heading tracking-tight transition-all duration-150 hover:bg-foreground/6 ${ui.isGlass ? 'border-b border-border/40 bg-background/60' : 'border-b border-border/40 bg-sidebar/80'}`}>
          <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[13px]">
            <span className="truncate">{serverName}</span>
            {serverBadges.isCertified && (
              <CheckCircle2Icon size={14} className="shrink-0 text-blue-400" />
            )}
            {serverBadges.isPartnered && (
              <HandshakeIcon size={14} className="shrink-0 text-violet-400" />
            )}
          </span>
          <ChevronDownIcon size={14} className="shrink-0 text-muted-foreground/50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuItem className="gap-2" onClick={() => onOpenSettings?.()}>
            <SettingsIcon size={15} />
            {t.channelList.serverSettings}
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            <UserPlusIcon size={15} />
            {t.channelList.inviteMembers}
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => handleLeaveServer()}>
            <LogOutIcon size={15} />
            {t.serverList.leaveServer}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Node offline banner */}
      {nodeOnline === false && (
        <div className="flex items-center gap-1.5 border-b border-amber-500/20 bg-linear-to-r from-amber-500/15 to-amber-500/5 px-3 py-1.5 text-[11px] font-medium text-amber-400">
          <WifiOffIcon size={11} className="shrink-0" />
          {t.channelList.nodeOffline}
        </div>
      )}

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-2  ">
          {hasCategories ? (
            <>
              {uncategorizedText.map((channel) => (
                <ChannelRow
                  key={channel.id}
                  channel={channel}
                  isActive={selectedChannel === channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  canManage={canManageChannels}
                  onRename={(ch) => { setEditingChannel(ch); setEditChannelName(ch.name); }}
                  onDelete={(ch) => setConfirmDeleteChannel(ch)}
                  unreadCount={notifStore.unread.get(`channel:${channel.id}`) ?? 0}
                />
              ))}
              {uncategorizedVoice.map((channel) => (
                <VoiceChannelRow
                  key={channel.id}
                  channel={channel}
                  serverId={serverId!}
                  participants={voice?.getChannelParticipants(channel.id) || []}
                  currentChannelId={voice?.currentChannelId || null}
                  onJoin={(sid, cid) => voice?.joinChannel(sid, cid)}
                  onLeave={() => voice?.leaveChannel()}
                />
              ))}

              {categories.map((cat) => {
                const isCatCollapsed = collapsedCategories.has(cat.id);
                const catChannels = channelsByCategory(cat.id);
                const catText = catChannels.filter((c) => c.type !== 'voice');
                const catVoice = catChannels.filter((c) => c.type === 'voice');
                return (
                  <div key={cat.id} className="mt-3">
                    <SectionHeader
                      label={cat.name}
                      collapsed={isCatCollapsed}
                      onToggle={() =>
                        setCollapsedCategories((prev) => {
                          const next = new Set(prev);
                          if (next.has(cat.id)) next.delete(cat.id);
                          else next.add(cat.id);
                          return next;
                        })
                      }
                      canAdd={canManageChannels}
                      onAdd={() => openCreate('text', cat.id)}
                    />
                    {!isCatCollapsed && (
                      <>
                        {catText.map((channel) => (
                          <ChannelRow
                            key={channel.id}
                            channel={channel}
                            isActive={selectedChannel === channel.id}
                            onClick={() => onSelectChannel(channel.id)}
                            canManage={canManageChannels}
                            onRename={(ch) => { setEditingChannel(ch); setEditChannelName(ch.name); }}
                            onDelete={(ch) => setConfirmDeleteChannel(ch)}
                            unreadCount={notifStore.unread.get(`channel:${channel.id}`) ?? 0}
                          />
                        ))}
                        {catVoice.map((channel) => (
                          <VoiceChannelRow
                            key={channel.id}
                            channel={channel}
                            serverId={serverId!}
                            participants={voice?.getChannelParticipants(channel.id) || []}
                            currentChannelId={voice?.currentChannelId || null}
                            onJoin={(sid, cid) => voice?.joinChannel(sid, cid)}
                            onLeave={() => voice?.leaveChannel()}
                          />
                        ))}
                        {catChannels.length === 0 && canManageChannels && (
                          <p className="px-2 py-1 text-xs text-muted-foreground/60">Catégorie vide</p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {canManageChannels && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full gap-1 font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40 hover:text-muted-foreground"
                  onClick={() => openCreate('category')}
                >
                  <PlusIcon size={11} />
                  {t.channelList.newCategory}
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="mb-1">
                <SectionHeader
                  label={t.channelList.textChannels}
                  collapsed={textCollapsed}
                  onToggle={() => setTextCollapsed((v) => !v)}
                  canAdd={canManageChannels}
                  onAdd={() => openCreate('text')}
                />
                {!textCollapsed &&
                  textChannels.map((channel) => (
                    <ChannelRow
                      key={channel.id}
                      channel={channel}
                      isActive={selectedChannel === channel.id}
                      onClick={() => onSelectChannel(channel.id)}
                      canManage={canManageChannels}
                      onRename={(ch) => { setEditingChannel(ch); setEditChannelName(ch.name); }}
                      onDelete={(ch) => setConfirmDeleteChannel(ch)}
                      unreadCount={notifStore.unread.get(`channel:${channel.id}`) ?? 0}
                    />
                  ))}
              </div>

              {(voiceChannels.length > 0 || canManageChannels) && (
                <div className="mt-3">
                  <SectionHeader
                    label={t.channelList.voiceChannels}
                    collapsed={voiceCollapsed}
                    onToggle={() => setVoiceCollapsed((v) => !v)}
                    canAdd={canManageChannels}
                    onAdd={() => openCreate('voice')}
                  />
                  {!voiceCollapsed &&
                    voiceChannels.map((channel) => (
                      <VoiceChannelRow
                        key={channel.id}
                        channel={channel}
                        serverId={serverId!}
                        participants={voice?.getChannelParticipants(channel.id) || []}
                        currentChannelId={voice?.currentChannelId || null}
                        onJoin={(sid, cid) => voice?.joinChannel(sid, cid)}
                        onLeave={() => voice?.leaveChannel()}
                      />
                    ))}
                </div>
              )}

              {canManageChannels && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full gap-1 font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40 hover:text-muted-foreground"
                  onClick={() => openCreate('category')}
                >
                  <PlusIcon size={11} />
                  {t.channelList.newCategory}
                </Button>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      <CallBar />
      {user && <UserPanel user={user} />}

      {/* Modal : Créer un salon / une catégorie */}
      <Dialog
        open={showCreateChannel}
        onOpenChange={(open) => {
          setShowCreateChannel(open);
          if (!open) setCreateParentId(null);
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-sm">
            <DialogHeader className="sr-only">
              <DialogTitle>
                {createType === 'category'
                  ? t.channelList.createModal.createCategory
                  : t.channelList.createModal.createChannel}
              </DialogTitle>
            </DialogHeader>
            {/* Header */}
            <div className="flex items-start gap-3 border-b border-border/20 px-6 py-5 pr-12">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-[#7c3aed]/10 ring-1 ring-primary/25 shadow-sm shadow-primary/10">
                {(() => { const Icon = CHANNEL_ICON[createType] ?? HashIcon; return <Icon size={18} className="text-primary" />; })()}
              </div>
              <div>
                <h2 className="font-heading text-[15px] tracking-tight">
                  {createType === 'category'
                    ? t.channelList.createModal.createCategory
                    : t.channelList.createModal.createChannel}
                </h2>
                <p className="text-[11px] text-muted-foreground/60">
                  {createParentId
                    ? <>{t.channelList.createModal.inCategory}{' '}<span className="font-medium text-foreground">{categories.find((c) => c.id === createParentId)?.name}</span></>
                    : createType === 'category'
                      ? 'Organisez vos salons'
                      : 'Choisissez un type et un nom'}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-5 px-6 py-5">
              {createType !== 'category' && (
                <div className="space-y-2">
                <label className="text-[13px] font-semibold">{t.channelList.createModal.type}</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CHANNEL_TYPES.map((ct) => {
                      const isSelected = createType === ct.id;
                      return (
                        <button
                          key={ct.id}
                          type="button"
                          onClick={() => setCreateType(ct.id as ChannelType)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-[10px] font-semibold transition-all duration-150',
                            isSelected
                              ? 'border-primary/50 bg-linear-to-br from-primary/15 to-[#7c3aed]/10 text-primary shadow-sm shadow-primary/10'
                              : 'border-border/40 bg-foreground/[0.03] text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground',
                          )}
                        >
                          <ct.icon size={15} />
                          {ct.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[13px] font-semibold">
                  {createType === 'category'
                    ? t.channelList.createModal.categoryName
                    : t.channelList.createModal.channelName}
                </label>
                <Input
                  placeholder={
                    createType === 'category'
                      ? t.channelList.createModal.categoryPlaceholder
                      : createType === 'voice'
                        ? t.channelList.createModal.voicePlaceholder
                        : t.channelList.createModal.textPlaceholder
                  }
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateChannel();
                  }}
                  autoFocus
                />
              </div>

              {createError && (
                <p className="text-[13px] text-danger">{createError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border/30 bg-foreground/[0.02] px-6 py-4">
              <Button variant="secondary" onClick={() => setShowCreateChannel(false)}>
                {t.common.cancel}
              </Button>
              <Button onClick={handleCreateChannel} disabled={isCreating || !createName.trim()}>
                {isCreating && <Spinner size="sm" />}
                {isCreating ? t.common.creating : t.common.create}
              </Button>
            </div>
          </DialogContent>
      </Dialog>

      {/* ── Modale : Renommer un salon ────────────────────────────────── */}
      <Dialog
        open={!!editingChannel}
        onOpenChange={(open) => { if (!open) setEditingChannel(null); }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Renommer le salon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editChannelName}
              onChange={(e) => setEditChannelName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameChannel(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditingChannel(null)}>Annuler</Button>
            <Button onClick={handleRenameChannel} disabled={!editChannelName.trim()}>Renommer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modale : Confirmer suppression ───────────────────────────── */}
      <AlertDialog
        open={!!confirmDeleteChannel}
        onOpenChange={(open) => { if (!open) setConfirmDeleteChannel(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash2Icon size={20} className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Supprimer le salon</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <span className="font-semibold text-foreground">#{confirmDeleteChannel?.name}</span> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteChannel}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
