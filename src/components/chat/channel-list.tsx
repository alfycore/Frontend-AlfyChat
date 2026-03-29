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
} from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import {
  useNotificationStore,
  clearUnread,
  incrementUnread,
  isDMActive,
  isGroupActive,
} from '@/lib/notification-store';
import {
  Avatar,
  Button,
  Chip,
  CloseButton,
  Dropdown,
  InputGroup,
  Label,
  Modal,
  ScrollShadow,
  Separator,
  Spinner,
  Tooltip,
} from '@heroui/react';
import { UserPanel } from '@/components/chat/user-panel';
import { useTranslation } from '@/components/locale-provider';
import { GroupCreateDialog } from '@/components/chat/group-create-dialog';
import { useVoice, type VoiceParticipant } from '@/hooks/use-voice';
import { useUIStyle } from '@/hooks/use-ui-style';
import { cn } from '@/lib/utils';

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

const PRESENCE_DOT: Record<string, string> = {
  online:    'bg-green-500',
  idle:      'bg-orange-500',
  dnd:       'bg-red-500',
  offline:   'bg-[var(--muted)]/40',
  invisible: 'bg-[var(--muted)]/40',
};
// idle and dnd show as squares, others as circles
const presenceDotShape = (status?: string) =>
  status === 'dnd' || status === 'idle' ? 'rounded-sm' : 'rounded-full';
