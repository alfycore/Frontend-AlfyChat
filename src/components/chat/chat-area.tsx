'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type SetStateAction,
} from 'react';
import {
  MessageCircleIcon,
  ShieldCheckIcon,
  SmileIcon,
  SendIcon,
  HashIcon,
  ImageIcon,
  ReplyIcon,
  XIcon,
  PhoneIcon,
  VideoIcon,
  MenuIcon,
  ArrowLeftIcon,
} from '@/components/icons';
import { useMessages } from '@/hooks/use-messages';
import { useAuth } from '@/hooks/use-auth';
import { useCallContext } from '@/hooks/use-call-context';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { notify } from '@/hooks/use-notification';
import {
  Button, Card, ScrollShadow, Spinner, TextArea, Tooltip,
} from '@heroui/react';
import { EmojiPicker } from '@/components/chat/emoji-picker';
import { GifPicker } from '@/components/chat/gif-picker';
import { MentionPopover, type MentionUser } from '@/components/chat/mention-popover';
import { CallPanel } from '@/components/chat/call-panel';
import {
  MessageItem,
  type MessageSender,
  type MessageData,
} from '@/components/chat/message-item';

interface ChatAreaProps {
  channelId?: string | null;
  serverId?: string | null;
  recipientId?: string;
  recipientName?: string;
}

// ── ChatArea ──────────────────────────────────────────────────────────────────

