'use client';

/* ════════════════════════════════════════════════════════════════════════════
 *  Chat areas — DM (ChatArea), serveur (ServerChatArea) et groupe (GroupChatArea)
 *  regroupés dans un seul fichier. Composants présentationnels partagés dans
 *  ./chat-ui. Logique inchangée par rapport aux fichiers d'origine.
 * ════════════════════════════════════════════════════════════════════════════ */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  memo,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  MessageCircleIcon,
  ShieldCheckIcon,
  HashIcon,
  XIcon,
  PhoneIcon,
  VideoIcon,
  BanIcon,
  SearchIcon,
  MenuIcon,
  Maximize2Icon,
  UsersRoundIcon,
  MoreHorizontalIcon,
  LogOutIcon,
  SettingsIcon,
  CrownIcon,
  UserPlusIcon,
  UsersIcon,
  MegaphoneIcon,
  ForumIcon,
  GalleryIcon,
  PollIcon,
  SuggestionIcon,
  DocIcon,
  CountingIcon,
  VentIcon,
  ThreadIcon,
  MediaIcon,
  StageIcon,
} from '@/components/icons';
import { useTranslation } from '@/components/locale-provider';
import { useMessages } from '@/hooks/use-messages';
import { useAuth } from '@/hooks/use-auth';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useCallContext } from '@/hooks/use-call-context';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useLayoutPrefs, densityCls } from '@/hooks/use-layout-prefs';
import { notify } from '@/hooks/use-notification';
import { getLastSeen, markLastSeen } from '@/lib/notification-store';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { MentionPopover, type MentionUser } from '@/components/chat/mention-popover';
import { CallPanel } from '@/components/chat/call-panel';
import { SearchPanel } from '@/components/chat/search-panel';
import { UserProfilePopover } from '@/components/chat/user-profile-popover';
import { GroupSettingsDialog } from '@/components/chat/group-settings-dialog';
import {
  MessageItem,
  shouldGroup,
  type MessageSender,
  type MessageData,
} from '@/components/chat/message-item';
import {
  TypingIndicator,
  NewMessagesDivider,
  ChatEmptyState,
  MessagesSkeleton,
  ChatHeader,
  HeaderAction,
  ChatIconTile,
  ChatComposer,
} from '@/components/chat/chat-ui';
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

/* ════════════════ DM — ChatArea ════════════════ */

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

/* ─────────────────────────────────────────────────────────────────────────── */
/*  MessageList (memoized)                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

const MessageList = memo(function MessageList({
  dedupedMessages,
  editingMessageId,
  editInput,
  messagesById,
  highlightedMessageId,
  currentUser,
  recipientName,
  isLoadingMoreMessages,
  messagesContainerRef,
  lastSeenAt,
  onSetEditInput,
  onReply,
  onCopy,
  onReaction,
  onRemoveReaction,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: MessageListProps) {
  const { t } = useTranslation();
  // Trouver l'index du premier message non lu (après lastSeenAt)
  let newMessagesDividerIdx = -1;
  if (lastSeenAt) {
    const lastSeenTime = new Date(lastSeenAt).getTime();
    for (let i = 0; i < dedupedMessages.length; i++) {
      const msgTime = new Date(dedupedMessages[i].createdAt).getTime();
      if (msgTime > lastSeenTime && dedupedMessages[i].authorId !== currentUser?.id) {
        newMessagesDividerIdx = i;
        break;
      }
    }
  }

  return (
    <div className="space-y-0" ref={messagesContainerRef}>
      {isLoadingMoreMessages && (
        <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
          <Spinner size="sm" />
          <span className="text-xs">{t.chat.loadingOlder}</span>
        </div>
      )}

      {dedupedMessages.map((message, idx) => {
        const isEditing = editingMessageId === message.id;
        const grouped = idx > 0 && shouldGroup(dedupedMessages[idx - 1], message);
        const isHighlighted = highlightedMessageId === message.id;
        const isUnread = newMessagesDividerIdx >= 0 && idx >= newMessagesDividerIdx && message.authorId !== currentUser?.id;
        const showDivider = idx === newMessagesDividerIdx;

        return (
          <div key={message.id}>
            {showDivider && <NewMessagesDivider label={t.chat.newMessages} />}
            <div
              className={cn(
                isHighlighted && 'animate-pulse rounded-lg bg-primary/10 transition-colors duration-500',
                isUnread && !isHighlighted && 'bg-accent/5 border-l-2 border-accent/30',
              )}
            >
              <MessageItem
              message={message}
              currentUser={currentUser}
              recipientName={recipientName}
              isEditing={isEditing}
              editInput={isEditing ? editInput : ''}
              isGrouped={grouped}
              replyMessage={
                message.replyToId
                  ? (messagesById.get(message.replyToId) ?? null)
                  : null
              }
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

/* ─────────────────────────────────────────────────────────────────────────── */
/*  ChatArea                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */

