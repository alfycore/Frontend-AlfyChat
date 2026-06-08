'use client';

import {
  useState, useRef, useEffect, useCallback, useMemo, memo,
  type Dispatch, type SetStateAction,
} from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  MessageCircleIcon, ShieldCheckIcon, SmileIcon, SendIcon, HashIcon,
  XIcon, PhoneIcon, VideoIcon, ArrowLeftIcon, BanIcon,
  SearchIcon, PaperclipIcon, FileTextIcon, MenuIcon, Maximize2Icon,
} from '@/components/icons';
import { useTranslation } from '@/components/locale-provider';
import { useMessages } from '@/hooks/use-messages';
import { useAuth } from '@/hooks/use-auth';
import { api, resolveMediaUrl } from '@/lib/api';
import { useCallContext } from '@/hooks/use-call-context';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useLayoutPrefs, densityCls } from '@/hooks/use-layout-prefs';
import { useUIStyle } from '@/hooks/use-ui-style';
import { notify } from '@/hooks/use-notification';
import { getLastSeen } from '@/lib/notification-store';
import { conversationsStore } from '@/lib/conversations-store';
import { statusLabel, effectiveStatus } from '@/lib/status';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Chip,
  ScrollShadow,
  Separator,
  Skeleton,
  Spinner,
  Surface,
  Tooltip,
} from '@heroui/react';
import { EmojiPicker } from '@/components/chat/emoji-picker';
import { MentionPopover, type MentionUser } from '@/components/chat/mention-popover';
import { CallPanel } from '@/components/chat/call-panel';
import { SearchPanel } from '@/components/chat/search-panel';
import {
  MessageItem, shouldGroup,
  type MessageSender, type MessageData,
} from '@/components/chat/message-item';

/* ── Motion easing ──────────────────────────────────────────────────────── */

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

/* ── Types ──────────────────────────────────────────────────────────────── */

interface ChatAreaProps {
  channelId?: string | null;
  serverId?: string | null;
  recipientId?: string;
  recipientName?: string;
}

interface MessageListProps {
  dedupedMessages: MessageData[];
  editingMessageId: string | null;
  editInput: string;
  messagesById: Map<string, MessageData>;
  highlightedMessageId: string | null;
  currentUser: MessageSender | null;
  recipientName?: string;
  isLoadingMoreMessages: boolean;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  lastSeenAt?: string | null;
  onSetEditInput: Dispatch<SetStateAction<string>>;
  onReply: (id: string, content: string, authorName: string) => void;
  onCopy: (content: string) => void;
  onReaction: (id: string, emoji: string) => void;
  onRemoveReaction: (id: string, emoji: string) => void;
  onStartEdit: (id: string, content: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}

/* ── Status colors ───────────────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  online:  'bg-success',
  away:    'bg-warning',
  dnd:     'bg-danger',
  offline: 'bg-muted/30',
};

type BadgeColor = 'default' | 'success' | 'warning' | 'danger';

const STATUS_BADGE: Record<string, BadgeColor> = {
  online:  'success',
  away:    'warning',
  dnd:     'danger',
  offline: 'default',
};

/* ── StatusAvatar ────────────────────────────────────────────────────────── */
/* Avatar with a HeroUI Badge dot anchored to it, optionally wrapped in a
   Tooltip showing the contact identity + presence. */

function StatusAvatar({
  name,
  status,
  size = 'sm',
  tooltip,
}: {
  name?: string;
  status: string;
  size?: 'sm' | 'md' | 'lg';
  tooltip?: React.ReactNode;
}) {
  const badge = (
    <Badge.Anchor className="shrink-0">
      <Avatar size={size}>
        <Avatar.Fallback className="font-semibold">
          {(name || '?')[0].toUpperCase()}
        </Avatar.Fallback>
      </Avatar>
      <Badge
        color={STATUS_BADGE[status] ?? 'default'}
        placement="bottom-right"
        size={size === 'lg' ? 'md' : 'sm'}
        className={`ring-2 ring-surface ${status === 'online' ? 'animate-pulse' : ''}`}
      />
    </Badge.Anchor>
  );

  if (!tooltip) return badge;

  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger aria-label={name || 'Contact'}>{badge}</Tooltip.Trigger>
      <Tooltip.Content showArrow>
        <Tooltip.Arrow />
        {tooltip}
      </Tooltip.Content>
    </Tooltip>
  );
}

/* ── StatusLine — reusable presence dot + label ──────────────────────────── */

function StatusLine({ status, className }: { status: string; className?: string }) {
  return (
    <span className={`flex items-center gap-1.5 text-muted ${className ?? ''}`}>
      <span className={`inline-block size-1.5 shrink-0 rounded-full ${STATUS_COLORS[status] ?? 'bg-muted/30'}`} />
      {statusLabel(status)}
    </span>
  );
}

/* ── RecipientHeader ─────────────────────────────────────────────────────── */

