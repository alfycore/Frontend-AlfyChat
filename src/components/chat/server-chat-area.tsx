'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { HashIcon, SmileIcon, SendIcon, PaperclipIcon, XIcon, MenuIcon, UsersIcon, MegaphoneIcon, ForumIcon, GalleryIcon, PollIcon, SuggestionIcon, DocIcon, CountingIcon, VentIcon, ThreadIcon, MediaIcon, StageIcon } from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useUIStyle } from '@/hooks/use-ui-style';
import { getLastSeen } from '@/lib/notification-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { EmojiPicker } from '@/components/chat/emoji-picker';
import {
  MessageItem,
  shouldGroup,
  type MessageSender,
  type MessageData,
} from '@/components/chat/message-item';
import { ForumView } from '@/components/chat/forum-view';
import { GalleryView } from '@/components/chat/gallery-view';
import { AnnouncementView } from '@/components/chat/announcement-view';
import { PollView } from '@/components/chat/poll-view';
import { SuggestionView } from '@/components/chat/suggestion-view';
import { DocView } from '@/components/chat/doc-view';
import { CountingView } from '@/components/chat/counting-view';
import { VentView } from '@/components/chat/vent-view';
import { ThreadView } from '@/components/chat/thread-view';
import { MediaView } from '@/components/chat/media-view';
import { MinigameView } from '@/components/chat/minigame-view';
import { TriviaView } from '@/components/chat/trivia-view';
import { cn } from '@/lib/utils';

interface ServerChatAreaProps {
  serverId: string;
  channelId: string;
  channelName?: string;
  channelType?: string;
}

/* ── Utilities ─────────────────────────────────────────────────────────────── */

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