export function ChatArea({ channelId, recipientId, recipientName }: ChatAreaProps) {
  const { user } = useAuth();
  const [messageInput, setMessageInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; authorName: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isAtBottomRef = useRef(true);
  const editInputRef = useRef('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ── Message cooldown ──
  const msgTimestampsRef = useRef<number[]>([]);
  const [cooldownActive, setCooldownActive] = useState(false);

  // Mention state
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionVisible, setMentionVisible] = useState(false);

  const {
    initiateCall,
    callStatus,
    callType,
    callConversationId,
    callRecipientId,
    callerName: ctxCallerName,
    callerAvatar,
    localStream,
    remoteStreams,
    screenStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    mediaError,
    callDuration,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    endCall,
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
  } = useMessages(channelId || undefined, recipientId);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const checkIfAtBottom = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [channelId, recipientId, scrollToBottom]);

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

  // Dédupliquer par ID (garde-fou contre les doublons de state)
  const dedupedMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [messages]);

  const messagesById = useMemo(
    () => new Map(dedupedMessages.map((m) => [m.id, m])),
    [dedupedMessages]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkIfAtBottom);
      return () => el.removeEventListener('scroll', checkIfAtBottom);
    }
  }, [checkIfAtBottom]);

  // Charger les messages plus anciens quand l'utilisateur scrolle en haut
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScrollTop = () => {
      checkIfAtBottom();
      if (el.scrollTop < 120 && hasMoreMessages && !isLoadingMoreMessages) {
        const prevHeight = el.scrollHeight;
        loadMoreMessages().then(() => {
          // Maintenir la position de scroll après ajout de messages en haut
          requestAnimationFrame(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight;
            }
          });
        });
      }
    };

    el.addEventListener('scroll', handleScrollTop);
    return () => el.removeEventListener('scroll', handleScrollTop);
  }, [checkIfAtBottom, hasMoreMessages, isLoadingMoreMessages, loadMoreMessages]);

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    const obs = new ResizeObserver(() => {
      if (isAtBottomRef.current) scrollToBottom();
    });
    obs.observe(messagesContainerRef.current);
    return () => obs.disconnect();
  }, [scrollToBottom]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const now = Date.now();
    msgTimestampsRef.current = msgTimestampsRef.current.filter(t => now - t < 5000);
    if (msgTimestampsRef.current.length >= 5) {
      setCooldownActive(true);
      setTimeout(() => setCooldownActive(false), 3000);
      return;
    }
    msgTimestampsRef.current.push(now);

    sendMessage(messageInput.trim(), replyingTo?.id);
    setMessageInput('');
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

  const handleSaveEdit = useCallback((messageId: string) => {
    const value = editInputRef.current;
    if (value.trim()) editMessage(messageId, value.trim());
    setEditingMessageId(null);
    setEditInput('');
    editInputRef.current = '';
  }, [editMessage]);

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
    setTimeout(scrollToBottom, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionVisible && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab' || e.key === 'Enter' || e.key === 'Escape')) {
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (messageInput.trim()) {
        handleSendMessage(e as unknown as React.FormEvent);
      }
    }
  };

  const isTypingRef = useRef(false);

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
      const newValue = `${beforeMention}@${mentionUser.username} ${textAfterCursor}`;
      setMessageInput(newValue);
      setMentionVisible(false);
      textareaRef.current?.focus();
    }
  };

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

  const { isMobile, openSidebar } = useMobileNav();

  // ── Empty state ──
  if (!channelId && !recipientId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        {isMobile && (
          <Button variant="outline" size="lg" className="mb-2 gap-2 rounded-xl" onPress={openSidebar}>
            <MenuIcon size={20} />
            Ouvrir les conversations
          </Button>
        )}
        <Card className="flex flex-col items-center gap-4 rounded-3xl border border-[var(--border)]/20 bg-[var(--surface-secondary)]/30 px-8 py-7 shadow-none backdrop-blur-sm">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-[var(--accent)]/15 blur-2xl" />
            <div className="relative flex size-20 items-center justify-center rounded-3xl bg-[var(--accent)]/10 md:size-24">
              <MessageCircleIcon size={36} className="text-[var(--accent)] md:size-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-[var(--foreground)] md:text-xl">Bienvenue sur AlfyChat</h2>
            <p className="text-[13px] text-[var(--muted)]">Sélectionnez une conversation ou un salon pour commencer</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div data-tour="chat-area" className="flex h-full flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)]/30 bg-[var(--surface)]/60 px-3 backdrop-blur-xl md:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {isMobile && (
            <Button isIconOnly size="sm" variant="tertiary" onPress={openSidebar} className="shrink-0 md:hidden">
              <ArrowLeftIcon size={20} />
            </Button>
          )}
          {recipientId ? (
            <>
              <div className="flex size-7 items-center justify-center rounded-xl bg-[var(--accent)]/8">
                <MessageCircleIcon size={14} className="text-[var(--accent)]" />
              </div>
              <span className="truncate text-[13px] font-semibold text-[var(--foreground)] md:text-sm">{recipientName || 'Message privé'}</span>
            </>
          ) : (
            <>
              <div className="flex size-7 items-center justify-center rounded-xl bg-[var(--surface-secondary)]/60">
                <HashIcon size={14} className="text-[var(--muted)]" />
              </div>
              <span className="truncate text-[13px] font-semibold text-[var(--foreground)] md:text-sm">général</span>
            </>
          )}
        </div>

        {/* Call buttons (DM only) */}
        {recipientId && (
          <div data-tour="call-buttons" className="flex shrink-0 items-center gap-0.5">
            <Tooltip delay={0}>
                <Button
                  isIconOnly
                  size="sm"
                  variant="tertiary"
                  onPress={handleStartVoiceCall}
                  className="size-8 rounded-xl text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                  isDisabled={callStatus !== 'idle'}
                >
                  <PhoneIcon size={16} />
                </Button>
                <Tooltip.Content>Appel vocal</Tooltip.Content>
            </Tooltip>
            <Tooltip delay={0}>
                <Button
                  isIconOnly
                  size="sm"
                  variant="tertiary"
                  onPress={handleStartVideoCall}
                  className="size-8 rounded-xl text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                  isDisabled={callStatus !== 'idle'}
                >
                  <VideoIcon size={16} />
                </Button>
                <Tooltip.Content>Appel vidéo</Tooltip.Content>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Call panel */}
      {callStatus !== 'idle' && callStatus !== 'ended' && (
        callConversationId === getConversationId() ||
        (recipientId && (callRecipientId === recipientId))
      ) && (
        <CallPanel
          type={callType || 'voice'}
          status={callStatus as 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended'}
          localStream={localStream}
          remoteStreams={remoteStreams}
          screenStream={screenStream}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          recipientName={ctxCallerName || recipientName || 'Utilisateur'}
          recipientAvatar={callerAvatar}
          currentUserName={user?.displayName || user?.username || 'Vous'}
          currentUserAvatar={user?.avatarUrl}
          duration={callDuration}
          mediaError={mediaError}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onStartScreenShare={startScreenShare}
          onStopScreenShare={stopScreenShare}
          onEndCall={endCall}
        />
      )}

      {/* Messages */}
      <ScrollShadow
        className="min-h-0 flex-1 px-1 py-2 md:px-2 md:py-4"
        ref={scrollRef}
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-[var(--muted)]">
              <Spinner size="md" />
              <span className="text-[13px]">Chargement des messages...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
            <Card className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)]/20 bg-[var(--surface-secondary)]/30 px-6 py-5 shadow-none backdrop-blur-sm">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--surface-secondary)]/60">
                <MessageCircleIcon size={22} className="text-[var(--muted)]/50" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-medium text-[var(--foreground)]/70">Aucun message</p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]/50">Soyez le premier à écrire !</p>
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-0.5" ref={messagesContainerRef}>
            {/* Indicateur de chargement des anciens messages */}
            {isLoadingMoreMessages && (
              <div className="flex items-center justify-center gap-2 py-3 text-[var(--muted)]">
                <Spinner size="sm" />
                <span className="text-[12px]">Chargement des anciens messages…</span>
              </div>
            )}
            {dedupedMessages.map((message) => {
              const isEditing = editingMessageId === message.id;
              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  currentUser={user}
                  recipientName={recipientName}
                  isEditing={isEditing}
                  editInput={isEditing ? editInput : ''}
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
              );
            })}
          </div>
        )}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-1.5">
            <div className="flex gap-0.5">
              <span className="inline-block size-1.5 animate-bounce rounded-full bg-[var(--muted)]/50 [animation-delay:0ms]" />
              <span className="inline-block size-1.5 animate-bounce rounded-full bg-[var(--muted)]/50 [animation-delay:150ms]" />
              <span className="inline-block size-1.5 animate-bounce rounded-full bg-[var(--muted)]/50 [animation-delay:300ms]" />
            </div>
            <span className="text-[11px] text-[var(--muted)]/60">
              {typingUsers.map((u) => u.username).join(', ')} est en train d&apos;écrire
            </span>
          </div>
        )}
      </ScrollShadow>

      {/* Cooldown */}
      {cooldownActive && (
        <div className="mx-3 mb-1 flex items-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/8 px-3 py-2 text-[12px] font-medium text-orange-400 backdrop-blur-sm md:mx-4">
          Calme-toi ! Tu envoies trop de messages.
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSendMessage} className="relative shrink-0 px-3 pb-3 pt-1 md:px-4 md:pb-4">
        {/* Mention popover */}
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
          <div className="mb-2 flex items-center gap-2 rounded-t-xl border border-b-0 border-[var(--border)]/40 bg-[var(--surface-secondary)]/20 px-3 py-2">
            <div className="h-4 w-0.5 rounded-full bg-[var(--accent)]" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-[var(--accent)]">
                Réponse à {replyingTo.authorName}
              </p>
              <p className="truncate text-[11px] text-[var(--muted)]/60">{replyingTo.content}</p>
            </div>
            <Button
              isIconOnly
              size="sm"
              variant="tertiary"
              className="size-6 rounded-xl"
              onPress={() => setReplyingTo(null)}
            >
              <XIcon size={14} />
            </Button>
          </div>
        )}

        <div className={`flex items-end gap-1 rounded-xl border border-[var(--border)]/40 bg-[var(--surface)]/60 px-1.5 py-1 backdrop-blur-xl transition-colors focus-within:border-[var(--accent)]/30 md:gap-1.5 ${replyingTo ? 'rounded-t-none' : ''}`}>
          {/* E2EE indicator */}
          

          {/* Text input */}
          <TextArea
            ref={textareaRef}
            rows={1}
            value={messageInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${recipientId ? recipientName || '' : '#général'}`}
            className="min-h-[34px] flex-1 resize-none border-0 bg-transparent text-[13px] shadow-none focus:ring-0"
            aria-label="Message"
          />

          {/* Actions */}
          <div className="mb-0.5 flex shrink-0 items-center gap-0.5">
            <EmojiPicker onSelect={handleEmojiInsert}>
              <Button
                isIconOnly
                size="sm"
                variant="tertiary"
                className="size-7 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <SmileIcon size={18} />
              </Button>
            </EmojiPicker>

            <GifPicker onSelect={handleGifSelect}>
              <Button
                isIconOnly
                size="sm"
                variant="tertiary"
                className="size-7 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <ImageIcon size={18} />
              </Button>
            </GifPicker>

            <Button
              isIconOnly
              size="sm"
              variant="tertiary"
              className={`size-7 rounded-xl transition-colors ${messageInput.trim() ? 'text-[var(--accent)]' : 'text-[var(--muted)]/40'}`}
              isDisabled={!messageInput.trim()}
              onPress={() => {
                if (messageInput.trim()) {
                  handleSendMessage({ preventDefault: () => {} } as React.FormEvent);
                }
              }}
            >
              <SendIcon size={18} />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