export function ChatArea({ channelId, recipientId, recipientName }: ChatAreaProps) {
  const { t, tx } = useTranslation();
  const { user } = useAuth();
  const ui = useUIStyle();
  const { isMobile, openSidebar } = useMobileNav();
  const { prefs } = useLayoutPrefs();
  const d = densityCls(prefs.density);

  /* ── Call panel state ── */
  const [callMinimized, setCallMinimized] = useState(false);
  const [callPanelHeight, setCallPanelHeight] = useState(220);
  const callPanelRef = useRef<HTMLDivElement>(null);

  /* ── Local state ── */
  // Uncontrolled textarea — value lives in textareaRef.current.value to avoid re-rendering the
  // entire component on every keystroke. Only hasContent (boolean) is kept as state so the
  // send button updates when the user starts/stops typing.
  const [hasContent, setHasContent] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    content: string;
    authorName: string;
  } | null>(null);

  const [cooldownActive, setCooldownActive] = useState(false);
  const [iBlockedThem, setIBlockedThem] = useState(false);
  const [theyBlockedMe, setTheyBlockedMe] = useState(false);

  const [pendingAttachments, setPendingAttachments] = useState<
    { name: string; url: string; isImage: boolean }[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [e2eeBannerDismissed, setE2eeBannerDismissed] = useState(false);

  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionVisible, setMentionVisible] = useState(false);

  // Timestamp de la dernière visite — capturé à l'ouverture de la conversation
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(() => {
    if (recipientId) return getLastSeen(recipientId);
    return null;
  });

  // Effacer le surlignage des messages non lus après 5 secondes de lecture
  useEffect(() => {
    if (!lastSeenAt) return;
    const timer = setTimeout(() => {
      setLastSeenAt(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [lastSeenAt]);

  /* ── Refs ── */
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isAtBottomRef = useRef(true);
  const editInputRef = useRef('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const msgTimestampsRef = useRef<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTypingRef = useRef(false);
  const hasInitialScrollRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  /** Resolve the actual scrollable viewport inside Radix ScrollArea */
  const getViewport = useCallback(() => {
    return scrollAreaRef.current?.querySelector<HTMLDivElement>('[data-slot="scroll-area-viewport"]') ?? null;
  }, []);

  /* ── Hooks ── */
  const {
    initiateCall,
    callStatus,
    callType,
    callConversationId,
    callRecipientId,
    callChannelId,
    isGroup: callIsGroup,
    callCategory,
    callMode,
    tierLabel,
    handRaised,
    callerName: ctxCallerName,
    callerAvatar,
    localStream,
    remoteStreams,
    screenStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    remoteIsScreenSharing,
    mediaError,
    callDuration,
    participantInfo,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    endCall,
    leaveCall,
    toggleHand,
  } = useCallContext();

  const {
    messages,
    typingUsers,
    isLoading,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    startTyping,
    stopTyping,
    hasMoreMessages,
    isLoadingMoreMessages,
    loadMoreMessages,
    hasEncryptedPlaceholders,
    e2eeRecoveryStatus,
    requestE2EEHistory,
  } = useMessages(channelId || undefined, recipientId);

  /* ── Derived data ── */
  const dedupedMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [messages]);

  const messagesById = useMemo(
    () => new Map(dedupedMessages.map((m) => [m.id, m])),
    [dedupedMessages],
  );

  const mentionUsersMemo = useMemo(() => {
    const usersMap = new Map<string, MentionUser>();
    for (const msg of messages) {
      if (msg.sender) {
        usersMap.set(msg.sender.id, {
          id: msg.sender.id,
          username: msg.sender.username,
          displayName: msg.sender.displayName,
          avatarUrl: msg.sender.avatarUrl,
        });
      }
    }
    if (user) {
      usersMap.set(user.id, {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      });
    }
    return Array.from(usersMap.values());
  }, [messages, user]);

  /* ── Scroll helpers ── */
  const scrollToBottom = useCallback(() => {
    const vp = getViewport();
    if (vp) vp.scrollTop = vp.scrollHeight;
  }, [getViewport]);

  const checkIfAtBottom = useCallback(() => {
    const vp = getViewport();
    if (vp) {
      const { scrollTop, scrollHeight, clientHeight } = vp;
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  }, [getViewport]);

  /* ── Effects ── */
  // Scroll to bottom when new messages arrive (only if already at bottom)
  useEffect(() => {
    if (isAtBottomRef.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  // Scroll to bottom when switching conversations
  useEffect(() => {
    // Reset to bottom on conversation change
    isAtBottomRef.current = true;
    hasInitialScrollRef.current = false;
    // Use rAF to ensure the DOM has rendered messages before scrolling
    requestAnimationFrame(() => {
      scrollToBottom();
      // Double rAF for Radix ScrollArea which may need an extra frame
      requestAnimationFrame(scrollToBottom);
    });
  }, [channelId, recipientId, scrollToBottom]);

  // Scroll to bottom once on initial load only
  useEffect(() => {
    if (!isLoading && messages.length > 0 && !hasInitialScrollRef.current) {
      hasInitialScrollRef.current = true;
      requestAnimationFrame(() => {
        scrollToBottom();
        requestAnimationFrame(scrollToBottom);
      });
    }
  }, [isLoading, scrollToBottom, messages.length]);

  useEffect(() => {
    const scroller = getViewport();
    if (!scroller) return;
    const onLoad = (e: Event) => {
      if ((e.target as HTMLElement).tagName === 'IMG' && isAtBottomRef.current) scrollToBottom();
    };
    scroller.addEventListener('load', onLoad, true);
    return () => scroller.removeEventListener('load', onLoad, true);
  }, [scrollToBottom, getViewport]);

  useEffect(() => {
    const el = getViewport();
    if (el) {
      el.addEventListener('scroll', checkIfAtBottom);
      return () => el.removeEventListener('scroll', checkIfAtBottom);
    }
  }, [checkIfAtBottom, getViewport]);

  useEffect(() => {
    const el = getViewport();
    if (!el) return;
    const handleScrollTop = () => {
      checkIfAtBottom();
      if (el.scrollTop < 120 && hasMoreMessages && !isLoadingMoreMessages) {
        isAtBottomRef.current = false;
        const prevHeight = el.scrollHeight;
        loadMoreMessages().then(() => {
          requestAnimationFrame(() => {
            const vp = getViewport();
            if (vp) vp.scrollTop = vp.scrollHeight - prevHeight;
          });
        });
      }
    };
    el.addEventListener('scroll', handleScrollTop);
    return () => el.removeEventListener('scroll', handleScrollTop);
  }, [checkIfAtBottom, hasMoreMessages, isLoadingMoreMessages, loadMoreMessages, getViewport]);

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    const obs = new ResizeObserver(() => {
      if (isAtBottomRef.current) scrollToBottom();
    });
    obs.observe(messagesContainerRef.current);
    return () => obs.disconnect();
  }, [scrollToBottom]);


  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  }, []);

  useEffect(() => {
    setSearchOpen(false);
    setPendingAttachments([]);
    setE2eeBannerDismissed(false);
  }, [channelId, recipientId]);

  /* ── Block status (DM) ── */
  useEffect(() => {
    if (!recipientId) {
      setIBlockedThem(false);
      setTheyBlockedMe(false);
      return;
    }
    api
      .getBlockStatus(recipientId)
      .then((res: any) => {
        const data = res?.data ?? res;
        if (data && typeof data === 'object') {
          setIBlockedThem(!!data.iBlockedThem);
          setTheyBlockedMe(!!data.theyBlockedMe);
        }
      })
      .catch(() => {});
  }, [recipientId]);

  /* ── File upload ── */
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      e.target.value = '';

      const MAX = 10 * 1024 * 1024;
      const ACCEPTED_IMAGES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      const ACCEPTED_DOCS = [
        'application/pdf',
        'application/x-pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'application/zip',
        'application/x-zip-compressed',
        'application/octet-stream',
      ];
      const ACCEPTED = [...ACCEPTED_IMAGES, ...ACCEPTED_DOCS];
      const ACCEPTED_EXTS = [
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        'txt', 'csv', 'png', 'jpg', 'jpeg', 'gif', 'webp',
      ];

      for (const file of files) {
        if (file.size > MAX) {
          notify.error(t.chat.fileTooLarge, tx(t.chat.fileTooLargeDesc, { name: file.name }));
          continue;
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (!ACCEPTED.includes(file.type) && !ACCEPTED_EXTS.includes(ext)) {
          notify.error(t.chat.fileTypeError, tx(t.chat.fileTypeErrorDesc, { name: file.name }));
          continue;
        }
        setIsUploading(true);
        try {
          const res = await api.uploadDocument(file);
          if (res.success && res.data) {
            setPendingAttachments((prev) => [
              ...prev,
              { name: file.name, url: res.data!.url, isImage: res.data!.isImage },
            ]);
          } else {
            notify.error(t.chat.uploadError, res.error || t.chat.uploadError);
          }
        } finally {
          setIsUploading(false);
        }
      }
    },
    [],
  );

  /* ── Paste image from clipboard ── */
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItems = items.filter(item => item.kind === 'file' && item.type.startsWith('image/'));
      if (!imageItems.length) return;
      e.preventDefault();

      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;
        if (file.size > 10 * 1024 * 1024) {
          notify.error(t.chat.fileTooLarge, t.chat.fileTooLargeDesc.replace('{name}', 'image'));
          continue;
        }
        setIsUploading(true);
        try {
          const res = await api.uploadDocument(file);
          if (res.success && res.data) {
            setPendingAttachments((prev) => [
              ...prev,
              { name: file.name || 'image.png', url: res.data!.url, isImage: res.data!.isImage },
            ]);
          } else {
            notify.error(t.chat.uploadError, res.error || t.chat.uploadError);
          }
        } finally {
          setIsUploading(false);
        }
      }
    },
    [],
  );

  /* ── Send message ── */
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = messageInput.trim();
    const hasAttachments = pendingAttachments.length > 0;
    if (!hasText && !hasAttachments) return;

    const now = Date.now();
    msgTimestampsRef.current = msgTimestampsRef.current.filter((t) => now - t < 5000);
    if (msgTimestampsRef.current.length >= 5) {
      setCooldownActive(true);
      setTimeout(() => setCooldownActive(false), 3000);
      return;
    }
    msgTimestampsRef.current.push(now);

    let content = messageInput.trim();
    for (const att of pendingAttachments) {
      const attStr = att.isImage
        ? `\n[attach:img]:${att.url}`
        : `\n[attach:file]:${att.name}|${att.url}`;
      content = content ? content + attStr : attStr.trimStart();
    }

    const mentionedUserIds: string[] = [];
    if (channelId) {
      const mentionRegex = /(?:^|\s)@(\w+)/g;
      let match: RegExpExecArray | null;
      while ((match = mentionRegex.exec(content)) !== null) {
        const username = match[1].toLowerCase();
        const found = mentionUsersMemo.find(
          (u) => u.username.toLowerCase() === username,
        );
        if (found && !mentionedUserIds.includes(found.id)) {
          mentionedUserIds.push(found.id);
        }
      }
    }

    sendMessage(content, replyingTo?.id, mentionedUserIds.length > 0 ? mentionedUserIds : undefined);
    setMessageInput('');
    setPendingAttachments([]);
    setReplyingTo(null);
    stopTyping();
    isAtBottomRef.current = true;
    scrollToBottom();
  };

  /* ── Edit handlers ── */
  const handleSetEditInput = useCallback((value: SetStateAction<string>) => {
    setEditInput((prev) => {
      const next = typeof value === 'function' ? (value as (p: string) => string)(prev) : value;
      editInputRef.current = next;
      return next;
    });
  }, []);

  const handleStartEdit = useCallback((messageId: string, content: string) => {
    editInputRef.current = content;
    setEditInput(content);
    setEditingMessageId(messageId);
  }, []);

  const handleSaveEdit = useCallback(
    (messageId: string) => {
      const value = editInputRef.current;
      if (value.trim()) editMessage(messageId, value.trim());
      setEditingMessageId(null);
      setEditInput('');
      editInputRef.current = '';
    },
    [editMessage],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditInput('');
    editInputRef.current = '';
  }, []);

  const handleReply = useCallback(
    (messageId: string, content: string, authorName: string) => {
      setReplyingTo({ id: messageId, content, authorName });
      textareaRef.current?.focus();
    },
    [],
  );

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    notify.success('Copié', 'Message copié dans le presse-papiers');
  }, []);

  const handleReaction = useCallback(
    (messageId: string, emoji: string) => addReaction(messageId, emoji),
    [addReaction],
  );
  const handleRemoveReaction = useCallback(
    (messageId: string, emoji: string) => removeReaction(messageId, emoji),
    [removeReaction],
  );

  const handleEmojiInsert = (emoji: string) => {
    setMessageInput((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleGifSelect = (gifUrl: string) => {
    sendMessage(gifUrl);
    isAtBottomRef.current = true;
    setTimeout(scrollToBottom, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionVisible && ['ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Escape'].includes(e.key))
      return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (messageInput.trim()) handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  const handleInputChange = (value: string) => {
    setMessageInput(value);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (value) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        startTyping();
      }
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        stopTyping();
      }, 3000);
    } else {
      isTypingRef.current = false;
      stopTyping();
    }

    const cursorPos = textareaRef.current?.selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/(^|\s)@(\w*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[2]);
      setMentionVisible(true);
    } else {
      setMentionVisible(false);
    }
  };

  const handleMentionSelect = (mentionUser: MentionUser) => {
    const cursorPos = textareaRef.current?.selectionStart ?? messageInput.length;
    const textBeforeCursor = messageInput.slice(0, cursorPos);
    const textAfterCursor = messageInput.slice(cursorPos);
    const mentionMatch = textBeforeCursor.match(/(^|\s)@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index) + mentionMatch[1];
      setMessageInput(`${beforeMention}@${mentionUser.username} ${textAfterCursor}`);
      setMentionVisible(false);
      textareaRef.current?.focus();
    }
  };

  /* ── Call helpers ── */
  const getConversationId = useCallback(() => {
    if (channelId) return channelId;
    if (recipientId && user) {
      const sorted = [user.id, recipientId].sort();
      return `dm_${sorted[0]}_${sorted[1]}`;
    }
    return undefined;
  }, [channelId, recipientId, user]);

  const handleStartVoiceCall = () => {
    if (recipientId) initiateCall(recipientId, 'voice', getConversationId(), recipientName);
  };
  const handleStartVideoCall = () => {
    if (recipientId) initiateCall(recipientId, 'video', getConversationId(), recipientName);
  };

  const isBlocked = iBlockedThem || theyBlockedMe;

  /* ══════════════════════════════════════════════════════════════════════════ */
  /*  Empty state                                                              */
  /* ══════════════════════════════════════════════════════════════════════════ */

  if (!channelId && !recipientId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        {isMobile && (
          <Button
            variant="outline"
            size="lg"
            className="mb-2 gap-2 rounded-xl"
            onClick={openSidebar}
          >
            <MenuIcon size={18} />
            {t.chat.openSidebar}
          </Button>
        )}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-[18px] bg-foreground/6">
            <MessageCircleIcon size={28} className="text-muted-foreground/50" />
          </div>
          <div className="space-y-1">
            <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">{t.chat.welcomeHeading}</p>
            <p className="text-[13px] text-muted-foreground">
              {t.chat.welcomeDesc}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════ */
  /*  Main render                                                              */
  /* ══════════════════════════════════════════════════════════════════════════ */

  return (
    <div data-tour="chat-area" className="flex h-full min-h-0 flex-1 overflow-hidden">
      <div className={cn('flex min-w-0 flex-1 flex-col overflow-hidden', ui.contentBg)}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <ChatHeader
        heightClass={d.headerH}
        onBack={isMobile ? openSidebar : undefined}
        leading={
          <ChatIconTile className={recipientId ? 'bg-primary/8 ring-primary/15' : undefined}>
            {recipientId ? (
              <MessageCircleIcon size={16} className="text-primary" />
            ) : (
              <HashIcon size={16} className="text-muted-foreground/70" />
            )}
          </ChatIconTile>
        }
        title={recipientId ? recipientName || t.chat.privateMessage : t.chat.generalChannel}
        subtitle={recipientId ? t.chat.privateMessage : undefined}
        badge={
          recipientId ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="shrink-0 gap-1 border-success/30 bg-success/10 text-[10px] text-success"
                  >
                    <ShieldCheckIcon size={10} />
                    E2EE
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{t.chat.e2eeTooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : undefined
        }
        actions={
          recipientId ? (
            <div data-tour="call-buttons" className="flex shrink-0 items-center gap-0.5">
              <HeaderAction label={t.chat.searchTooltip} active={searchOpen} onClick={() => setSearchOpen((v) => !v)}>
                <SearchIcon size={15} />
              </HeaderAction>
              <HeaderAction label={t.chat.voiceCall} onClick={handleStartVoiceCall} disabled={callStatus !== 'idle'}>
                <PhoneIcon size={15} />
              </HeaderAction>
              <HeaderAction label={t.chat.videoCall} onClick={handleStartVideoCall} disabled={callStatus !== 'idle'}>
                <VideoIcon size={15} />
              </HeaderAction>
            </div>
          ) : undefined
        }
      />

      {/* ── Call panel ─────────────────────────────────────────────────────── */}
      {callStatus !== 'idle' &&
        callStatus !== 'ended' &&
        (callConversationId === getConversationId() ||
          (recipientId && callRecipientId === recipientId) ||
          (callIsGroup && channelId && callChannelId === channelId)) && (() => {
          const callProps = {
            type: (callType || 'voice') as 'voice' | 'video',
            status: callStatus as 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended',
            localStream,
            remoteStreams,
            screenStream,
            isMuted,
            isVideoOff,
            isScreenSharing,
            remoteIsScreenSharing,
            recipientName: ctxCallerName || recipientName || 'Utilisateur',
            recipientAvatar: callerAvatar,
            currentUserName: user?.displayName || user?.username || 'Vous',
            currentUserAvatar: user?.avatarUrl,
            duration: callDuration,
            mediaError,
            participants: callIsGroup ? Array.from(participantInfo.entries()).map(([uid, info]) => ({ userId: uid, name: info.name, avatar: info.avatar })) : undefined,
            callCategory: callCategory ?? undefined,
            callMode,
            tierLabel,
            handRaised,
            onToggleMute: toggleMute,
            onToggleVideo: toggleVideo,
            onStartScreenShare: startScreenShare,
            onStopScreenShare: stopScreenShare,
            onEndCall: callIsGroup ? leaveCall : endCall,
            onToggleHand: toggleHand,
          };

          if (isMobile) {
            /* ── Mobile: full-screen overlay or floating PiP ── */
            if (callMinimized) {
              return (
                <div
                  className="fixed bottom-4 right-4 z-[60] flex w-36 cursor-pointer flex-col overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl ring-1 ring-white/10"
                  onClick={() => setCallMinimized(false)}
                >
                  <div className="relative aspect-video">
                    {/* Remote video thumbnail */}
                    {Array.from(remoteStreams.values())[0] ? (
                      <video
                        autoPlay playsInline muted
                        ref={(el) => { if (el) el.srcObject = Array.from(remoteStreams.values())[0] ?? null; }}
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-white/30">
                        <Maximize2Icon size={20} />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Maximize2Icon size={16} className="text-white/70" />
                    </div>
                  </div>
                  <div className="px-2 py-1 text-[10px] font-medium text-white/50 truncate">
                    {ctxCallerName || recipientName}
                  </div>
                </div>
              );
            }
            return (
              <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950">
                <CallPanel {...callProps} onMinimize={() => setCallMinimized(true)} />
              </div>
            );
          }

          /* ── Desktop: inline resizable panel ── */
          return (
            <>
              <div ref={callPanelRef} style={{ height: callPanelHeight }} className="overflow-hidden">
                <CallPanel {...callProps} compact={callPanelHeight < 280} />
              </div>
              {/* Resize handle */}
              <div
                className="group flex h-1.5 w-full shrink-0 cursor-row-resize items-center justify-center bg-zinc-900 hover:bg-zinc-800 transition-colors"
                onMouseDown={(e) => {
                  const startY = e.clientY;
                  const startH = callPanelHeight;
                  const onMove = (me: MouseEvent) => setCallPanelHeight(Math.max(120, startH + me.clientY - startY));
                  const onUp = () => {
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                  };
                  window.addEventListener('mousemove', onMove);
                  window.addEventListener('mouseup', onUp);
                }}
              >
                <span className="h-0.5 w-8 rounded-full bg-white/20 group-hover:bg-white/40 transition-colors" />
              </div>
            </>
          );
        })()}

      {/* ── E2EE History Recovery Banner ──────────────────────────────────── */}
      {recipientId && hasEncryptedPlaceholders && e2eeRecoveryStatus !== 'done' && !e2eeBannerDismissed && (
        <div className="mx-3 mb-1 mt-2 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-linear-to-r from-amber-500/15 to-amber-500/5 px-4 py-2.5 shadow-sm shadow-amber-500/10 md:mx-4">
          <ShieldCheckIcon size={16} className="shrink-0 text-amber-500" />
          <span className="flex-1 text-xs text-amber-700 dark:text-amber-300">
            {e2eeRecoveryStatus === 'offline' ? t.chat.e2eeOffline : t.chat.e2eeMissing}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-500/40 text-xs hover:bg-amber-500/20"
            disabled={e2eeRecoveryStatus === 'requesting'}
            onClick={requestE2EEHistory}
          >
            {e2eeRecoveryStatus === 'requesting' ? (
              <><Spinner size="sm" className="mr-1.5" />{t.chat.e2eeWaiting}</>
            ) : (
              t.chat.e2eeRecover
            )}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            className="size-6 shrink-0 text-amber-600/60 hover:bg-amber-500/20 hover:text-amber-600 dark:text-amber-400/60 dark:hover:text-amber-400"
            onClick={() => setE2eeBannerDismissed(true)}
          >
            <XIcon size={12} />
          </Button>
        </div>
      )}

      {/* ── Messages area ──────────────────────────────────────────────────── */}
      <ScrollArea className="min-h-0 flex-1 px-1 py-2 md:px-2 md:py-4" ref={scrollAreaRef}>
        {isLoading ? (
          <MessagesSkeleton />
        ) : messages.length === 0 ? (
          <ChatEmptyState
            icon={<MessageCircleIcon size={26} className="text-muted-foreground/60" />}
            title={t.chat.noMessages}
            description={t.chat.beFirst}
          />
        ) : (
          <MessageList
            dedupedMessages={dedupedMessages}
            editingMessageId={editingMessageId}
            editInput={editInput}
            messagesById={messagesById}
            highlightedMessageId={highlightedMessageId}
            currentUser={user as MessageSender | null}
            recipientName={recipientName}
            isLoadingMoreMessages={isLoadingMoreMessages}
            messagesContainerRef={messagesContainerRef}
            lastSeenAt={lastSeenAt}
            onSetEditInput={handleSetEditInput}
            onReply={handleReply}
            onCopy={handleCopyMessage}
            onReaction={handleReaction}
            onRemoveReaction={handleRemoveReaction}
            onStartEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onDelete={deleteMessage}
          />
        )}
      </ScrollArea>

      {/* ── Section basse ── */}
      <div ref={bottomRef} className={cn('shrink-0', ui.contentBg)}>
      {/* ── Typing indicator ───────────────────────────────────────────────── */}
      {typingUsers.length > 0 && (
        <TypingIndicator
          className="shrink-0"
          label={
            typingUsers.length > 1
              ? tx(t.chat.typingPlural, { names: typingUsers.map((u) => u.username).join(', ') })
              : tx(t.chat.typing, { names: typingUsers[0]?.username ?? '' })
          }
        />
      )}

      {/* ── Cooldown warning ───────────────────────────────────────────────── */}
      {cooldownActive && (
        <div className="mx-3 mb-1 rounded-xl border border-destructive/30 bg-linear-to-r from-destructive/15 to-destructive/5 px-3 py-2 text-xs font-medium text-destructive shadow-sm shadow-destructive/10 md:mx-4">
          Calme-toi ! Tu envoies trop de messages.
        </div>
      )}

      {/* ── Block notices ──────────────────────────────────────────────────── */}
      {iBlockedThem && (
        <div className="mx-3 mb-1 flex items-center gap-2 rounded-xl border border-border/40 bg-foreground/5 px-3 py-2.5 text-xs text-muted-foreground md:mx-4">
          <BanIcon size={14} className="shrink-0" />
          <span>
            Vous avez bloqué cet utilisateur.{' '}
            <button
              type="button"
              className="font-semibold text-primary underline underline-offset-2"
              onClick={async () => {
                await api.unblockUser(recipientId!);
                setIBlockedThem(false);
              }}
            >
              Débloquer
            </button>
          </span>
        </div>
      )}
      {!iBlockedThem && theyBlockedMe && (
        <div className="mx-3 mb-1 flex items-center gap-2 rounded-xl border border-border/40 bg-foreground/5 px-3 py-2.5 text-xs text-muted-foreground md:mx-4">
          <BanIcon size={14} className="shrink-0" />
          <span>
            Vous ne pouvez pas envoyer de message à cet utilisateur tant qu&apos;il ne vous a pas
            débloqué.
          </span>
        </div>
      )}

      {/* ── Input area ─────────────────────────────────────────────────────── */}
      <ChatComposer
        textareaRef={textareaRef}
        value={messageInput}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onSend={() => handleSendMessage({ preventDefault: () => {} } as React.FormEvent)}
        placeholder={`Message ${recipientId ? recipientName || '' : '#général'}`}
        dimmed={isBlocked}
        attachments={pendingAttachments}
        onRemoveAttachment={(i) => setPendingAttachments((p) => p.filter((_, j) => j !== i))}
        onAttachClick={() => fileInputRef.current?.click()}
        isUploading={isUploading}
        onEmoji={handleEmojiInsert}
        onGif={handleGifSelect}
        reply={replyingTo ? { authorName: replyingTo.authorName, content: replyingTo.content } : null}
        onCancelReply={() => setReplyingTo(null)}
        extras={
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv"
              onChange={handleFileSelect}
            />
            <MentionPopover
              query={mentionQuery}
              users={mentionUsersMemo}
              visible={mentionVisible}
              position={{ top: replyingTo ? 110 : 65, left: 16 }}
              onSelect={handleMentionSelect}
              onClose={() => setMentionVisible(false)}
            />
          </>
        }
      />
      </div>{/* end bottom section */}
      </div>{/* end inner column */}

      {/* ── Search panel (right side) ──────────────────────────────────────── */}
      {searchOpen && (
        <SearchPanel
          localMessages={dedupedMessages}
          conversationId={getConversationId()}
          isDM={!!recipientId}
          loadMoreMessages={loadMoreMessages}
          hasMoreMessages={hasMoreMessages}
          isLoadingMore={isLoadingMoreMessages}
          onClose={() => setSearchOpen(false)}
          onJumpToMessage={(messageId) => {
            // Sanitize: n'accepter que des UUID valides pour éviter l'injection CSS selector
            if (!/^[a-f0-9-]{36}$/i.test(messageId)) return;
            setHighlightedMessageId(messageId);
            setTimeout(() => setHighlightedMessageId(null), 2000);
            const el = document.querySelector(`[data-message-id="${messageId}"]`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}
        />
      )}
    </div>
  );
}

/* ════════════ Serveur — ServerChatArea ════════════ */

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

/* TypingIndicator / MessagesSkeleton → kit partagé @/components/chat/chat-ui */

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

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  /* Scroll tracking — attached directly to the Radix viewport via useEffect */
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
  }, []);

  useEffect(() => {
    const vp = scrollRef.current;
    if (!vp) return;
    vp.addEventListener('scroll', handleScroll, { passive: true });
    return () => vp.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
    (value: string) => {
      setMessageInput(value);
      if (value.trim()) {
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
      <ChatHeader
        onBack={isMobile ? toggleSidebar : undefined}
        leading={
          <ChatIconTile className={cn('ring-transparent', meta.bg)}>
            <meta.icon size={15} className={meta.color} />
          </ChatIconTile>
        }
        title={channelName || 'salon'}
        subtitle={meta.label}
        actions={
          <HeaderAction
            label="Membres"
            active={!isMobile && memberListDesktopVisible}
            onClick={isMobile ? toggleMemberList : toggleMemberListDesktop}
          >
            <UsersIcon size={16} />
          </HeaderAction>
        }
      />

      {/* ── Messages ── */}
      <ScrollArea
        className="min-h-0 flex-1"
        ref={(el: HTMLDivElement | null) => {
          if (el) {
            scrollRef.current = el.querySelector<HTMLDivElement>('[data-radix-scroll-area-viewport]') ?? null;
          }
        }}
      >
        <div ref={messagesContainerRef}>
          {isLoading ? (
            <MessagesSkeleton />
          ) : messages.length === 0 ? (
            <ChatEmptyState
              icon={<meta.icon size={28} className={cn(meta.color, 'opacity-80')} />}
              iconClassName={cn('ring-transparent', meta.bg)}
              title={`Bienvenue dans #${channelName || 'salon'}`}
              description={`${meta.description}.`}
            />
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
                          {showDivider && <NewMessagesDivider />}
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
      <div className="h-7 shrink-0">
        {typingUsernames.length > 0 && (
          <TypingIndicator
            label={
              typingUsernames.length === 1
                ? `${typingUsernames[0]} est en train d'écrire…`
                : typingUsernames.length === 2
                  ? `${typingUsernames[0]} et ${typingUsernames[1]} sont en train d'écrire…`
                  : `${typingUsernames.length} personnes sont en train d'écrire…`
            }
          />
        )}
      </div>

      {/* ── Input area ── */}
      <ChatComposer
        textareaRef={textareaRef}
        value={messageInput}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onSend={handleSend}
        placeholder={`Message #${channelName || 'salon'}`}
        onAttachClick={() => fileInputRef.current?.click()}
        onEmoji={(emoji) => setMessageInput((prev) => prev + emoji)}
        reply={replyId ? { authorName: replyAuthor, content: replyContent } : null}
        onCancelReply={() => setReplyId(null)}
        extras={
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
              e.target.value = '';
            }}
          />
        }
      />
    </div>
  );
}

/* ════════════ Groupe — GroupChatArea ════════════ */

interface Participant {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

interface GroupInfo {
  id: string;
  name: string;
  avatarUrl?: string;
  ownerId?: string;
  isOpen?: boolean;
  participants: Participant[];
  participantIds: string[];
}

interface GroupChatAreaProps {
  groupId: string;
  onLeave?: () => void;
}

export function GroupChatArea({ groupId, onLeave }: GroupChatAreaProps) {
  const { user } = useAuth();
  const { isMobile, toggleSidebar } = useMobileNav();
  const ui = useUIStyle();
  const { prefs } = useLayoutPrefs();
  const d = densityCls(prefs.density);
  const [callMinimized, setCallMinimized] = useState(false);
  const [callPanelHeight, setCallPanelHeight] = useState(220);

  const [messageInput, setMessageInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; authorName: string } | null>(null);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<'general' | 'members'>('general');
  const [activeGroupCall, setActiveGroupCall] = useState<{ callId: string; callType: string; callerName?: string } | null>(null);

  // Timestamp de la dernière visite — capturé à l'ouverture du groupe
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(() => getLastSeen(`group:${groupId}`));

  // Effacer le surlignage des messages non lus après 5 secondes de lecture
  useEffect(() => {
    if (!lastSeenAt) return;
    const timer = setTimeout(() => {
      setLastSeenAt(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [lastSeenAt]);

  // Appel actif dans ce groupe (pour les membres qui rejoignent après le démarrage)
  useEffect(() => {
    const handleCallActive = (payload: any) => {
      const p = (payload?.payload || payload) as any;
      if (p?.channelId !== groupId && p?.callId !== activeGroupCall?.callId) {
        if (p?.channelId !== groupId) return;
      }
      setActiveGroupCall({ callId: p.callId, callType: p.callType || 'voice', callerName: p.callerName });
    };
    const handleCallActiveEnded = (payload: any) => {
      setActiveGroupCall(null);
    };
    socketService.on('CALL_ACTIVE', handleCallActive);
    socketService.on('CALL_ACTIVE_ENDED', handleCallActiveEnded);
    return () => {
      socketService.off('CALL_ACTIVE', handleCallActive);
      socketService.off('CALL_ACTIVE_ENDED', handleCallActiveEnded);
    };
  }, [groupId, activeGroupCall?.callId]);

  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionVisible, setMentionVisible] = useState(false);

  // ── File attachments ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingAttachments, setPendingAttachments] = useState<{ name: string; url: string; isImage: boolean }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // ── Cooldown ──
  const msgTimestampsRef = useRef<number[]>([]);
  const [cooldownActive, setCooldownActive] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isTypingRef = useRef(false);
  const isAtBottomRef = useRef(true);
  const editInputRef = useRef('');

  const {
    messages,
    typingUsers,
    isLoading,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    startTyping,
    stopTyping,
  } = useMessages(groupId, undefined);

  const {
    initiateGroupCall,
    callStatus,
    callType,
    callChannelId,
    isGroup: callIsGroup,
    callCategory,
    callMode,
    tierLabel,
    handRaised,
    localStream,
    remoteStreams,
    screenStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    remoteIsScreenSharing,
    mediaError,
    callDuration,
    participantInfo,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    leaveCall,
    endCall,
    toggleHand,
  } = useCallContext();

  const loadGroupInfo = useCallback(async () => {
    try {
      const response = await api.getConversation(groupId);
      if (response.success && response.data) {
        const data = response.data as any;
        setGroupInfo({
          id: data.id,
          name: data.name || 'Groupe',
          avatarUrl: data.avatarUrl,
          ownerId: data.ownerId,
          isOpen: data.isOpen !== false,
          participants: data.participants || [],
          participantIds: data.participantIds || [],
        });
      }
    } catch (error) {
      console.error('Erreur chargement groupe:', error);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroupInfo();
  }, [loadGroupInfo]);

  useEffect(() => {
    const handleGroupUpdate = (data: any) => {
      const payload = data?.payload || data;
      if (payload?.groupId === groupId) loadGroupInfo();
    };
    const handleGroupDelete = (data: any) => {
      const payload = data?.payload || data;
      if (payload?.groupId === groupId) {
        notify.info('Groupe supprimé', 'Ce groupe a été supprimé');
        onLeave?.();
      }
    };
    const handleGroupMemberRemove = (data: any) => {
      const payload = data?.payload || data;
      if (payload?.groupId === groupId && payload?.userId === user?.id) {
        notify.info('Retiré du groupe', 'Vous avez été retiré de ce groupe');
        onLeave?.();
      } else if (payload?.groupId === groupId) {
        loadGroupInfo();
      }
    };
    const handleGroupMemberAdd = () => loadGroupInfo();

    socketService.onGroupUpdate(handleGroupUpdate);
    socketService.onGroupDelete(handleGroupDelete);
    socketService.onGroupMemberRemove(handleGroupMemberRemove);
    socketService.onGroupMemberAdd(handleGroupMemberAdd);

    return () => {
      socketService.off('GROUP_UPDATE', handleGroupUpdate);
      socketService.off('GROUP_DELETE', handleGroupDelete);
      socketService.off('GROUP_MEMBER_REMOVE', handleGroupMemberRemove);
      socketService.off('GROUP_MEMBER_ADD', handleGroupMemberAdd);
    };
  }, [groupId, user?.id, loadGroupInfo, onLeave]);

  const getViewport = useCallback(() => {
    return scrollRef.current?.querySelector<HTMLDivElement>('[data-slot="scroll-area-viewport"]') ?? null;
  }, []);

  const scrollToBottom = useCallback(() => {
    const vp = getViewport();
    if (vp) vp.scrollTop = vp.scrollHeight;
  }, [getViewport]);

  const checkIfAtBottom = useCallback(() => {
    const vp = getViewport();
    if (vp) {
      const { scrollTop, scrollHeight, clientHeight } = vp;
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  }, [getViewport]);

  useEffect(() => {
    if (isAtBottomRef.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    isAtBottomRef.current = true;
    requestAnimationFrame(() => {
      scrollToBottom();
      requestAnimationFrame(scrollToBottom);
    });
  }, [groupId, scrollToBottom]);

  useEffect(() => {
    if (!isLoading && enrichedMessages.length > 0) {
      requestAnimationFrame(() => {
        scrollToBottom();
        requestAnimationFrame(scrollToBottom);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  useEffect(() => {
    const vp = getViewport();
    if (vp) {
      vp.addEventListener('scroll', checkIfAtBottom);
      return () => vp.removeEventListener('scroll', checkIfAtBottom);
    }
  }, [checkIfAtBottom, getViewport]);

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    const obs = new ResizeObserver(() => {
      if (isAtBottomRef.current) scrollToBottom();
    });
    obs.observe(messagesContainerRef.current);
    return () => obs.disconnect();
  }, [scrollToBottom]);

  // Auto-grow textarea (1 line min, 5 lines max)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  }, [messageInput]);

  const enrichedMessages: MessageData[] = useMemo(() => {
    if (!groupInfo) return messages as MessageData[];
    return messages.map((msg) => {
      if (msg.sender) return msg as MessageData;
      const participant = groupInfo.participants.find((p) => p.userId === msg.authorId);
      if (!participant) return msg as MessageData;
      return {
        ...msg,
        sender: {
          id: participant.userId,
          username: participant.username || 'Utilisateur',
          displayName: participant.displayName,
          avatarUrl: participant.avatarUrl,
        } satisfies MessageSender,
      } as MessageData;
    });
  }, [messages, groupInfo]);

  const messagesById = useMemo(
    () => new Map(enrichedMessages.map((m) => [m.id, m])),
    [enrichedMessages],
  );

  const currentUser: MessageSender | null = user
    ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
    : null;

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';

    const MAX = 10 * 1024 * 1024;
    const ACCEPTED_IMAGES = ['image/png','image/jpeg','image/jpg','image/gif','image/webp'];
    const ACCEPTED_DOCS = [
      'application/pdf','application/x-pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain','text/csv',
      'application/zip','application/x-zip-compressed','application/octet-stream',
    ];
    const ACCEPTED = [...ACCEPTED_IMAGES, ...ACCEPTED_DOCS];
    const ACCEPTED_EXTS = ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv',
                           'png','jpg','jpeg','gif','webp'];

    for (const file of files) {
      if (file.size > MAX) { notify.error('Fichier trop volumineux', `${file.name} dépasse 10 Mo`); continue; }
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ACCEPTED.includes(file.type) && !ACCEPTED_EXTS.includes(ext)) {
        notify.error('Type non supporté', `${file.name} n'est pas accepté`);
        continue;
      }
      setIsUploading(true);
      try {
        const res = await api.uploadDocument(file);
        if (res.success && res.data) {
          setPendingAttachments((prev) => [...prev, { name: file.name, url: res.data!.url, isImage: res.data!.isImage }]);
        } else {
          notify.error('Erreur upload', res.error || "Impossible d'uploader le fichier");
        }
      } finally {
        setIsUploading(false);
      }
    }
  }, []);

  /* ── Paste image from clipboard ── */
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItems = items.filter(item => item.kind === 'file' && item.type.startsWith('image/'));
      if (!imageItems.length) return;
      e.preventDefault();

      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;
        if (file.size > 10 * 1024 * 1024) {
          notify.error('Fichier trop volumineux', 'L\'image dépasse 10 Mo');
          continue;
        }
        setIsUploading(true);
        try {
          const res = await api.uploadDocument(file);
          if (res.success && res.data) {
            setPendingAttachments((prev) => [
              ...prev,
              { name: file.name || 'image.png', url: res.data!.url, isImage: res.data!.isImage },
            ]);
          } else {
            notify.error('Erreur upload', res.error || 'Impossible d\'uploader l\'image');
          }
        } finally {
          setIsUploading(false);
        }
      }
    },
    [],
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = messageInput.trim();
    const hasAttachments = pendingAttachments.length > 0;
    if (!hasText && !hasAttachments) return;

    const now = Date.now();
    msgTimestampsRef.current = msgTimestampsRef.current.filter(t => now - t < 5000);
    if (msgTimestampsRef.current.length >= 5) {
      setCooldownActive(true);
      setTimeout(() => setCooldownActive(false), 3000);
      return;
    }
    msgTimestampsRef.current.push(now);

    let content = messageInput.trim();
    for (const att of pendingAttachments) {
      const attStr = att.isImage
        ? `\n[attach:img]:${att.url}`
        : `\n[attach:file]:${att.name}|${att.url}`;
      content = content ? content + attStr : attStr.trimStart();
    }

    sendMessage(content, replyingTo?.id);
    setMessageInput('');
    setPendingAttachments([]);
    setReplyingTo(null);
    stopTyping();
    isAtBottomRef.current = true;
    scrollToBottom();
  };

  const handleSetEditInput = useCallback((value: SetStateAction<string>) => {
    setEditInput((prev) => {
      const next = typeof value === 'function' ? (value as (p: string) => string)(prev) : value;
      editInputRef.current = next;
      return next;
    });
  }, []);

  const handleStartEdit = useCallback((messageId: string, content: string) => {
    editInputRef.current = content;
    setEditInput(content);
    setEditingMessageId(messageId);
  }, []);

  const handleSaveEdit = useCallback(
    (messageId: string) => {
      const value = editInputRef.current;
      if (value.trim()) editMessage(messageId, value.trim());
      setEditingMessageId(null);
      setEditInput('');
      editInputRef.current = '';
    },
    [editMessage],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditInput('');
    editInputRef.current = '';
  }, []);

  const handleReply = useCallback((messageId: string, content: string, authorName: string) => {
    setReplyingTo({ id: messageId, content, authorName });
    textareaRef.current?.focus();
  }, []);

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    notify.success('Copié', 'Message copié dans le presse-papiers');
  }, []);

  const handleReaction = useCallback((messageId: string, emoji: string) => {
    addReaction(messageId, emoji);
  }, [addReaction]);

  const handleRemoveReaction = useCallback((messageId: string, emoji: string) => {
    removeReaction(messageId, emoji);
  }, [removeReaction]);

  const handleEmojiInsert = (emoji: string) => {
    setMessageInput((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleGifSelect = (gifUrl: string) => {
    sendMessage(gifUrl);
    isAtBottomRef.current = true;
    scrollToBottom();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionVisible && ['ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Escape'].includes(e.key)) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (messageInput.trim() || pendingAttachments.length > 0) handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  const handleInputChange = (value: string) => {
    setMessageInput(value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (value) {
      if (!isTypingRef.current) { isTypingRef.current = true; startTyping(); }
      typingTimeoutRef.current = setTimeout(() => { isTypingRef.current = false; stopTyping(); }, 3000);
    } else {
      isTypingRef.current = false;
      stopTyping();
    }

    const cursorPos = textareaRef.current?.selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/(^|\s)@(\w*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[2]);
      setMentionVisible(true);
    } else {
      setMentionVisible(false);
    }
  };

  const handleMentionSelect = (mentionUser: MentionUser) => {
    const cursorPos = textareaRef.current?.selectionStart ?? messageInput.length;
    const textBeforeCursor = messageInput.slice(0, cursorPos);
    const textAfterCursor = messageInput.slice(cursorPos);
    const mentionMatch = textBeforeCursor.match(/(^|\s)@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index) + mentionMatch[1];
      setMessageInput(`${beforeMention}@${mentionUser.username} ${textAfterCursor}`);
      setMentionVisible(false);
      textareaRef.current?.focus();
    }
  };

  const handleLeaveGroup = () => {
    socketService.leaveGroup(groupId);
    onLeave?.();
  };

  const isOwner = user?.id === groupInfo?.ownerId;
  const myRole = groupInfo?.participants.find((p) => p.userId === user?.id)?.role;

  const mentionUsersMemo = useMemo<MentionUser[]>(() => {
    if (!groupInfo?.participants) return [];
    return groupInfo.participants.map((p) => ({
      id: p.userId,
      username: p.username ?? p.userId,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
    }));
  }, [groupInfo?.participants]);
  const groupIsOpen = groupInfo?.isOpen !== false;
  const canAddMembers = isOwner || groupIsOpen;
  const canManageMembers = isOwner || myRole === 'admin';

  const handleOpenAddMembers = () => {
    setSettingsInitialSection('members');
    setShowSettings(true);
  };

  const handleInitiateCall = (type: 'voice' | 'video') => {
    setActiveGroupCall(null);
    initiateGroupCall(groupId, type, groupInfo?.name);
  };

  if (!user) return null;

  return (
    <div className="flex h-full flex-1">
      {/* ── Zone de chat principale ── */}
      <div data-tour="chat-area" className={`flex min-w-0 flex-1 flex-col overflow-hidden ${ui.contentBg}`}>
        {/* ── Header ── */}
        <ChatHeader
          heightClass={d.headerH}
          onBack={isMobile ? toggleSidebar : undefined}
          leading={
            groupInfo?.avatarUrl ? (
              <Avatar className="size-9 shrink-0 rounded-xl">
                <AvatarImage src={resolveMediaUrl(groupInfo.avatarUrl)} className="rounded-xl" />
                <AvatarFallback className="rounded-xl text-[11px] font-medium">{groupInfo.name?.[0]}</AvatarFallback>
              </Avatar>
            ) : (
              <ChatIconTile className="bg-primary/8 ring-primary/15">
                <UsersRoundIcon size={16} className="text-primary" />
              </ChatIconTile>
            )
          }
          title={groupInfo?.name || 'Groupe'}
          subtitle={`${groupInfo?.participants.length || 0} membres`}
          actions={
            <>
              {canAddMembers && (
                <HeaderAction label="Ajouter un membre" onClick={handleOpenAddMembers}>
                  <UserPlusIcon size={16} />
                </HeaderAction>
              )}
              <HeaderAction label="Appel vocal" onClick={() => handleInitiateCall('voice')} disabled={callStatus !== 'idle'}>
                <PhoneIcon size={15} />
              </HeaderAction>
              <HeaderAction label="Appel vidéo" onClick={() => handleInitiateCall('video')} disabled={callStatus !== 'idle'}>
                <VideoIcon size={15} />
              </HeaderAction>
              <HeaderAction label="Membres" active={showMembers} onClick={() => setShowMembers(!showMembers)}>
                <UsersRoundIcon size={16} />
              </HeaderAction>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="size-8 rounded-xl text-muted-foreground hover:text-foreground">
                    <MoreHorizontalIcon size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setSettingsInitialSection('general'); setShowSettings(true); }}>
                    <SettingsIcon size={16} />
                    Paramètres du groupe
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={handleLeaveGroup}>
                    <LogOutIcon size={16} />
                    Quitter le groupe
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />

        {/* ── Bannière appel actif (pour les membres non encore dans l'appel) ── */}
        {activeGroupCall && callStatus === 'idle' && (
          <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-3 py-2">
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-50" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-success">
              {activeGroupCall.callerName
                ? `${activeGroupCall.callerName} a démarré un appel`
                : 'Appel en cours'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 shrink-0 rounded-lg border border-success/40 bg-success/15 px-3 text-xs font-semibold text-success hover:bg-success hover:text-white"
              onClick={() => initiateGroupCall(groupId, (activeGroupCall.callType as 'voice' | 'video') || 'voice', groupInfo?.name)}
            >
              Rejoindre
            </Button>
          </div>
        )}

        {/* ── Call panel ── */}
        {callStatus !== 'idle' && callStatus !== 'ended' &&
          callIsGroup && callChannelId === groupId && (() => {
          const callProps = {
            type: (callType || 'voice') as 'voice' | 'video',
            status: callStatus as 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended',
            localStream, remoteStreams, screenStream, isMuted, isVideoOff, isScreenSharing, remoteIsScreenSharing,
            recipientName: groupInfo?.name || 'Groupe',
            currentUserName: user?.displayName || user?.username || 'Vous',
            currentUserAvatar: user?.avatarUrl,
            duration: callDuration, mediaError,
            participants: Array.from(participantInfo.entries()).map(([uid, info]) => ({ userId: uid, name: info.name, avatar: info.avatar })),
            callCategory: callCategory ?? undefined, callMode, tierLabel, handRaised,
            onToggleMute: toggleMute, onToggleVideo: toggleVideo,
            onStartScreenShare: startScreenShare, onStopScreenShare: stopScreenShare,
            onEndCall: leaveCall, onToggleHand: toggleHand,
          };
          if (isMobile) {
            if (callMinimized) return (
              <div className="fixed bottom-4 right-4 z-[60] flex w-36 cursor-pointer flex-col overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl ring-1 ring-white/10" onClick={() => setCallMinimized(false)}>
                <div className="relative aspect-video">
                  {Array.from(remoteStreams.values())[0] ? (
                    <video autoPlay playsInline muted ref={(el) => { if (el) el.srcObject = Array.from(remoteStreams.values())[0] ?? null; }} className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-800"><Maximize2Icon size={20} className="text-white/30" /></div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30"><Maximize2Icon size={16} className="text-white/70" /></div>
                </div>
                <div className="px-2 py-1 text-[10px] font-medium text-white/50 truncate">{groupInfo?.name || 'Groupe'}</div>
              </div>
            );
            return (
              <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950">
                <CallPanel {...callProps} onMinimize={() => setCallMinimized(true)} />
              </div>
            );
          }
          return (
            <>
              <div style={{ height: callPanelHeight }} className="overflow-hidden">
                <CallPanel {...callProps} compact={callPanelHeight < 280} />
              </div>
              <div
                className="group flex h-1.5 w-full shrink-0 cursor-row-resize items-center justify-center bg-zinc-900 hover:bg-zinc-800 transition-colors"
                onMouseDown={(e) => {
                  const startY = e.clientY; const startH = callPanelHeight;
                  const onMove = (me: MouseEvent) => setCallPanelHeight(Math.max(120, startH + me.clientY - startY));
                  const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                  window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
                }}
              >
                <span className="h-0.5 w-8 rounded-full bg-white/20 group-hover:bg-white/40 transition-colors" />
              </div>
            </>
          );
        })()}

        {/* ── Messages ── */}
        <ScrollArea ref={scrollRef} className="min-h-0 flex-1 p-2 md:p-4">
          {isLoading ? (
            <MessagesSkeleton />
          ) : enrichedMessages.length === 0 ? (
            <ChatEmptyState
              icon={<UsersRoundIcon size={26} className="text-primary" />}
              iconClassName="bg-primary/10 ring-primary/20"
              title={groupInfo?.name || 'Groupe'}
              description="C'est le début de votre conversation de groupe. Envoyez un message pour commencer !"
            />
          ) : (
            <div className="space-y-1" ref={messagesContainerRef}>
              {(() => {
                // Trouver l'index du premier message non lu
                let newMessagesDividerIdx = -1;
                if (lastSeenAt) {
                  const lastSeenTime = new Date(lastSeenAt).getTime();
                  for (let i = 0; i < enrichedMessages.length; i++) {
                    const msgTime = new Date(enrichedMessages[i].createdAt).getTime();
                    if (msgTime > lastSeenTime && enrichedMessages[i].authorId !== currentUser?.id) {
                      newMessagesDividerIdx = i;
                      break;
                    }
                  }
                }
                return enrichedMessages.map((message, idx) => {
                  const isEditing = editingMessageId === message.id;
                  const grouped = idx > 0 && shouldGroup(enrichedMessages[idx - 1], message);
                  const isUnread = newMessagesDividerIdx >= 0 && idx >= newMessagesDividerIdx && message.authorId !== currentUser?.id;
                  const showDivider = idx === newMessagesDividerIdx;
                  return (
                    <div key={message.id}>
                      {showDivider && <NewMessagesDivider />}
                      <div className={cn(isUnread && 'bg-accent/5 border-l-2 border-accent/30')}>
                        <MessageItem
                          message={message}
                          currentUser={currentUser}
                          isEditing={isEditing}
                          editInput={isEditing ? editInput : ''}
                          isGrouped={grouped}
                          replyMessage={message.replyToId ? (messagesById.get(message.replyToId) ?? null) : null}
                          onSetEditInput={handleSetEditInput}
                          onReply={handleReply}
                          onCopy={handleCopyMessage}
                          onReaction={handleReaction}
                          onRemoveReaction={handleRemoveReaction}
                          onStartEdit={handleStartEdit}
                          onSaveEdit={handleSaveEdit}
                          onCancelEdit={handleCancelEdit}
                          onDelete={deleteMessage}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {typingUsers.length > 0 && (
            <TypingIndicator label={`${typingUsers.map((u) => u.username).join(', ')} écrit…`} />
          )}
        </ScrollArea>

        {/* ── Cooldown notice ── */}
        {cooldownActive && (
          <div className="mx-3 mb-1 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-[12px] font-medium text-amber-400 md:mx-4">
            Calme-toi ! Tu envoies trop de messages.
          </div>
        )}

        {/* ── Input area ── */}
        <ChatComposer
          textareaRef={textareaRef}
          value={messageInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onSend={() => handleSendMessage({ preventDefault: () => {} } as React.FormEvent)}
          placeholder={`Écrire dans ${groupInfo?.name || 'le groupe'}…`}
          attachments={pendingAttachments}
          onRemoveAttachment={(i) => setPendingAttachments((p) => p.filter((_, j) => j !== i))}
          onAttachClick={() => fileInputRef.current?.click()}
          isUploading={isUploading}
          onEmoji={handleEmojiInsert}
          onGif={handleGifSelect}
          reply={replyingTo ? { authorName: replyingTo.authorName, content: replyingTo.content } : null}
          onCancelReply={() => setReplyingTo(null)}
          extras={
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                multiple
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv"
                onChange={handleFileSelect}
              />
              <MentionPopover
                query={mentionQuery}
                users={mentionUsersMemo}
                visible={mentionVisible}
                position={{ top: replyingTo ? 110 : 65, left: 16 }}
                onSelect={handleMentionSelect}
                onClose={() => setMentionVisible(false)}
              />
            </>
          }
        />
      </div>

      {/* ── Panel membres (sidebar droite) ── */}
      {showMembers && (
        <div className="flex w-52 flex-col border-l border-border/30 bg-surface/60">
          <div className="flex items-center justify-between px-3 py-3">
            <p className="text-[11px] font-medium text-muted-foreground/40">
              Membres — {groupInfo?.participants.length || 0}
            </p>
            <Button size="icon-sm" variant="ghost" className="size-6 rounded-xl" onClick={() => setShowMembers(false)}>
              <XIcon size={12} />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-0.5 p-2">
              {groupInfo?.participants
                .sort((a, b) => {
                  const order = { owner: 0, admin: 1, member: 2 };
                  return (order[a.role] || 2) - (order[b.role] || 2);
                })
                .map((participant) => (
                  <UserProfilePopover key={participant.userId} userId={participant.userId}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors duration-150 hover:bg-surface-secondary/30 ${!participant.isOnline ? 'opacity-40' : ''}`}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-7">
                          <AvatarImage src={participant.avatarUrl ? resolveMediaUrl(participant.avatarUrl) : undefined} />
                          <AvatarFallback className="text-[10px] font-medium">{(participant.displayName || participant.username)?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-[1.5px] ring-background ${
                            participant.isOnline ? 'bg-success' : 'bg-muted-foreground/30'
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-[12px] font-medium">
                            {participant.displayName || participant.username || 'Utilisateur'}
                          </p>
                          {participant.role === 'owner' && (
                            <CrownIcon size={10} className="shrink-0 text-amber-500" />
                          )}
                        </div>
                      </div>
                    </button>
                  </UserProfilePopover>
                ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* ── Dialog paramètres du groupe ── */}
      <GroupSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        group={groupInfo}
        isOwner={isOwner}
        myRole={myRole}
        initialSection={settingsInitialSection}
        onUpdate={loadGroupInfo}
        onLeave={handleLeaveGroup}
      />
    </div>
  );
}