function groupByDate(messages: MessageData[]) {
  const groups: Array<{ date: string; messages: MessageData[] }> = [];
  for (const msg of messages) {
    const d = formatDate(msg.createdAt);
    if (!groups.length || groups[groups.length - 1].date !== d) {
      groups.push({ date: d, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

/* ── Channel type meta ─────────────────────────────────────────────────────── */

const CHANNEL_META: Record<string, { icon: any; label: string; color: string; bg: string; description: string }> = {
  text:         { icon: HashIcon,        label: 'Texte',       color: 'text-muted-foreground/70', bg: 'bg-foreground/[0.06]',   description: 'C\'est le début du salon' },
  announcement: { icon: MegaphoneIcon,   label: 'Annonce',     color: 'text-amber-400',           bg: 'bg-amber-400/15',        description: 'Seuls les modérateurs peuvent publier ici' },
  forum:        { icon: ForumIcon,       label: 'Forum',       color: 'text-blue-400',            bg: 'bg-blue-400/15',         description: 'Créez des fils de discussion' },
  gallery:      { icon: GalleryIcon,     label: 'Galerie',     color: 'text-pink-400',            bg: 'bg-pink-400/15',         description: 'Partagez vos images et médias' },
  poll:         { icon: PollIcon,        label: 'Sondage',     color: 'text-orange-400',          bg: 'bg-orange-400/15',       description: 'Proposez des sondages à la communauté' },
  suggestion:   { icon: SuggestionIcon,  label: 'Suggestion',  color: 'text-emerald-400',         bg: 'bg-emerald-400/15',      description: 'Soumettez et votez pour des idées' },
  doc:          { icon: DocIcon,         label: 'Document',    color: 'text-sky-400',             bg: 'bg-sky-400/15',          description: 'Documents collaboratifs' },
  counting:     { icon: CountingIcon,    label: 'Comptage',    color: 'text-rose-400',            bg: 'bg-rose-400/15',         description: 'Comptez ensemble !' },
  vent:         { icon: VentIcon,        label: 'Défouloir',   color: 'text-red-400',             bg: 'bg-red-400/15',          description: 'Un espace pour s\'exprimer librement' },
  thread:       { icon: ThreadIcon,      label: 'Fil',         color: 'text-violet-400',          bg: 'bg-violet-400/15',       description: 'Discussions en fils de conversation' },
  media:        { icon: MediaIcon,       label: 'Média',       color: 'text-cyan-400',            bg: 'bg-cyan-400/15',         description: 'Partagez vidéos et contenus multimédia' },
  stage:        { icon: StageIcon,       label: 'Scène',       color: 'text-purple-400',          bg: 'bg-purple-400/15',       description: 'Présentations et événements en direct' },
  minigame:     { icon: null,            label: 'Mini-Jeux',   color: 'text-indigo-400',          bg: 'bg-indigo-400/15',       description: 'Jouez ensemble !' },
  trivia:       { icon: null,            label: 'Trivia',      color: 'text-yellow-400',          bg: 'bg-yellow-400/15',       description: 'Quiz et questions de culture générale' },
};

const getChannelMeta = (type?: string) => CHANNEL_META[type || 'text'] ?? CHANNEL_META.text;

/* ── Announcement banner ────────────────────────────────────────────────────── */

function AnnouncementBanner({ channelName }: { channelName?: string }) {
  const ui = useUIStyle();
  return (
    <div className={`mx-4 mb-2 mt-3 flex items-center gap-3 px-4 py-3 ${ui.announcementBanner}`}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 shadow-sm shadow-amber-500/10">
        <MegaphoneIcon size={15} className="text-amber-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-amber-400">Salon d&apos;annonces</p>
        <p className="text-[11px] text-muted/70">Seuls les modérateurs peuvent publier dans <span className="font-medium text-foreground/80">#{channelName || 'annonces'}</span>.</p>
      </div>
    </div>
  );
}


function DateSeparator({ date }: { date: string }) {
  const ui = useUIStyle();
  return (
    <div className="relative mx-4 my-5 flex select-none items-center">
      <Separator className="flex-1 opacity-30" />
      <Badge variant="secondary" className={`mx-3 shrink-0 text-[11px] font-medium text-muted-foreground ${ui.chip}`}>
        {date}
      </Badge>
      <Separator className="flex-1 opacity-30" />
    </div>
  );
}

function TypingIndicator({ users }: { users: string[] }) {
  if (!users.length) return null;
  const text =
    users.length === 1
      ? `${users[0]} est en train d'écrire`
      : users.length === 2
        ? `${users[0]} et ${users[1]} sont en train d'écrire`
        : `${users.length} personnes sont en train d'écrire`;

  return (
      <div className="flex h-5 items-center gap-1.5 px-4 text-xs text-muted">
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block size-1 animate-bounce rounded-full bg-muted"
            style={{ animationDelay: `${i * 0.18}s`, animationDuration: '0.9s' }}
          />
        ))}
      </span>
      <span>{text}…</span>
    </div>
  );
}

function LoadingSkeleton() {
  const widths = [70, 50, 80, 40, 65, 55];
  return (
    <div className="space-y-5 px-4 py-6">
      {widths.map((w, i) => (
        <div key={i} className={cn('flex gap-3', i % 3 !== 0 && 'pl-11')}>
          {i % 3 === 0 && (
            <Skeleton className="size-10 shrink-0 rounded-full border border-border/30 bg-foreground/[0.06]" />
          )}
          <div className="flex-1 space-y-2">
            {i % 3 === 0 && <Skeleton className="h-3 w-24 rounded-xl border border-border/30 bg-foreground/[0.06]" />}
            <Skeleton className="h-4 rounded-xl border border-border/30 bg-foreground/[0.06]" style={{ width: `${w}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────────────── */

export function ServerChatArea({ serverId, channelId, channelName, channelType }: ServerChatAreaProps) {
  const meta = getChannelMeta(channelType);
  const { user } = useAuth();
  const { isMobile, toggleSidebar, toggleMemberList, toggleMemberListDesktop, memberListDesktopVisible } = useMobileNav();
  const ui = useUIStyle();

  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});

  // Timestamp de la dernière visite — capturé à l'ouverture du salon
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(() => getLastSeen(`channel:${channelId}`));

  // Effacer le surlignage des messages non lus après 5 secondes de lecture
  useEffect(() => {
    if (!lastSeenAt) return;
    const timer = setTimeout(() => {
      setLastSeenAt(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [lastSeenAt]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isAtBottomRef = useRef(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesById = useMemo(() => new Map<string, MessageData>(), [channelId]);
  const typingTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  /* Normalise sender from any backend format */
  const normalizeSender = useCallback((m: any): MessageSender | undefined => {
    if (m.sender && (m.sender.username || m.sender.displayName)) return m.sender;
    const id = m.senderId || m.sender_id || '';
    const username = m.senderUsername || m.senderName || m.sender_username || '';
    if (!id && !username) return undefined;
    return {
      id,
      username: username || 'Utilisateur',
      displayName: m.senderDisplayName || m.senderName || m.sender_display_name || username || undefined,
      avatarUrl: m.senderAvatar || m.senderAvatarUrl || m.sender_avatar_url || undefined,
    };
  }, []);

  /* Load messages on channel change */
  useEffect(() => {
    setMessages([]);
    setIsLoading(true);
    setTypingUsers({});
    messagesById.clear();

    socketService.requestMessageHistory(serverId, channelId, { limit: 50 }, (res: any) => {
      if (res?.messages) {
        const msgs = (res.messages as any[]).map((m: any) => ({
          ...m,
          authorId: m.authorId || m.senderId || m.sender_id,
          sender: normalizeSender(m),
          reactions: m.reactions || [],
          isSystem: m.isSystem || m.is_system || false,
        })) as MessageData[];
        msgs.forEach((m) => messagesById.set(m.id, m));
        setMessages(msgs);
      }
      setIsLoading(false);
      setTimeout(scrollToBottom, 50);
    });

    socketService.joinChannel(channelId);
    return () => {
      socketService.leaveChannel(channelId);
    };
  }, [serverId, channelId]);

  /* ResizeObserver: auto-scroll when images load */
  useEffect(() => {
    if (!messagesContainerRef.current) return;
    const obs = new ResizeObserver(() => {
      if (isAtBottomRef.current) scrollToBottom();
    });
    obs.observe(messagesContainerRef.current);
    return () => obs.disconnect();
  }, [scrollToBottom]);

  /* Real-time events */
  useEffect(() => {
    const handleNew = (data: any) => {
      const msg = data?.payload ?? data;
      if (msg.channelId !== channelId && msg.channel_id !== channelId) return;
      const normalised: MessageData = {
        id: msg.id,
        content: msg.content,
        authorId: msg.senderId || msg.sender_id,
        sender: normalizeSender(msg),
        createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
        updatedAt: msg.updatedAt || msg.updated_at,
        reactions: msg.reactions || [],
        replyToId: msg.replyToId || msg.reply_to_id || undefined,
        isSystem: msg.isSystem || msg.is_system || false,
      };
      if (messagesById.has(normalised.id)) return;
      messagesById.set(normalised.id, normalised);
      setMessages((prev) => [...prev, normalised]);
      if (normalised.authorId) {
        setTypingUsers((prev) => {
          const n = { ...prev };
          delete n[normalised.authorId];
          return n;
        });
      }
      if (isAtBottomRef.current) setTimeout(scrollToBottom, 30);
    };

    const handleEdited = (data: any) => {
      const { messageId, content } = data?.payload ?? data;
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content, isEdited: true } : m)));
    };

    const handleDeleted = (data: any) => {
      const { messageId } = data?.payload ?? data;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    const handleTypingStart = (data: any) => {
      const { userId, username, channelId: ch } = data?.payload ?? data;
      if (ch !== channelId || userId === user?.id) return;
      if (typingTimersRef.current[userId]) clearTimeout(typingTimersRef.current[userId]);
      setTypingUsers((prev) => ({ ...prev, [userId]: username || 'Quelqu\'un' }));
      typingTimersRef.current[userId] = setTimeout(() => {
        setTypingUsers((prev) => {
          const n = { ...prev };
          delete n[userId];
          return n;
        });
      }, 4000);
    };

    const handleTypingStop = (data: any) => {
      const { userId, channelId: ch } = data?.payload ?? data;
      if (ch !== channelId) return;
      if (typingTimersRef.current[userId]) clearTimeout(typingTimersRef.current[userId]);
      setTypingUsers((prev) => {
        const n = { ...prev };
        delete n[userId];
        return n;
      });
    };

    socketService.onServerMessageNew(handleNew);
    socketService.onServerMessageEdited(handleEdited);
    socketService.onServerMessageDeleted(handleDeleted);
    socketService.on('SERVER_TYPING_START', handleTypingStart);
    socketService.on('SERVER_TYPING_STOP', handleTypingStop);
    return () => {
      socketService.off('SERVER_MESSAGE_NEW', handleNew);
      socketService.off('SERVER_MESSAGE_EDITED', handleEdited);
      socketService.off('SERVER_MESSAGE_DELETED', handleDeleted);
      socketService.off('SERVER_TYPING_START', handleTypingStart);
      socketService.off('SERVER_TYPING_STOP', handleTypingStop);
    };
  }, [channelId, user?.id]);

  /* Scroll tracking */
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
  }, []);

  /* Send */
  const handleSend = useCallback(() => {
    if (!messageInput.trim() || !user) return;
    socketService.sendServerMessage({
      serverId,
      channelId,
      content: messageInput.trim(),
      replyToId: replyId ?? undefined,
    });
    setMessageInput('');
    setReplyId(null);
    socketService.stopServerTyping(serverId, channelId);
    clearTimeout(typingTimeoutRef.current);
    setTimeout(scrollToBottom, 50);
  }, [messageInput, user, serverId, channelId, replyId, scrollToBottom]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessageInput(e.target.value);
      if (e.target.value.trim()) {
        socketService.startServerTyping(serverId, channelId);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socketService.stopServerTyping(serverId, channelId);
        }, 3000);
      } else {
        socketService.stopServerTyping(serverId, channelId);
        clearTimeout(typingTimeoutRef.current);
      }
    },
    [serverId, channelId],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  /* Edit handlers */
  const handleStartEdit = useCallback((id: string, content: string) => {
    setEditingMessageId(id);
    setEditInput(content);
  }, []);

  const handleSetEditInput: Dispatch<SetStateAction<string>> = useCallback((v) => {
    setEditInput(v);
  }, []);

  const handleSaveEdit = useCallback(
    (id: string) => {
      if (!editInput.trim()) return;
      socketService.editServerMessage(serverId, id, editInput.trim(), channelId);
      setEditingMessageId(null);
      setEditInput('');
    },
    [editInput, serverId, channelId],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditInput('');
  }, []);

  const handleDeleteMessage = useCallback(
    (id: string) => {
      socketService.deleteServerMessage(serverId, id, channelId);
    },
    [serverId, channelId],
  );

  const handleReply = useCallback((id: string, content: string, authorName: string) => {
    setReplyId(id);
    setReplyContent(content);
    setReplyAuthor(authorName);
    textareaRef.current?.focus();
  }, []);

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
  }, []);

  const handleImageUpload = useCallback(
    async (file: File) => {
      const res = await api.uploadServerFile(serverId, file, channelId);
      if (res.success && res.data) {
        const fileUrl = resolveMediaUrl(`/api/servers/${serverId}${res.data.url}`) || res.data.url;
        socketService.sendServerMessage({ serverId, channelId, content: fileUrl });
      }
    },
    [serverId, channelId],
  );

  /* ── Paste image from clipboard ── */
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItems = items.filter(item => item.kind === 'file' && item.type.startsWith('image/'));
      if (!imageItems.length) return;
      e.preventDefault();

      const file = imageItems[0].getAsFile();
      if (file) handleImageUpload(file);
    },
    [handleImageUpload],
  );

  const currentUser: MessageSender | null = user
    ? {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatarUrl: user.avatarUrl ?? undefined,
      }
    : null;

  const dateGroups = useMemo(() => groupByDate(messages), [messages]);
  const typingUsernames = Object.values(typingUsers);

  if (channelType === 'forum') {
    return (
      <ForumView
        serverId={serverId}
        channelId={channelId}
        channelName={channelName}
      />
    );
  }

  if (channelType === 'gallery') {
    return (
      <GalleryView
        serverId={serverId}
        channelId={channelId}
        channelName={channelName}
      />
    );
  }

  if (channelType === 'announcement') {
    return (
      <AnnouncementView
        serverId={serverId}
        channelId={channelId}
        channelName={channelName}
      />
    );
  }

  if (channelType === 'poll') {
    return <PollView serverId={serverId} channelId={channelId} channelName={channelName} />;
  }

  if (channelType === 'suggestion') {
    return <SuggestionView serverId={serverId} channelId={channelId} channelName={channelName} />;
  }

  if (channelType === 'doc') {
    return <DocView serverId={serverId} channelId={channelId} channelName={channelName} />;
  }

  if (channelType === 'counting') {
    return <CountingView serverId={serverId} channelId={channelId} channelName={channelName} />;
  }

  if (channelType === 'vent') {
    return <VentView serverId={serverId} channelId={channelId} channelName={channelName} />;
  }

  if (channelType === 'thread') {
    return <ThreadView serverId={serverId} channelId={channelId} channelName={channelName} />;
  }

  if (channelType === 'media') {
    return <MediaView serverId={serverId} channelId={channelId} channelName={channelName} />;
  }

  if (channelType === 'minigame') {
    return <MinigameView serverId={serverId} channelId={channelId} channelName={channelName} />;
  }

  if (channelType === 'trivia') {
    return <TriviaView serverId={serverId} channelId={channelId} channelName={channelName} />;
  }

  return (
    <div className={`flex h-full min-h-0 flex-col ${ui.contentBg}`}>
      {/* ── Header ── */}
      <div className={`flex h-14 shrink-0 items-center gap-2.5 px-3 ${ui.header}`}>
        {isMobile && (
          <Button size="icon-sm" variant="ghost"
            className="size-8 shrink-0 rounded-xl text-muted-foreground"
            onClick={toggleSidebar}
          >
            <MenuIcon size={16} />
          </Button>
        )}
        <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-[8px]', meta.bg)}>
          <meta.icon size={13} className={meta.color} />
        </div>
        <h2 className="truncate text-[14px] font-semibold text-foreground">{channelName || 'salon'}</h2>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            size="icon-sm" variant="ghost"
            className={cn(
              'size-8 rounded-xl transition-colors',
              !isMobile && memberListDesktopVisible
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={isMobile ? toggleMemberList : toggleMemberListDesktop}
          >
            <UsersIcon size={16} />
          </Button>
        </div>
      </div>

      {/* ── Messages ── */}
      <ScrollArea className="min-h-0 flex-1" ref={scrollRef} onScroll={handleScroll}>
        <div ref={messagesContainerRef}>
          {isLoading ? (
            <LoadingSkeleton />
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className={cn('mb-4 flex size-16 items-center justify-center rounded-[18px]', meta.bg)}>
                <meta.icon size={28} className={cn(meta.color, 'opacity-70')} />
              </div>
              <h3 className="mb-1.5 text-[17px] font-semibold tracking-[-0.015em] text-foreground">
                Bienvenue dans #{channelName || 'salon'}
              </h3>
              <p className="text-[13px] text-muted-foreground">{meta.description}.</p>
            </div>
          ) : (
            <div className="pb-1 pt-4">
              {channelType === 'announcement' && <AnnouncementBanner channelName={channelName} />}
              {(() => {
                // Trouver le premier message non lu (après lastSeenAt)
                let firstUnreadId: string | null = null;
                if (lastSeenAt) {
                  const lastSeenTime = new Date(lastSeenAt).getTime();
                  for (const g of dateGroups) {
                    for (const m of g.messages) {
                      const msgTime = new Date(m.createdAt).getTime();
                      if (msgTime > lastSeenTime && m.authorId !== user?.id) {
                        firstUnreadId = m.id;
                        break;
                      }
                    }
                    if (firstUnreadId) break;
                  }
                }
                let foundFirst = false;
                return dateGroups.map((group, gi) => (
                  <div key={gi}>
                    <DateSeparator date={group.date} />
                    {group.messages.map((message, midx) => {
                      const replyMsg = message.replyToId
                        ? (messagesById.get(message.replyToId) ?? null)
                        : null;
                      const grouped =
                        midx > 0
                          ? shouldGroup(group.messages[midx - 1], message)
                          : false;
                      const showDivider = firstUnreadId === message.id && !foundFirst;
                      if (showDivider) foundFirst = true;
                      const isUnread = foundFirst && message.authorId !== user?.id;
                      return (
                        <div key={message.id}>
                          {showDivider && (
                            <div className="my-2 flex items-center gap-2 px-4">
                              <div className="h-px flex-1 bg-destructive/40" />
                              <span className="shrink-0 text-[11px] font-semibold text-destructive">Nouveaux messages</span>
                              <div className="h-px flex-1 bg-destructive/40" />
                            </div>
                          )}
                          <div className={cn(isUnread && 'bg-accent/5 border-l-2 border-accent/30')}>
                            <MessageItem
                              message={message}
                              currentUser={currentUser}
                              isEditing={editingMessageId === message.id}
                              editInput={editInput}
                              isGrouped={grouped}
                              replyMessage={replyMsg}
                              onSetEditInput={handleSetEditInput}
                              onReply={handleReply}
                              onCopy={handleCopy}
                              onReaction={() => {}}
                              onRemoveReaction={() => {}}
                              onStartEdit={handleStartEdit}
                              onSaveEdit={handleSaveEdit}
                              onCancelEdit={handleCancelEdit}
                              onDelete={handleDeleteMessage}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ── Typing indicator ── */}
      <div className="h-5 shrink-0">
        <TypingIndicator users={typingUsernames} />
      </div>

      {/* ── Input area ── */}
      <div className="shrink-0 px-4 pb-4">
        {/* Reply bar */}
        {replyId && (
          <div className={`flex items-center gap-2 px-3 py-1.5 text-xs ${ui.replyBar}`}>
            <span className="flex-1 truncate text-muted">
              Répondre à{' '}
              <span className="font-medium text-foreground/80">{replyAuthor}</span>
              <span className="ml-1 text-muted/60">
                : {replyContent.slice(0, 90)}
                {replyContent.length > 90 ? '…' : ''}
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-5 min-w-0 rounded p-0 text-muted-foreground"
              onClick={() => setReplyId(null)}
            >
              <XIcon size={12} />
            </Button>
          </div>
        )}

        {/* Input bar */}
        <div
          className={cn(
            `flex items-end gap-1 px-2 py-1.5 transition-colors focus-within:border-primary/30 ${ui.inputBar}`,
            replyId && 'rounded-tl-none rounded-tr-none border-t-0',
          )}
        >
          {/* Attachment */}
          <label className="cursor-pointer self-end pb-0.5">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
                e.target.value = '';
              }}
            />
            <span className="inline-flex size-8 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-secondary/40 hover:text-foreground">
              <PaperclipIcon size={16} />
            </span>
          </label>

          {/* Text */}
          <textarea
            ref={textareaRef}
            value={messageInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={`Message #${channelName || 'salon'}`}
            className="min-h-9 max-h-48 flex-1 resize-none border-0 bg-transparent py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none"
            rows={1}
          />

          {/* Emoji */}
          <div className="self-end pb-0.5">
            <EmojiPicker onSelect={(emoji) => setMessageInput((prev) => prev + emoji)}>
              <Button size="icon-sm" variant="ghost" className="size-8 rounded-xl text-muted-foreground">
                <SmileIcon size={16} />
              </Button>
            </EmojiPicker>
          </div>

          {/* Send */}
          <div className="self-end pb-0.5">
            <Button
              size="icon-sm"
              className={cn(
                'size-8 rounded-xl transition-all',
                messageInput.trim()
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                  : 'bg-primary/15 text-primary/60 hover:bg-primary/25 hover:text-primary',
              )}
              onClick={handleSend}
              disabled={!messageInput.trim()}
            >
              <SendIcon size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