function RecipientHeader({
  recipientId,
  recipientName,
  e2eeTooltip,
  privateMessage,
}: {
  recipientId: string;
  recipientName?: string;
  e2eeTooltip: string;
  privateMessage: string;
}) {
  const [status, setStatus] = useState<string>(() =>
    effectiveStatus(conversationsStore.getPresence().get(recipientId) ?? 'offline'),
  );

  useEffect(() => {
    const sync = () =>
      setStatus(effectiveStatus(conversationsStore.getPresence().get(recipientId) ?? 'offline'));
    sync();
    const id = setInterval(sync, 5000);
    return () => clearInterval(id);
  }, [recipientId]);

  return (
    <>
      <StatusAvatar
        name={recipientName}
        status={status}
        size="sm"
        tooltip={
          <div className="flex flex-col gap-0.5 py-0.5">
            <p className="font-semibold">{recipientName || privateMessage}</p>
            <StatusLine status={status} className="text-xs" />
          </div>
        }
      />

      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold tracking-tight text-foreground">
          {recipientName || privateMessage}
        </p>
        <StatusLine status={status} className="text-[10px]" />
      </div>

      <Tooltip delay={0}>
        <Tooltip.Trigger aria-label="Chiffrement de bout en bout">
          <Chip color="success" variant="soft" size="sm" className="shrink-0 cursor-default">
            <ShieldCheckIcon size={10} />
            <Chip.Label>E2EE</Chip.Label>
          </Chip>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow>
          <Tooltip.Arrow />
          <p>{e2eeTooltip}</p>
        </Tooltip.Content>
      </Tooltip>
    </>
  );
}

/* ── MessageSkeletons ────────────────────────────────────────────────────── */

