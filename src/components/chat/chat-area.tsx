'use client';

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
  SmileIcon,
  SendIcon,
  HashIcon,
  ImageIcon,
  XIcon,
  PhoneIcon,
  VideoIcon,
  ArrowLeftIcon,
  BanIcon,
  SearchIcon,
  PaperclipIcon,
  FileTextIcon,
  MenuIcon,
  Maximize2Icon,
} from '@/components/icons';
import { useTranslation } from '@/components/locale-provider';
import { useMessages } from '@/hooks/use-messages';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { useCallContext } from '@/hooks/use-call-context';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useLayoutPrefs, densityCls } from '@/hooks/use-layout-prefs';
import { notify } from '@/hooks/use-notification';
import { getLastSeen, markLastSeen } from '@/lib/notification-store';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { EmojiPicker } from '@/components/chat/emoji-picker';
import { MentionPopover, type MentionUser } from '@/components/chat/mention-popover';
import { CallPanel } from '@/components/chat/call-panel';
import { SearchPanel } from '@/components/chat/search-panel';
import {
  MessageItem,
  shouldGroup,
  type MessageSender,
  type MessageData,
} from '@/components/chat/message-item';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

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
            {showDivider && (
              <div className="my-2 flex items-center gap-2 px-4">
                <div className="h-px flex-1 bg-destructive/40" />
                <span className="shrink-0 text-[11px] font-semibold text-destructive">{t.chat.newMessages}</span>
                <div className="h-px flex-1 bg-destructive/40" />
              </div>
            )}
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
  const [messageInput, setMessageInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
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


  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  }, [messageInput]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
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
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionVisible(true);
    } else {
      setMentionVisible(false);
    }
  };

  const handleMentionSelect = (mentionUser: MentionUser) => {
    const cursorPos = textareaRef.current?.selectionStart ?? messageInput.length;
    const textBeforeCursor = messageInput.slice(0, cursorPos);
    const textAfterCursor = messageInput.slice(cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index);
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
      <header className={`flex ${d.headerH} shrink-0 items-center justify-between px-3 md:px-4 ${ui.header}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          {isMobile && (
            <Button
              size="icon"
              variant="ghost"
              onClick={openSidebar}
              className="size-8 shrink-0 md:hidden"
            >
              <ArrowLeftIcon size={18} />
            </Button>
          )}

          {recipientId ? (
            <>
              <MessageCircleIcon size={15} className="shrink-0 text-muted-foreground/70" />
              <span className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-foreground">
                {recipientName || t.chat.privateMessage}
              </span>
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
            </>
          ) : (
            <>
              <HashIcon size={15} className="shrink-0 text-muted-foreground/70" />
              <span className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-foreground">{t.chat.generalChannel}</span>
            </>
          )}
        </div>

        {recipientId && (
          <div data-tour="call-buttons" className="flex shrink-0 items-center gap-1">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant={searchOpen ? 'secondary' : 'ghost'}
                    className="size-8"
                    onClick={() => setSearchOpen((v) => !v)}
                  >
                    <SearchIcon size={15} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t.chat.searchTooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={handleStartVoiceCall}
                    disabled={callStatus !== 'idle'}
                  >
                    <PhoneIcon size={15} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t.chat.voiceCall}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={handleStartVideoCall}
                    disabled={callStatus !== 'idle'}
                  >
                    <VideoIcon size={15} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t.chat.videoCall}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </header>

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
          <div className="flex h-full flex-col justify-end gap-4 px-2 pb-2">
            {[...Array(5)].map((_, i) => {
              const isSelf = i % 3 === 0;
              const widths = ['w-48', 'w-64', 'w-40', 'w-56', 'w-36'];
              return (
                <div
                  key={i}
                  className={`flex items-end gap-2.5 ${isSelf ? 'flex-row-reverse' : ''}`}
                  style={{ opacity: 0.3 + i * 0.14 }}
                >
                  {!isSelf && <Skeleton className="size-8 shrink-0 rounded-full" />}
                  <div className={`flex flex-col gap-1 ${isSelf ? 'items-end' : 'items-start'}`}>
                    {!isSelf && <Skeleton className="mb-0.5 h-3 w-20 rounded" />}
                    <div className={`space-y-1.5 rounded-2xl bg-foreground/5 px-3 py-2.5 ${widths[i]}`}>
                      <Skeleton className="h-3 w-full rounded" />
                      {i % 2 === 0 && <Skeleton className="h-3 w-3/4 rounded" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-14 items-center justify-center rounded-[14px] bg-foreground/6">
                <MessageCircleIcon size={22} className="text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">{t.chat.noMessages}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{t.chat.beFirst}</p>
              </div>
            </div>
          </div>
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
        <div className="flex shrink-0 items-center gap-2 px-4 py-1.5">
          <div className="flex items-center gap-0.5">
            <span className="inline-block size-1.5 animate-bounce rounded-full bg-foreground/25 [animation-delay:0ms]" />
            <span className="inline-block size-1.5 animate-bounce rounded-full bg-foreground/25 [animation-delay:150ms]" />
            <span className="inline-block size-1.5 animate-bounce rounded-full bg-foreground/25 [animation-delay:300ms]" />
          </div>
          <span className="text-xs text-muted-foreground">
            {typingUsers.length > 1
              ? tx(t.chat.typingPlural, { names: typingUsers.map((u) => u.username).join(', ') })
              : tx(t.chat.typing, { names: typingUsers[0]?.username ?? '' })}
          </span>
        </div>
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
      <form onSubmit={handleSendMessage} className="relative shrink-0 px-2 pt-1 pb-2">
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

        {/* Reply preview */}
        {replyingTo && (
          <div className={`mb-2 flex items-center gap-2 px-3 py-2 ${ui.replyBar}`}>
            <div className="h-4 w-0.5 rounded-full bg-primary/60" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-primary">
                Réponse à {replyingTo.authorName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {replyingTo.content}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="size-6"
              onClick={() => setReplyingTo(null)}
            >
              <XIcon size={12} />
            </Button>
          </div>
        )}

        {/* Input bar */}
        <div
          className={`flex items-center gap-1.5 px-1 py-1 transition-colors focus-within:border-primary/40 ${ui.inputBar} ${replyingTo ? 'rounded-tl-none rounded-tr-none border-t-0' : ''} ${isBlocked ? 'pointer-events-none opacity-40' : ''}`}
        >
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0 self-end text-muted-foreground hover:text-foreground"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? <Spinner size="sm" /> : <PaperclipIcon size={16} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Joindre un fichier (image, PDF, DOCX… &lt;10 Mo)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-1 px-0.5 pt-1">
                {pendingAttachments.map((att, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="gap-1 py-0.5 text-[11px]"
                  >
                    {att.isImage ? (
                      <ImageIcon size={11} className="shrink-0 text-blue-500" />
                    ) : (
                      <FileTextIcon size={11} className="shrink-0 text-amber-500" />
                    )}
                    <span className="max-w-30 truncate">{att.name}</span>
                    <button
                      type="button"
                      className="ml-0.5 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setPendingAttachments((p) => p.filter((_, j) => j !== i))
                      }
                    >
                      <XIcon size={10} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              rows={1}
              value={messageInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={`Message ${recipientId ? recipientName || '' : '#général'}`}
              className="w-full resize-none border-0 bg-transparent py-1 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground/50"
              style={{ minHeight: '22px', maxHeight: '110px', overflowY: 'auto' }}
              aria-label="Message"
            />
          </div>

          <div className="flex shrink-0 items-center gap-0.5 self-end">
            <EmojiPicker onSelect={handleEmojiInsert} onGifSelect={handleGifSelect}>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground hover:text-foreground"
              >
                <SmileIcon size={17} />
              </Button>
            </EmojiPicker>

            <Button
              size="icon"
              variant="ghost"
              className={`size-8 transition-all ${
                messageInput.trim() || pendingAttachments.length > 0
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'text-muted-foreground/40'
              }`}
              disabled={!messageInput.trim() && pendingAttachments.length === 0}
              onClick={() => {
                if (messageInput.trim() || pendingAttachments.length > 0)
                  handleSendMessage({ preventDefault: () => {} } as React.FormEvent);
              }}
            >
              <SendIcon size={17} />
            </Button>
          </div>
        </div>
      </form>
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