const presenceDot = (status?: string) => PRESENCE_DOT[status ?? 'offline'] ?? PRESENCE_DOT.offline;

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
  onContextMenu,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
  canManage?: boolean;
  onContextMenu?: (e: React.MouseEvent, channel: Channel) => void;
}) {
  return (
    <button
      onClick={onClick}
      onContextMenu={canManage ? (e) => { e.preventDefault(); onContextMenu?.(e, channel); } : undefined}
      className={cn(
        'group relative flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-[13px] font-medium transition-colors',
        isActive
          ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
          : 'text-[var(--muted)] hover:bg-[var(--surface-secondary)]/70 hover:text-[var(--foreground)]',
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent)]" />
      )}
      {(() => { const Icon = CHANNEL_ICON[channel.type] ?? HashIcon; return <Icon size={14} className={cn('shrink-0 transition-colors', isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]/60 group-hover:text-[var(--muted)]')} />; })()}
      <span className="truncate">{channel.name}</span>
    </button>
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

  return (
    <div>
      <button
        onClick={() => (isConnected ? onLeave() : onJoin(serverId, channel.id))}
        className={cn(
          'group relative flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-[13px] font-medium transition-colors',
          isConnected
            ? 'bg-green-500/10 text-green-400'
            : 'text-[var(--muted)] hover:bg-[var(--surface-secondary)]/70 hover:text-[var(--foreground)]',
        )}
      >
        {isConnected && (
          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-green-400" />
        )}
        <Volume2Icon size={14}
          className={cn(
            'shrink-0 transition-colors',
            isConnected ? 'text-green-400' : 'text-[var(--muted)]/60 group-hover:text-[var(--muted)]',
          )} />
        <span className="truncate">{channel.name}</span>
        {participants.length > 0 && (
          <span className="ml-auto text-[10px] font-semibold text-[var(--muted)]">{participants.length}</span>
        )}
      </button>
      {participants.length > 0 && (
        <div className="ml-6 mt-0.5 space-y-0.5 pb-1">
          {participants.map((p) => (
            <div key={p.userId} className="flex items-center gap-1.5 px-1.5 py-0.5">
              <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-[8px] font-bold text-green-400">
                {p.username?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span className="flex-1 truncate text-[11px] text-[var(--muted)]">{p.username}</span>
              {p.muted && <MicOffIcon size={10} className="shrink-0 text-red-400" />}
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
        className="flex flex-1 items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50 transition-colors hover:text-[var(--muted)]"
      >
        <ChevronRightIcon size={11}
          className={cn('shrink-0 transition-transform', !collapsed && 'rotate-90')} />
        {label}
      </button>
      {canAdd && (
        <Tooltip delay={0}>
          <Button
            variant="ghost"
            isIconOnly
            size="sm"
            className="size-4 min-w-0 rounded p-0 text-[var(--muted)]/40 opacity-0 transition-opacity hover:text-[var(--muted)] group-hover:opacity-100"
            onPress={(e: any) => {
              e?.stopPropagation?.();
              onAdd();
            }}
          >
            <PlusIcon size={13} />
          </Button>
          <Tooltip.Content placement="right">{t.channelList.createChannel}</Tooltip.Content>
        </Tooltip>
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
  const voice = useVoice();
  const { t } = useTranslation();
  const ui = useUIStyle();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [presenceMap, setPresenceMap] = useState<Map<string, string>>(new Map());
  const [customStatusMap, setCustomStatusMap] = useState<Map<string, string | null>>(new Map());
  const [showGroupCreate, setShowGroupCreate] = useState(false);
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
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; channel: Channel } | null>(null);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [confirmDeleteChannel, setConfirmDeleteChannel] = useState<Channel | null>(null);

  // ── Conversations (DM mode) ──────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
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
      setConversations(sorted);
      if (initialPresence.size > 0) setPresenceMap((prev) => { const next = new Map(prev); initialPresence.forEach((v, k) => next.set(k, v)); return next; });
      if (initialCustomStatus.size > 0) setCustomStatusMap((prev) => { const next = new Map(prev); initialCustomStatus.forEach((v, k) => next.set(k, v)); return next; });
    } catch (e) {
      console.error('Erreur chargement conversations:', e);
    }
  }, []);

  const loadConversationsRef = useRef(loadConversations);
  useEffect(() => {
    loadConversationsRef.current = loadConversations;
  }, [loadConversations]);

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
      loadConversations();
    }
  }, [serverId, loadChannels, loadConversations]);

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

  // Socket: DM events
  useEffect(() => {
    if (serverId) return;
    const handleMessageNew = (message: any) => {
      const content = message.content || '';
      const convId = message.conversationId;
      const msgAuthorId = message.senderId || message.authorId;
      const msgRecipientId = message.recipientId;
      const createdAt = message.createdAt || new Date().toISOString();
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
      setPresenceMap((prev) => { const next = new Map(prev); next.set(userId, status); return next; });
      if (customStatus !== undefined) setCustomStatusMap((prev) => { const next = new Map(prev); next.set(userId, customStatus); return next; });
    };
    socketService.on('message:new', handleMessageNew);
    socketService.onGroupCreate(handleRefresh);
    socketService.onFriendAccepted(handleRefresh);
    socketService.onGroupLeave(handleRefresh);
    socketService.onGroupDelete(handleRefresh);
    socketService.onGroupMemberAdd(handleRefresh);
    socketService.onGroupMemberRemove(handleRefresh);
    socketService.onPresenceUpdate(handlePresence);
    return () => {
      socketService.off('message:new', handleMessageNew);
      socketService.off('GROUP_CREATE', handleRefresh);
      socketService.off('FRIEND_ACCEPT', handleRefresh);
      socketService.off('GROUP_LEAVE', handleRefresh);
      socketService.off('GROUP_DELETE', handleRefresh);
      socketService.off('GROUP_MEMBER_ADD', handleRefresh);
      socketService.off('GROUP_MEMBER_REMOVE', handleRefresh);
      socketService.off('PRESENCE_UPDATE', handlePresence);
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

  // ── Context menu handlers ─────────────────────────────────────────────────

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [ctxMenu]);

  const handleOpenCtxMenu = useCallback((e: React.MouseEvent, channel: Channel) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, channel });
  }, []);

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
    const groupConversations = conversations.filter((c) => c.type === 'group');

    return (
      <div className={`flex h-full w-full flex-col overflow-hidden ${ui.sidebarBg}`}>
        {/* ── Header ── */}
        <div className={`flex h-13 shrink-0 items-center justify-between px-3 ${ui.header}`}>
          <span className="text-[13px] font-bold tracking-tight text-[var(--foreground)]">{t.channelList.messagesTitle}</span>
          <Tooltip delay={0}>
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              className="size-7 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)]"
              onPress={() => setShowGroupCreate(true)}
            >
              <PlusIcon size={15} />
            </Button>
            <Tooltip.Content>{t.channelList.createGroup}</Tooltip.Content>
          </Tooltip>
        </div>

        <ScrollShadow className="flex-1 overflow-y-auto">
          <div className="space-y-0.5 p-2">

            {/* ── Nav buttons ── */}
            <button
              data-tour="friends"
              onClick={() => onSelectChannel('friends')}
              className={cn(
                'group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition-all duration-150',
                selectedChannel === 'friends'
                  ? 'bg-[var(--accent)]/12 text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:bg-[var(--surface-secondary)]/60 hover:text-[var(--foreground)]',
              )}
            >
              <div className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-lg transition-all',
                selectedChannel === 'friends'
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                  : 'bg-[var(--surface-secondary)]/80 text-[var(--muted)] group-hover:bg-[var(--surface-secondary)]',
              )}>
                <UsersIcon size={14} />
              </div>
              <span>Amis</span>
            </button>

            <button
              onClick={() => router.push('/channels/me/changelogs')}
              className={cn(
                'group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition-all duration-150',
                selectedChannel === 'changelogs'
                  ? 'bg-[var(--accent)]/12 text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:bg-[var(--surface-secondary)]/60 hover:text-[var(--foreground)]',
              )}
            >
              <div className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-lg transition-all',
                selectedChannel === 'changelogs'
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                  : 'bg-[var(--surface-secondary)]/80 text-[var(--muted)] group-hover:bg-[var(--surface-secondary)]',
              )}>
                <FileTextIcon size={14} />
              </div>
              <span>Changelogs</span>
            </button>

            <div className="px-1 py-1.5">
              <Separator />
            </div>

            {/* ── Groupes ── */}
            {groupConversations.length > 0 && (
              <div data-tour="groups" className="mb-1">
                <div className="mb-1.5 flex items-center gap-1.5 px-2 pt-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">
                    {t.channelList.groups}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {groupConversations.map((conv) => {
                    const isActive = selectedChannel === `group:${conv.id}`;
                    const groupUnread = notifStore.unread.get(`group:${conv.id}`) ?? 0;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => onSelectChannel(isActive ? null : `group:${conv.id}`)}
                        className={cn(
                          'group flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-[13px] font-medium transition-all duration-150',
                          isActive
                            ? 'bg-[var(--accent)]/12 text-[var(--accent)]'
                            : 'text-[var(--muted)] hover:bg-[var(--surface-secondary)]/60 hover:text-[var(--foreground)]',
                        )}
                      >
                        <div className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-xl transition-all',
                          isActive
                            ? 'bg-indigo-500/20 text-indigo-400 shadow-sm shadow-indigo-500/20'
                            : 'bg-indigo-500/10 text-indigo-400/70 group-hover:bg-indigo-500/15 group-hover:text-indigo-400',
                        )}>
                          <UsersRoundIcon size={15} />
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate text-[13px] font-medium leading-tight">{conv.recipientName}</p>
                          <p className="text-[10px] text-[var(--muted)]/50 leading-tight">
                            {conv.participants?.length ?? 0} membres
                          </p>
                        </div>
                        {groupUnread > 0 && (
                          <Chip color="danger" size="sm" className="ml-auto shrink-0 min-w-5 h-5 text-[10px]">
                            {groupUnread}
                          </Chip>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="px-1 py-1.5">
                  <Separator />
                </div>
              </div>
            )}

            {/* ── Messages privés ── */}
            <div data-section="dm-list" className="mx-0.5 mt-0.5 rounded-xl  p-1.5 transition-all">
              <div className="mb-1 flex items-center justify-between px-2 pt-1">
                <p data-tour="conversations" className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">
                  {t.channelList.directMessages}
                </p>
              </div>
              {dmConversations.length === 0 ? (
                <p className="px-3 py-3 text-center text-[11px] text-[var(--muted)]/40">{t.channelList.noConversations}</p>
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
                          'group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 transition-all duration-150',
                          isActive
                            ? 'bg-[var(--accent)]/12 text-[var(--accent)]'
                            : 'text-[var(--foreground)] hover:bg-[var(--surface-secondary)]/60',
                          dragOverDmId === conv.recipientId && 'ring-1 ring-[var(--accent)]/30',
                        )}
                      >
                        <div className="relative shrink-0">
                          <Avatar className={cn('size-8 ring-2 transition-all', isActive ? 'ring-[var(--accent)]/30' : 'ring-transparent group-hover:ring-[var(--border)]/30')}>
                            <Avatar.Image src={conv.recipientAvatar ? resolveMediaUrl(conv.recipientAvatar) : undefined} />
                            <Avatar.Fallback className={cn('text-[11px] font-semibold', isActive ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-[var(--surface-secondary)]')}>
                              {conv.recipientName?.[0]?.toUpperCase() || '?'}
                            </Avatar.Fallback>
                          </Avatar>
                          <span className={cn(
                            'absolute -bottom-0.5 -right-0.5 size-2.5 ring-[1.5px] ring-[var(--background)]',
                            presenceDotShape(presence),
                            presenceDot(presence),
                          )} />
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <p className={cn('truncate text-[13px] font-medium leading-tight', isActive ? 'text-[var(--accent)]' : 'text-[var(--foreground)]')}>
                            {conv.recipientName || t.channelList.user}
                          </p>
                          {customStatusMap.get(conv.recipientId) ? (
                            <p className="truncate text-[10px] text-[var(--muted)]/50 leading-tight">
                              {customStatusMap.get(conv.recipientId)}
                            </p>
                          ) : (
                            <p className="text-[10px] text-[var(--muted)]/40 leading-tight capitalize">
                              {presence ?? 'hors ligne'}
                            </p>
                          )}
                        </div>
                        {dmUnread > 0 && (
                          <Chip color="danger" size="sm" className="ml-auto shrink-0 min-w-5 h-5 text-[10px]">
                            {dmUnread}
                          </Chip>
                        )}
                      </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollShadow>

        {user && <UserPanel user={user} />}

        <GroupCreateDialog
          open={showGroupCreate}
          onOpenChange={setShowGroupCreate}
          onCreated={(groupId) => {
            loadConversations();
            if (groupId) onSelectChannel(`group:${groupId}`);
          }}
        />
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
      <Dropdown>
        <Dropdown.Trigger className={`flex h-11 w-full items-center justify-between px-3 font-semibold transition-colors hover:bg-surface-secondary/60 ${ui.isGlass ? 'border-b border-[var(--border)]/40 bg-[var(--background)]/60' : 'border-b border-[var(--border)] bg-[var(--surface-secondary)]'}`}>
          <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[13px]">
            <span className="truncate">{serverName}</span>
            {serverBadges.isCertified && (
              <CheckCircle2Icon size={14} className="shrink-0 text-blue-400" />
            )}
            {serverBadges.isPartnered && (
              <HandshakeIcon size={14} className="shrink-0 text-violet-400" />
            )}
          </span>
          <ChevronDownIcon size={14} className="shrink-0 text-muted/50" />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom start" className="w-56">
          <Dropdown.Menu
            aria-label="Server menu"
            onAction={(key) => {
              if (key === 'settings') onOpenSettings?.();
              else if (key === 'leave') handleLeaveServer();
            }}
          >
            <Dropdown.Item id="settings" className="gap-2">
              <SettingsIcon size={15} />
              {t.channelList.serverSettings}
            </Dropdown.Item>
            <Dropdown.Item id="invite" className="gap-2">
              <UserPlusIcon size={15} />
              {t.channelList.inviteMembers}
            </Dropdown.Item>
            <Dropdown.Item id="leave" className="gap-2 text-red-500">
              <LogOutIcon size={15} />
              {t.serverList.leaveServer}
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      {/* Node offline banner */}
      {nodeOnline === false && (
        <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 text-[11px] font-medium text-amber-400">
          <WifiOffIcon size={11} className="shrink-0" />
          {t.channelList.nodeOffline}
        </div>
      )}

      <ScrollShadow className="flex-1 overflow-y-auto">
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
                  onContextMenu={handleOpenCtxMenu}
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
                            onContextMenu={handleOpenCtxMenu}
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
                          <p className="px-2 py-1 text-xs text-[var(--muted)]/60">Catégorie vide</p>
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
                  className="mt-3 w-full gap-1 text-[10px] font-bold uppercase tracking-widest text-muted/30 hover:text-muted"
                  onPress={() => openCreate('category')}
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
                      onContextMenu={handleOpenCtxMenu}
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
                  className="mt-3 w-full gap-1 text-[10px] font-bold uppercase tracking-widest text-muted/30 hover:text-muted"
                  onPress={() => openCreate('category')}
                >
                  <PlusIcon size={11} />
                  {t.channelList.newCategory}
                </Button>
              )}
            </>
          )}
        </div>
      </ScrollShadow>

      {user && <UserPanel user={user} />}

      {/* Modal : Créer un salon / une catégorie */}
      <Modal.Backdrop
        isOpen={showCreateChannel}
        onOpenChange={(open) => {
          setShowCreateChannel(open);
          if (!open) setCreateParentId(null);
        }}
        variant="blur"
      >
        <Modal.Container size="sm">
          <Modal.Dialog
              aria-label={createType === 'category' ? t.channelList.createModal.createCategory : t.channelList.createModal.createChannel}
              className="overflow-hidden rounded-2xl border border-(--border)/30 p-0 shadow-2xl"
            >

            {/* Header */}
            <div className="flex items-start justify-between border-b border-(--border)/20 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
                  {(() => { const Icon = CHANNEL_ICON[createType] ?? HashIcon; return <Icon size={18} className="text-accent" />; })()}
                </div>
                <div>
                  <h2 className="text-[15px] font-bold">
                    {createType === 'category'
                      ? t.channelList.createModal.createCategory
                      : t.channelList.createModal.createChannel}
                  </h2>
                  <p className="text-[11px] text-(--muted)/60">
                    {createParentId
                      ? <>{t.channelList.createModal.inCategory}{' '}<span className="font-medium text-foreground">{categories.find((c) => c.id === createParentId)?.name}</span></>
                      : createType === 'category'
                        ? 'Organisez vos salons'
                        : 'Choisissez un type et un nom'}
                  </p>
                </div>
              </div>
              <CloseButton onPress={() => setShowCreateChannel(false)} className="shrink-0" />
            </div>

            {/* Body */}
            <div className="space-y-5 px-6 py-5">
              {createType !== 'category' && (
                <div className="space-y-2.5">
                  <Label className="text-[13px] font-semibold">{t.channelList.createModal.type}</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CHANNEL_TYPES.map((ct) => {
                      const isSelected = createType === ct.id;
                      return (
                        <button
                          key={ct.id}
                          type="button"
                          onClick={() => setCreateType(ct.id as ChannelType)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-[10px] font-semibold transition-all',
                            isSelected
                              ? 'border-accent bg-accent/10 text-accent'
                              : 'border-(--border)/40 bg-(--surface-secondary)/30 text-muted hover:border-accent/30 hover:bg-accent/5 hover:text-foreground',
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
                <Label className="text-[13px] font-semibold">
                  {createType === 'category'
                    ? t.channelList.createModal.categoryName
                    : t.channelList.createModal.channelName}
                </Label>
                <InputGroup>
                  <InputGroup.Input
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
                </InputGroup>
              </div>

              {createError && (
                <p className="text-[13px] text-danger">{createError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-(--border)/20 bg-(--surface-secondary)/30 px-6 py-4">
              <Button variant="secondary" onPress={() => setShowCreateChannel(false)}>
                {t.common.cancel}
              </Button>
              <Button onPress={handleCreateChannel} isDisabled={isCreating || !createName.trim()}>
                {isCreating && <Spinner size="sm" color="current" />}
                {isCreating ? t.common.creating : t.common.create}
              </Button>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* ── Context menu clic droit ───────────────────────────────────── */}
      {ctxMenu && (
        <div
          style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 9999 }}
          className="min-w-[160px] overflow-hidden rounded-xl border border-[var(--border)]/40 bg-[var(--surface-secondary)] py-1 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[var(--foreground)] hover:bg-[var(--accent)]/10"
            onClick={() => {
              setEditingChannel(ctxMenu.channel);
              setEditChannelName(ctxMenu.channel.name);
              setCtxMenu(null);
            }}
          >
            <PencilIcon size={13} className="shrink-0 text-[var(--muted)]" />
            Renommer
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-red-400 hover:bg-red-500/10"
            onClick={() => { setConfirmDeleteChannel(ctxMenu.channel); setCtxMenu(null); }}
          >
            <Trash2Icon size={13} className="shrink-0" />
            Supprimer
          </button>
        </div>
      )}

      {/* ── Modale : Renommer un salon ────────────────────────────────── */}
      <Modal.Backdrop
        isOpen={!!editingChannel}
        onOpenChange={(open) => { if (!open) setEditingChannel(null); }}
        variant="blur"
      >
        <Modal.Container size="sm">
          <Modal.Dialog aria-label="Renommer le salon" className="overflow-hidden rounded-2xl border border-(--border)/30 p-0 shadow-2xl">
            <div className="flex items-center justify-between border-b border-(--border)/20 px-6 py-5">
              <h2 className="text-[15px] font-bold">Renommer le salon</h2>
              <CloseButton onPress={() => setEditingChannel(null)} />
            </div>
            <div className="space-y-4 px-6 py-5">
              <InputGroup>
                <InputGroup.Input
                  value={editChannelName}
                  onChange={(e) => setEditChannelName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRenameChannel(); }}
                  autoFocus
                />
              </InputGroup>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onPress={() => setEditingChannel(null)}>Annuler</Button>
                <Button onPress={handleRenameChannel} isDisabled={!editChannelName.trim()}>Renommer</Button>
              </div>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* ── Modale : Confirmer suppression ───────────────────────────── */}
      <Modal.Backdrop
        isOpen={!!confirmDeleteChannel}
        onOpenChange={(open) => { if (!open) setConfirmDeleteChannel(null); }}
        variant="blur"
      >
        <Modal.Container size="sm">
          <Modal.Dialog aria-label="Supprimer le salon" className="overflow-hidden rounded-2xl border border-(--border)/30 p-0 shadow-2xl">
            <div className="flex items-center justify-between border-b border-(--border)/20 px-6 py-5">
              <h2 className="text-[15px] font-bold text-red-400">Supprimer le salon</h2>
              <CloseButton onPress={() => setConfirmDeleteChannel(null)} />
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="text-[13px] text-[var(--muted)]">
                Êtes-vous sûr de vouloir supprimer <span className="font-semibold text-[var(--foreground)]">#{confirmDeleteChannel?.name}</span> ? Cette action est irréversible.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onPress={() => setConfirmDeleteChannel(null)}>Annuler</Button>
                <Button className="bg-red-500 text-white hover:bg-red-600" onPress={handleDeleteChannel}>Supprimer</Button>
              </div>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