function MessageSkeletons() {
  const rows = [
    { self: false, lines: 2, w: 'w-52' },
    { self: false, lines: 1, w: 'w-36' },
    { self: true,  lines: 1, w: 'w-44' },
    { self: false, lines: 2, w: 'w-60' },
    { self: true,  lines: 2, w: 'w-32' },
  ];

  return (
    <div className="skeleton--shimmer flex flex-col justify-end gap-4 overflow-hidden px-4 pb-4 pt-6">
      {rows.map((row, i) => (
        <div
          key={i}
          className={`flex items-end gap-3${row.self ? ' flex-row-reverse' : ''}`}
          style={{ opacity: 0.25 + i * 0.15 }}
        >
          {!row.self && (
            <Skeleton animationType="none" className="size-8 shrink-0 rounded-full" />
          )}
          <div className={`flex flex-col gap-1.5 ${row.self ? 'items-end' : 'items-start'}`}>
            {!row.self && (
              <Skeleton animationType="none" className="mb-0.5 h-2 w-16 rounded-full" />
            )}
            <Skeleton animationType="none" className={`h-9 rounded-2xl ${row.w}`} />
            {row.lines > 1 && (
              <Skeleton animationType="none" className={`h-8 rounded-2xl opacity-60 ${row.w}`} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── TypingDots ──────────────────────────────────────────────────────────── */

function TypingDots() {
  return (
    <span className="flex items-center gap-[3px]">
      {[0, 160, 320].map((delay) => (
        <span
          key={delay}
          className="inline-block size-[5px] animate-bounce rounded-full bg-muted/50"
          style={{ animationDelay: `${delay}ms`, animationDuration: '900ms' }}
        />
      ))}
    </span>
  );
}

/* ── MessageList ─────────────────────────────────────────────────────────── */

const MessageList = memo(function MessageList({
  dedupedMessages, editingMessageId, editInput, messagesById,
  highlightedMessageId, currentUser, recipientName, isLoadingMoreMessages,
  messagesContainerRef, lastSeenAt,
  onSetEditInput, onReply, onCopy, onReaction, onRemoveReaction,
  onStartEdit, onSaveEdit, onCancelEdit, onDelete,
}: MessageListProps) {
  const { t } = useTranslation();

  let dividerIdx = -1;
  if (lastSeenAt) {
    const ts = new Date(lastSeenAt).getTime();
    for (let i = 0; i < dedupedMessages.length; i++) {
      if (
        new Date(dedupedMessages[i].createdAt).getTime() > ts &&
        dedupedMessages[i].authorId !== currentUser?.id
      ) {
        dividerIdx = i;
        break;
      }
    }
  }

  return (
    <div className="space-y-0" ref={messagesContainerRef}>
      {isLoadingMoreMessages && (
        <div className="flex items-center justify-center gap-2 py-5 text-muted">
          <Spinner size="sm" color="current" />
          <span className="text-xs">{t.chat.loadingOlder}</span>
        </div>
      )}

      {dedupedMessages.map((msg, idx) => {
        const isEditing     = editingMessageId === msg.id;
        const grouped       = idx > 0 && shouldGroup(dedupedMessages[idx - 1], msg);
        const isHighlighted = highlightedMessageId === msg.id;
        const isUnread      = dividerIdx >= 0 && idx >= dividerIdx && msg.authorId !== currentUser?.id;
        const showDivider   = idx === dividerIdx;

        return (
          <div key={msg.id}>
            {showDivider && (
              <div className="my-4 flex items-center gap-3 px-4">
                <div className="h-px flex-1 bg-danger/20" />
                <Chip color="danger" variant="soft" size="sm">
                  <Chip.Label className="text-[10px] font-semibold uppercase tracking-widest">
                    {t.chat.newMessages}
                  </Chip.Label>
                </Chip>
                <div className="h-px flex-1 bg-danger/20" />
              </div>
            )}

            <div
              className={[
                'transition-all duration-500',
                isHighlighted && 'animate-pulse rounded-xl bg-accent/10',
                isUnread && !isHighlighted && 'border-l-2 border-accent/30 bg-accent/[0.03]',
              ].filter(Boolean).join(' ')}
            >
              <MessageItem
                message={msg}
                currentUser={currentUser}
                recipientName={recipientName}
                isEditing={isEditing}
                editInput={isEditing ? editInput : ''}
                isGrouped={grouped}
                replyMessage={msg.replyToId ? (messagesById.get(msg.replyToId) ?? null) : null}
                onSetEditInput={onSetEditInput}
                onReply={onReply}
                onCopy={onCopy}
                onReaction={onReaction}
                onRemoveReaction={onRemoveReaction}
                onStartEdit={onStartEdit}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onDelete={onDelete}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
});

/* ── SplitContextPanel ───────────────────────────────────────────────────── */

function SplitContextPanel({
  recipientId, recipientName, messages, ui, onSearch,
}: {
  recipientId?: string;
  recipientName?: string;
  messages: MessageData[];
  ui: ReturnType<typeof useUIStyle>;
  onSearch: () => void;
}) {
  const [status, setStatus] = useState<string>(() =>
    recipientId
      ? effectiveStatus(conversationsStore.getPresence().get(recipientId) ?? 'offline')
      : 'offline',
  );

  useEffect(() => {
    if (!recipientId) return;
    const sync = () =>
      setStatus(effectiveStatus(conversationsStore.getPresence().get(recipientId) ?? 'offline'));
    sync();
    const id = setInterval(sync, 5000);
    return () => clearInterval(id);
  }, [recipientId]);

  const sharedMedia = useMemo(() => {
    const imgs: string[] = [];
    for (const msg of messages) {
      for (const line of (msg.content ?? '').split('\n')) {
        if (line.startsWith('[attach:img]:')) {
          const url = resolveMediaUrl(line.slice('[attach:img]:'.length));
          if (url) imgs.push(url);
        }
      }
    }
    return imgs.slice(-12).reverse();
  }, [messages]);

  return (
    <div className={`flex w-64 shrink-0 flex-col ${ui.sidebarBg}`}>
      <div className={`flex h-14 shrink-0 items-center px-4 ${ui.header}`}>
        <span className="text-[13px] font-semibold tracking-tight text-foreground">Infos</span>
      </div>

      <ScrollShadow hideScrollBar className="flex-1 space-y-5 px-3 py-5">
        {recipientId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="flex flex-col items-center gap-3 py-2 text-center"
          >
            <StatusAvatar name={recipientName} status={status} size="lg" />
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-[13px] font-semibold text-foreground">{recipientName}</p>
              <StatusLine status={status} className="justify-center text-[11px]" />
            </div>
            <Chip color="success" variant="soft" size="sm">
              <ShieldCheckIcon size={10} />
              <Chip.Label>E2EE</Chip.Label>
            </Chip>
          </motion.div>
        )}

        <Separator variant="secondary" />

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted hover:text-foreground"
          onPress={onSearch}
        >
          <SearchIcon size={14} />
          Rechercher
        </Button>

        {sharedMedia.length > 0 && (
          <>
            <Separator variant="secondary" />
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted/60">
                  Médias partagés
                </p>
                <Chip variant="soft" size="sm">
                  <Chip.Label>{sharedMedia.length}</Chip.Label>
                </Chip>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {sharedMedia.map((url, i) => (
                  <Tooltip key={i} delay={300}>
                    <Tooltip.Trigger aria-label="Ouvrir le média">
                      <motion.a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.04 }}
                        transition={{ duration: 0.2, ease: EASE }}
                        className="group block aspect-square overflow-hidden rounded-lg ring-1 ring-separator/30 transition-shadow duration-200 hover:ring-accent/40"
                      >
                        <img
                          src={url}
                          alt=""
                          className="size-full object-cover transition-opacity duration-200 group-hover:opacity-80"
                        />
                      </motion.a>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <p>Ouvrir dans un nouvel onglet</p>
                    </Tooltip.Content>
                  </Tooltip>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator variant="secondary" />

        <Surface variant="secondary" className="flex items-center gap-3 rounded-2xl p-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
            <MessageCircleIcon size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-none tracking-tight text-foreground">
              {messages.length}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted/60">
              Messages chargés
            </p>
          </div>
        </Surface>
      </ScrollShadow>
    </div>
  );
}

/* ── ChatArea ────────────────────────────────────────────────────────────── */

export function ChatArea({ channelId, recipientId, recipientName }: ChatAreaProps) {
  const { t, tx }  = useTranslation();
  const { user }   = useAuth();
  const ui         = useUIStyle();
  const { isMobile, openSidebar } = useMobileNav();
  const { prefs }  = useLayoutPrefs();
  const d          = densityCls(prefs.density);
  const reduce     = useReducedMotion();

  /* Call panel sizing */
  const [callMinimized, setCallMinimized]     = useState(false);
  const [callPanelHeight, setCallPanelHeight] = useState(220);
  const callPanelRef = useRef<HTMLDivElement>(null);

  /* Input / UI state */
  const [messageInput, setMessageInput]     = useState('');
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [editInput, setEditInput]           = useState('');
  const [replyingTo, setReplyingTo]         = useState<{ id: string; content: string; authorName: string } | null>(null);
  const [cooldown, setCooldown]             = useState(false);
  const [iBlockedThem, setIBlockedThem]     = useState(false);
  const [theyBlockedMe, setTheyBlockedMe]   = useState(false);
  const [attachments, setAttachments]       = useState<{ name: string; url: string; isImage: boolean }[]>([]);
  const [uploading, setUploading]           = useState(false);
  const [searchOpen, setSearchOpen]         = useState(false);
  const [highlightId, setHighlightId]       = useState<string | null>(null);
  const [e2eeDismissed, setE2eeDismissed]   = useState(false);
  const [mentionQuery, setMentionQuery]     = useState('');
  const [mentionVisible, setMentionVisible] = useState(false);
  const [lastSeenAt, setLastSeenAt]         = useState<string | null>(
    () => (recipientId ? getLastSeen(recipientId) : null),
  );

  useEffect(() => {
    if (!lastSeenAt) return;
    const id = setTimeout(() => setLastSeenAt(null), 5000);
    return () => clearTimeout(id);
  }, [lastSeenAt]);

  /* Refs */
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const scrollRef     = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const atBottomRef   = useRef(true);
  const editInputRef  = useRef('');
  const msgContRef    = useRef<HTMLDivElement>(null);
  const tsRef         = useRef<number[]>([]);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const isTypingRef   = useRef(false);
  const initScrollRef = useRef(false);

  /* Call context */
  const {
    initiateCall, callStatus, callType, callConversationId, callRecipientId, callChannelId,
    isGroup: callIsGroup, callCategory, callMode, tierLabel, handRaised,
    callerName: ctxCallerName, callerAvatar,
    localStream, remoteStreams, screenStream,
    isMuted, isVideoOff, isScreenSharing, remoteIsScreenSharing, mediaError, callDuration,
    participantInfo, toggleMute, toggleVideo, startScreenShare, stopScreenShare,
    endCall, leaveCall, toggleHand,
  } = useCallContext();

  /* Messages hook */
  const {
    messages, typingUsers, isLoading, sendMessage, editMessage, deleteMessage,
    addReaction, removeReaction, startTyping, stopTyping,
    hasMoreMessages, isLoadingMoreMessages, loadMoreMessages,
    hasEncryptedPlaceholders, e2eeRecoveryStatus, requestE2EEHistory,
  } = useMessages(channelId ?? undefined, recipientId);

  /* Dedup + index */
  const dedupedMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
  }, [messages]);

  const messagesById = useMemo(
    () => new Map(dedupedMessages.map((m) => [m.id, m])),
    [dedupedMessages],
  );

  const mentionUsers = useMemo(() => {
    const map = new Map<string, MentionUser>();
    for (const msg of messages) {
      if (msg.sender)
        map.set(msg.sender.id, {
          id: msg.sender.id,
          username: msg.sender.username,
          displayName: msg.sender.displayName,
          avatarUrl: msg.sender.avatarUrl,
        });
    }
    if (user)
      map.set(user.id, {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      });
    return Array.from(map.values());
  }, [messages, user]);

  /* ── Scroll helpers ──────────────────────────────────────────────────── */

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const checkAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  useEffect(() => {
    if (atBottomRef.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    atBottomRef.current = true;
    initScrollRef.current = false;
    requestAnimationFrame(() => { scrollToBottom(); requestAnimationFrame(scrollToBottom); });
  }, [channelId, recipientId, scrollToBottom]);

  useEffect(() => {
    if (!isLoading && messages.length > 0 && !initScrollRef.current) {
      initScrollRef.current = true;
      requestAnimationFrame(() => { scrollToBottom(); requestAnimationFrame(scrollToBottom); });
    }
  }, [isLoading, messages.length, scrollToBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onImgLoad = (e: Event) => {
      if ((e.target as HTMLElement).tagName === 'IMG' && atBottomRef.current) scrollToBottom();
    };
    el.addEventListener('load', onImgLoad, true);
    return () => el.removeEventListener('load', onImgLoad, true);
  }, [scrollToBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkAtBottom);
    return () => el.removeEventListener('scroll', checkAtBottom);
  }, [checkAtBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      checkAtBottom();
      if (el.scrollTop < 120 && hasMoreMessages && !isLoadingMoreMessages) {
        atBottomRef.current = false;
        const prevHeight = el.scrollHeight;
        loadMoreMessages().then(() =>
          requestAnimationFrame(() => {
            if (scrollRef.current)
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight;
          }),
        );
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [checkAtBottom, hasMoreMessages, isLoadingMoreMessages, loadMoreMessages]);

  useEffect(() => {
    if (!msgContRef.current) return;
    const obs = new ResizeObserver(() => { if (atBottomRef.current) scrollToBottom(); });
    obs.observe(msgContRef.current);
    return () => obs.disconnect();
  }, [scrollToBottom]);

  useEffect(() => {
    setSearchOpen(false);
    setAttachments([]);
    setE2eeDismissed(false);
  }, [channelId, recipientId]);

  /* ── Block status ────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!recipientId) { setIBlockedThem(false); setTheyBlockedMe(false); return; }
    api.getBlockStatus(recipientId)
      .then((res: any) => {
        const data = res?.data ?? res;
        if (data && typeof data === 'object') {
          setIBlockedThem(!!data.iBlockedThem);
          setTheyBlockedMe(!!data.theyBlockedMe);
        }
      })
      .catch(() => {});
  }, [recipientId]);

  /* ── File upload ─────────────────────────────────────────────────────── */

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    const MAX   = 10 * 1024 * 1024;
    const IMAGES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    const DOCS   = [
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'application/zip',
      'application/x-zip-compressed', 'application/octet-stream',
    ];
    const EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
    for (const file of files) {
      if (file.size > MAX) {
        notify.error(t.chat.fileTooLarge, tx(t.chat.fileTooLargeDesc, { name: file.name }));
        continue;
      }
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (![...IMAGES, ...DOCS].includes(file.type) && !EXTS.includes(ext)) {
        notify.error(t.chat.fileTypeError, tx(t.chat.fileTypeErrorDesc, { name: file.name }));
        continue;
      }
      setUploading(true);
      try {
        const res = await api.uploadDocument(file);
        if (res.success && res.data)
          setAttachments((p) => [...p, { name: file.name, url: res.data!.url, isImage: res.data!.isImage }]);
        else
          notify.error(t.chat.uploadError, res.error ?? t.chat.uploadError);
      } finally {
        setUploading(false);
      }
    }
  }, [t, tx]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items || []).filter(
      (i) => i.kind === 'file' && i.type.startsWith('image/'),
    );
    if (!items.length) return;
    e.preventDefault();
    for (const item of items) {
      const file = item.getAsFile();
      if (!file || file.size > 10 * 1024 * 1024) {
        if (file) notify.error(t.chat.fileTooLarge, t.chat.fileTooLargeDesc.replace('{name}', 'image'));
        continue;
      }
      setUploading(true);
      try {
        const res = await api.uploadDocument(file);
        if (res.success && res.data)
          setAttachments((p) => [...p, { name: file.name || 'image.png', url: res.data!.url, isImage: res.data!.isImage }]);
        else
          notify.error(t.chat.uploadError, res.error ?? t.chat.uploadError);
      } finally {
        setUploading(false);
      }
    }
  }, [t]);

  /* ── Send ────────────────────────────────────────────────────────────── */

  const handleSend = useCallback((e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!messageInput.trim() && !attachments.length) return;
    const now = Date.now();
    tsRef.current = tsRef.current.filter((ts) => now - ts < 5000);
    if (tsRef.current.length >= 5) {
      setCooldown(true);
      setTimeout(() => setCooldown(false), 3000);
      return;
    }
    tsRef.current.push(now);
    let content = messageInput.trim();
    for (const a of attachments) {
      const s = a.isImage ? `\n[attach:img]:${a.url}` : `\n[attach:file]:${a.name}|${a.url}`;
      content = content ? content + s : s.trimStart();
    }
    const mentionedIds: string[] = [];
    if (channelId) {
      const re = /(?:^|\s)@(\w+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        const found = mentionUsers.find((u) => u.username.toLowerCase() === m![1].toLowerCase());
        if (found && !mentionedIds.includes(found.id)) mentionedIds.push(found.id);
      }
    }
    sendMessage(content, replyingTo?.id, mentionedIds.length ? mentionedIds : undefined);
    setMessageInput('');
    setAttachments([]);
    setReplyingTo(null);
    stopTyping();
    atBottomRef.current = true;
    scrollToBottom();
  }, [messageInput, attachments, channelId, mentionUsers, replyingTo, sendMessage, stopTyping, scrollToBottom]);

  /* ── Edit ────────────────────────────────────────────────────────────── */

  const handleSetEditInput = useCallback((v: SetStateAction<string>) => {
    setEditInput((p) => {
      const next = typeof v === 'function' ? (v as (p: string) => string)(p) : v;
      editInputRef.current = next;
      return next;
    });
  }, []);

  const handleStartEdit = useCallback((id: string, content: string) => {
    editInputRef.current = content;
    setEditInput(content);
    setEditingId(id);
  }, []);

  const handleSaveEdit = useCallback((id: string) => {
    if (editInputRef.current.trim()) editMessage(id, editInputRef.current.trim());
    setEditingId(null);
    setEditInput('');
    editInputRef.current = '';
  }, [editMessage]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditInput('');
    editInputRef.current = '';
  }, []);

  const handleReply = useCallback((id: string, content: string, authorName: string) => {
    setReplyingTo({ id, content, authorName });
    textareaRef.current?.focus();
  }, []);

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    notify.success('Copié', 'Message copié dans le presse-papiers');
  }, []);

  const handleReaction    = useCallback((id: string, emoji: string) => addReaction(id, emoji), [addReaction]);
  const handleRemoveRxn   = useCallback((id: string, emoji: string) => removeReaction(id, emoji), [removeReaction]);

  /* ── Input handlers ──────────────────────────────────────────────────── */

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageInput(value);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (value) {
      if (!isTypingRef.current) { isTypingRef.current = true; startTyping(); }
      typingTimeout.current = setTimeout(() => { isTypingRef.current = false; stopTyping(); }, 3000);
    } else {
      isTypingRef.current = false;
      stopTyping();
    }
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const match  = value.slice(0, cursor).match(/(^|\s)@(\w*)$/);
    if (match) { setMentionQuery(match[2]); setMentionVisible(true); }
    else setMentionVisible(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionVisible && ['ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Escape'].includes(e.key)) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (messageInput.trim()) handleSend(e as unknown as { preventDefault: () => void });
    }
  };

  const handleMentionSelect = (u: MentionUser) => {
    const cursor = textareaRef.current?.selectionStart ?? messageInput.length;
    const before = messageInput.slice(0, cursor);
    const after  = messageInput.slice(cursor);
    const match  = before.match(/(^|\s)@(\w*)$/);
    if (match) {
      setMessageInput(`${before.slice(0, match.index) + match[1]}@${u.username} ${after}`);
      setMentionVisible(false);
      textareaRef.current?.focus();
    }
  };

  /* ── Calls ───────────────────────────────────────────────────────────── */

  const getConvId = useCallback(() => {
    if (channelId) return channelId;
    if (recipientId && user) {
      const sorted = [user.id, recipientId].sort();
      return `dm_${sorted[0]}_${sorted[1]}`;
    }
    return undefined;
  }, [channelId, recipientId, user]);

  const handleVoiceCall = () => {
    if (recipientId) initiateCall(recipientId, 'voice', getConvId(), recipientName);
  };
  const handleVideoCall = () => {
    if (recipientId) initiateCall(recipientId, 'video', getConvId(), recipientName);
  };

  const isBlocked = iBlockedThem || theyBlockedMe;
  const canSend   = (messageInput.trim().length > 0 || attachments.length > 0) && !isBlocked;

  /* ── Empty state ─────────────────────────────────────────────────────── */

  if (!channelId && !recipientId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-background px-6 text-center">
        {isMobile && (
          <Button variant="outline" size="sm" onPress={openSidebar}>
            <MenuIcon size={16} />
            {t.chat.openSidebar}
          </Button>
        )}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex size-24 items-center justify-center rounded-3xl bg-surface-secondary shadow-sm">
            <MessageCircleIcon size={36} className="text-muted/40" />
          </div>
          <div className="space-y-1.5">
            <p className="font-heading text-base font-semibold tracking-tight text-foreground">
              {t.chat.welcomeHeading}
            </p>
            <p className="max-w-[280px] text-sm leading-relaxed text-muted">
              {t.chat.welcomeDesc}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Call props ──────────────────────────────────────────────────────── */

  const callProps = {
    type: (callType || 'voice') as 'voice' | 'video',
    status: callStatus as 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended',
    localStream, remoteStreams, screenStream,
    isMuted, isVideoOff, isScreenSharing, remoteIsScreenSharing,
    recipientName: ctxCallerName || recipientName || 'Utilisateur',
    recipientAvatar: callerAvatar,
    currentUserName: user?.displayName || user?.username || 'Vous',
    currentUserAvatar: user?.avatarUrl,
    duration: callDuration, mediaError,
    participants: callIsGroup
      ? Array.from(participantInfo.entries()).map(([uid, info]) => ({ userId: uid, name: info.name, avatar: info.avatar }))
      : undefined,
    callCategory: callCategory ?? undefined, callMode, tierLabel, handRaised,
    onToggleMute: toggleMute, onToggleVideo: toggleVideo,
    onStartScreenShare: startScreenShare, onStopScreenShare: stopScreenShare,
    onEndCall: callIsGroup ? leaveCall : endCall, onToggleHand: toggleHand,
  };

  const showCallPanel =
    callStatus !== 'idle' && callStatus !== 'ended' &&
    (callConversationId === getConvId() ||
      (recipientId && callRecipientId === recipientId) ||
      (callIsGroup && channelId && callChannelId === channelId));

  /* ── Search panel helper ─────────────────────────────────────────────── */

  const jumpToMessage = (id: string) => {
    if (!/^[a-f0-9-]{36}$/i.test(id)) return;
    setHighlightId(id);
    setTimeout(() => setHighlightId(null), 2000);
    document.querySelector(`[data-message-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const searchPanelProps = {
    localMessages: dedupedMessages,
    conversationId: getConvId(),
    isDM: !!recipientId,
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore: isLoadingMoreMessages,
    onClose: () => setSearchOpen(false),
    onJumpToMessage: jumpToMessage,
  };

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <div data-tour="chat-area" className="flex h-full min-h-0 flex-1 overflow-hidden">

      {/* ── Main column ── */}
      <div className={`flex min-w-0 flex-1 flex-col overflow-hidden ${ui.contentBg || 'bg-background'}`}>

        {/* Header */}
        <header className={`flex shrink-0 items-center justify-between px-3 md:px-4 ${d.headerH} ${ui.header}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            {isMobile && (
              <Button isIconOnly size="sm" variant="ghost" onPress={openSidebar} className="shrink-0 md:hidden">
                <ArrowLeftIcon size={16} />
              </Button>
            )}

            {recipientId ? (
              <RecipientHeader
                recipientId={recipientId}
                recipientName={recipientName}
                e2eeTooltip={t.chat.e2eeTooltip}
                privateMessage={t.chat.privateMessage}
              />
            ) : (
              <>
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/20">
                  <HashIcon size={14} className="text-accent" />
                </div>
                <span className="truncate text-[13px] font-semibold tracking-tight text-foreground">
                  {t.chat.generalChannel}
                </span>
              </>
            )}
          </div>

          {recipientId && (
            <div data-tour="call-buttons" className="flex shrink-0 items-center gap-0.5">
              <Tooltip delay={0}>
                <Button
                  isIconOnly
                  size="sm"
                  variant={searchOpen ? 'secondary' : 'ghost'}
                  onPress={() => setSearchOpen((v) => !v)}
                  className="text-muted hover:text-foreground"
                >
                  <SearchIcon size={15} />
                </Button>
                <Tooltip.Content><p>{t.chat.searchTooltip}</p></Tooltip.Content>
              </Tooltip>

              <Separator orientation="vertical" className="mx-1 h-4" />

              <Tooltip delay={0}>
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  className="text-muted hover:text-success"
                  onPress={handleVoiceCall}
                  isDisabled={callStatus !== 'idle'}
                >
                  <PhoneIcon size={15} />
                </Button>
                <Tooltip.Content><p>{t.chat.voiceCall}</p></Tooltip.Content>
              </Tooltip>

              <Tooltip delay={0}>
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  className="text-muted hover:text-accent"
                  onPress={handleVideoCall}
                  isDisabled={callStatus !== 'idle'}
                >
                  <VideoIcon size={15} />
                </Button>
                <Tooltip.Content><p>{t.chat.videoCall}</p></Tooltip.Content>
              </Tooltip>
            </div>
          )}
        </header>

        {/* Call panel */}
        {showCallPanel && (() => {
          if (isMobile) {
            if (callMinimized) {
              return (
                <Surface
                  variant="tertiary"
                  className="fixed bottom-4 right-4 z-60 w-36 cursor-pointer overflow-hidden rounded-2xl shadow-overlay ring-1 ring-separator"
                  onClick={() => setCallMinimized(false)}
                >
                  <div className="relative aspect-video">
                    {Array.from(remoteStreams.values())[0] ? (
                      <video
                        autoPlay
                        playsInline
                        muted
                        ref={(el) => { if (el) el.srcObject = Array.from(remoteStreams.values())[0] ?? null; }}
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted/40">
                        <Maximize2Icon size={20} />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                      <Maximize2Icon size={14} className="text-foreground/60" />
                    </div>
                  </div>
                  <p className="truncate px-2 py-1 text-[10px] text-muted">{ctxCallerName || recipientName}</p>
                </Surface>
              );
            }
            return (
              <div className="fixed inset-0 z-60 flex flex-col bg-background">
                <CallPanel {...callProps} onMinimize={() => setCallMinimized(true)} />
              </div>
            );
          }
          return (
            <>
              <div ref={callPanelRef} style={{ height: callPanelHeight }} className="overflow-hidden">
                <CallPanel {...callProps} compact={callPanelHeight < 280} />
              </div>
              <div
                className="group flex h-1.5 w-full shrink-0 cursor-row-resize items-center justify-center bg-surface-secondary transition-colors hover:bg-surface-tertiary"
                onMouseDown={(e) => {
                  const startY = e.clientY;
                  const startH = callPanelHeight;
                  const onMove = (me: MouseEvent) => setCallPanelHeight(Math.max(120, startH + me.clientY - startY));
                  const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                  window.addEventListener('mousemove', onMove);
                  window.addEventListener('mouseup', onUp);
                }}
              >
                <span className="h-0.5 w-8 rounded-full bg-separator/60 transition-colors group-hover:bg-muted/40" />
              </div>
            </>
          );
        })()}

        {/* E2EE recovery banner */}
        {recipientId && hasEncryptedPlaceholders && e2eeRecoveryStatus !== 'done' && !e2eeDismissed && (
          <Alert status="warning" className="mx-3 mt-2 mb-1 md:mx-4">
            <Alert.Indicator>
              <ShieldCheckIcon size={16} />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>
                {e2eeRecoveryStatus === 'offline' ? t.chat.e2eeOffline : t.chat.e2eeMissing}
              </Alert.Title>
            </Alert.Content>
            <Button
              size="sm"
              variant="outline"
              isDisabled={e2eeRecoveryStatus === 'requesting'}
              onPress={requestE2EEHistory}
            >
              {e2eeRecoveryStatus === 'requesting' ? (
                <>
                  <Spinner size="sm" className="mr-1.5" />
                  {t.chat.e2eeWaiting}
                </>
              ) : (
                t.chat.e2eeRecover
              )}
            </Button>
            <Button isIconOnly size="sm" variant="ghost" onPress={() => setE2eeDismissed(true)}>
              <XIcon size={12} />
            </Button>
          </Alert>
        )}

        {/* Messages scroll area */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-1 py-2 md:px-2 md:py-4">
          {isLoading ? (
            <MessageSkeletons />
          ) : messages.length === 0 ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center"
            >
              <Surface variant="secondary" className="flex size-16 items-center justify-center rounded-3xl">
                <MessageCircleIcon size={26} className="text-muted" />
              </Surface>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-foreground">{t.chat.noMessages}</p>
                <p className="text-xs text-muted">{t.chat.beFirst}</p>
              </div>
            </motion.div>
          ) : (
            <MessageList
              dedupedMessages={dedupedMessages}
              editingMessageId={editingId}
              editInput={editInput}
              messagesById={messagesById}
              highlightedMessageId={highlightId}
              currentUser={user as MessageSender | null}
              recipientName={recipientName}
              isLoadingMoreMessages={isLoadingMoreMessages}
              messagesContainerRef={msgContRef}
              lastSeenAt={lastSeenAt}
              onSetEditInput={handleSetEditInput}
              onReply={handleReply}
              onCopy={handleCopy}
              onReaction={handleReaction}
              onRemoveReaction={handleRemoveRxn}
              onStartEdit={handleStartEdit}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onDelete={deleteMessage}
            />
          )}
        </div>

        {/* Bottom bar */}
        <div className="shrink-0 backdrop-blur-xl">

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 px-3 pt-1.5">
              <TypingDots />
              <span className="text-xs text-muted">
                {typingUsers.length > 1
                  ? tx(t.chat.typingPlural, { names: typingUsers.map((u) => u.username).join(', ') })
                  : tx(t.chat.typing, { names: typingUsers[0]?.username ?? '' })}
              </span>
            </div>
          )}

          {/* Cooldown */}
          <AnimatePresence>
            {cooldown && (
              <motion.div
                initial={reduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="mx-3 mt-1.5 overflow-hidden"
              >
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>Ralentis&nbsp;! Tu envoies trop de messages.</Alert.Description>
                  </Alert.Content>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Blocked state — replaces form */}
          {isBlocked ? (
            <div className="px-3 py-2">
              <Alert status="warning">
                <Alert.Indicator>
                  <BanIcon size={14} />
                </Alert.Indicator>
                <Alert.Content>
                  <Alert.Description>
                    {iBlockedThem ? (
                      <>
                        Vous avez bloqué cet utilisateur.{' '}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 underline-offset-2 hover:underline"
                          onPress={async () => { await api.unblockUser(recipientId!); setIBlockedThem(false); }}
                        >
                          Débloquer
                        </Button>
                      </>
                    ) : (
                      'Vous ne pouvez pas envoyer de message.'
                    )}
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            </div>
          ) : (
            <form onSubmit={handleSend} className="relative px-3 pb-3 pt-2">
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                multiple
                accept="image/*,application/pdf,application/msword,.docx,.xlsx,.pptx,text/plain,text/csv"
                onChange={handleFileSelect}
              />

              <MentionPopover
                query={mentionQuery}
                users={mentionUsers}
                visible={mentionVisible}
                position={{ top: replyingTo ? 114 : 64, left: 44 }}
                onSelect={handleMentionSelect}
                onClose={() => setMentionVisible(false)}
              />

              {/* Reply card */}
              <AnimatePresence>
                {replyingTo && (
                  <motion.div
                    initial={reduce ? false : { opacity: 0, y: 6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: 6, height: 0 }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className={`mb-1.5 flex items-center gap-2.5 rounded-xl px-3 py-2 ring-1 ring-accent/12 ${ui.replyBar || 'bg-accent/4'}`}>
                      <div className="h-5 w-0.5 shrink-0 self-stretch rounded-full bg-accent/50" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-accent/70">{replyingTo.authorName}</p>
                        <p className="truncate text-xs text-muted">{replyingTo.content}</p>
                      </div>
                      <Button isIconOnly size="sm" variant="ghost" className="size-5 shrink-0 rounded-full" onPress={() => setReplyingTo(null)}>
                        <XIcon size={10} />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Attachment strip */}
              {attachments.length > 0 && (
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <AnimatePresence>
                    {attachments.map((a, i) =>
                      a.isImage ? (
                        <motion.div
                          key={a.url}
                          layout
                          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ duration: 0.2, ease: EASE }}
                          className="group relative size-13 shrink-0 overflow-hidden rounded-xl"
                        >
                          <img src={a.url} alt={a.name} className="size-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            <Button isIconOnly size="sm" variant="secondary" className="size-6 rounded-full backdrop-blur-sm" onPress={() => setAttachments((p) => p.filter((_, j) => j !== i))}>
                              <XIcon size={11} />
                            </Button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key={a.url}
                          layout
                          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ duration: 0.2, ease: EASE }}
                        >
                          <Chip variant="secondary" size="sm">
                            <FileTextIcon size={10} />
                            <Chip.Label className="max-w-20 truncate">{a.name}</Chip.Label>
                            <Button isIconOnly size="sm" variant="ghost" className="size-4" onPress={() => setAttachments((p) => p.filter((_, j) => j !== i))}>
                              <XIcon size={9} />
                            </Button>
                          </Chip>
                        </motion.div>
                      )
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Single-line input */}
              <div className={`flex items-center gap-2 ${ui.inputBar}`}>
                <Tooltip delay={0}>
                  <Button isIconOnly size="md" variant="ghost" isDisabled={uploading} onPress={() => fileInputRef.current?.click()}>
                    {uploading ? <Spinner size="sm" color="current" /> : <PaperclipIcon size={18} />}
                  </Button>
                  <Tooltip.Content><p>Joindre (image, PDF, DOCX… &lt;10&nbsp;Mo)</p></Tooltip.Content>
                </Tooltip>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={`Message ${recipientId ? (recipientName || '') : '#général'}…`}
                  className="min-w-0 flex-1 resize-none bg-transparent py-2 text-base leading-6 text-foreground outline-none placeholder:text-muted/30"
                  style={{ minHeight: '24px', maxHeight: '140px', overflowY: 'auto' }}
                  aria-label="Message"
                />
                <EmojiPicker
                  onSelect={(emoji) => { setMessageInput((p) => p + emoji); textareaRef.current?.focus(); }}
                  onGifSelect={(url) => { sendMessage(url); atBottomRef.current = true; setTimeout(scrollToBottom, 50); }}
                >
                  <Button isIconOnly size="md" variant="ghost"><SmileIcon size={18} /></Button>
                </EmojiPicker>
                <motion.div animate={{ scale: canSend ? 1 : 0.92 }} transition={{ duration: 0.2, ease: EASE }}>
                  <Button
                    isIconOnly size="md"
                    variant={canSend ? 'primary' : 'ghost'}
                    isDisabled={!canSend}
                    onPress={() => handleSend({ preventDefault: () => {} })}
                  >
                    <SendIcon size={16} />
                  </Button>
                </motion.div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      {prefs.msgStyle === 'split' ? (
        <SplitContextPanel
          recipientId={recipientId}
          recipientName={recipientName}
          messages={dedupedMessages}
          ui={ui}
          onSearch={() => setSearchOpen((v) => !v)}
        />
      ) : (
        searchOpen && <SearchPanel {...searchPanelProps} />
      )}

      {prefs.msgStyle === 'split' && searchOpen && (
        <SearchPanel {...searchPanelProps} />
      )}
    </div>
  );
}
