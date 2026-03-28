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
  UsersRoundIcon, SendIcon, SmileIcon, MoreHorizontalIcon, ReplyIcon, XIcon,
  LogOutIcon, SettingsIcon, CrownIcon, ImageIcon as ImageIcn, MenuIcon,
  UserPlusIcon, PhoneIcon, VideoIcon,
} from '@/components/icons';
import { useMessages } from '@/hooks/use-messages';
import { useAuth } from '@/hooks/use-auth';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useCallContext } from '@/hooks/use-call-context';
import { notify } from '@/hooks/use-notification';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import {
  Avatar,
  Button,
  Card,
  Dropdown,
  ScrollShadow,
  Spinner,
  Tooltip,
} from '@heroui/react';
import { EmojiPicker } from '@/components/chat/emoji-picker';
import { GifPicker } from '@/components/chat/gif-picker';
import { UserProfilePopover } from '@/components/chat/user-profile-popover';
import { GroupSettingsDialog } from '@/components/chat/group-settings-dialog';
import {
  MessageItem,
  type MessageSender,
  type MessageData,
} from '@/components/chat/message-item';

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
  const [messageInput, setMessageInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; authorName: string } | null>(null);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<'general' | 'members'>('general');

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

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
  }, [groupId, scrollToBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkIfAtBottom);
      return () => el.removeEventListener('scroll', checkIfAtBottom);
    }
  }, [checkIfAtBottom]);

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    const obs = new ResizeObserver(() => {
      if (isAtBottomRef.current) scrollToBottom();
    });
    obs.observe(messagesContainerRef.current);
    return () => obs.disconnect();
  }, [scrollToBottom]);

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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (messageInput.trim()) handleSendMessage(e as unknown as React.FormEvent);
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
  };

  const handleLeaveGroup = () => {
    socketService.leaveGroup(groupId);
    onLeave?.();
  };

  const isOwner = user?.id === groupInfo?.ownerId;
  const myRole = groupInfo?.participants.find((p) => p.userId === user?.id)?.role;
  const canManageMembers = isOwner || myRole === 'admin';

  const handleOpenAddMembers = () => {
    setSettingsInitialSection('members');
    setShowSettings(true);
  };

  const handleInitiateCall = (type: 'voice' | 'video') => {
    initiateGroupCall(groupId, type, groupInfo?.name);
  };

  if (!user) return null;

  return (
    <div className="flex h-full flex-1">
      {/* ── Zone de chat principale ── */}
      <div data-tour="chat-area" className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* ── Header ── */}
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--border)]/30 bg-[var(--background)]/80 px-4 backdrop-blur-xl">
          {isMobile && (
            <Button isIconOnly size="sm" variant="ghost" onPress={toggleSidebar}>
              <MenuIcon size={20} />
            </Button>
          )}

          <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--accent)]/8">
            {groupInfo?.avatarUrl ? (
              <Avatar size="sm" className="size-7">
                <Avatar.Image src={resolveMediaUrl(groupInfo.avatarUrl)} />
                <Avatar.Fallback className="text-[10px] font-medium">{groupInfo.name?.[0]}</Avatar.Fallback>
              </Avatar>
            ) : (
              <UsersRoundIcon size={14} className="text-[var(--accent)]" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-[var(--foreground)]">{groupInfo?.name || 'Groupe'}</h2>
            <p className="text-[10px] text-[var(--muted)]/60">
              {groupInfo?.participants.length || 0} membres
            </p>
          </div>

          <div className="flex items-center gap-1">
            {canManageMembers && (
              <Tooltip delay={0}>
                <Button
                  isIconOnly size="sm" variant="ghost"
                  onPress={handleOpenAddMembers}
                  className="size-8 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  <UserPlusIcon size={16} />
                </Button>
                <Tooltip.Content>Ajouter un membre</Tooltip.Content>
              </Tooltip>
            )}

            <Tooltip delay={0}>
              <Button
                isIconOnly size="sm" variant="ghost"
                onPress={() => handleInitiateCall('voice')}
                className="size-8 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)]"
                isDisabled={callStatus !== 'idle'}
              >
                <PhoneIcon size={15} />
              </Button>
              <Tooltip.Content>Appel vocal</Tooltip.Content>
            </Tooltip>

            <Tooltip delay={0}>
              <Button
                isIconOnly size="sm" variant="ghost"
                onPress={() => handleInitiateCall('video')}
                className="size-8 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)]"
                isDisabled={callStatus !== 'idle'}
              >
                <VideoIcon size={15} />
              </Button>
              <Tooltip.Content>Appel vidéo</Tooltip.Content>
            </Tooltip>

            <Tooltip delay={0}>
              <Button
                isIconOnly size="sm" variant="ghost"
                onPress={() => setShowMembers(!showMembers)}
                className="size-8 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <UsersRoundIcon size={16} />
              </Button>
              <Tooltip.Content>Membres</Tooltip.Content>
            </Tooltip>

            <Dropdown>
              <Dropdown.Trigger>
                <div
                  role="button"
                  tabIndex={0}
                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-secondary)]/40"
                >
                  <MoreHorizontalIcon size={16} />
                </div>
              </Dropdown.Trigger>
              <Dropdown.Popover placement="bottom end">
                <Dropdown.Menu
                  aria-label="Options groupe"
                  onAction={(key) => {
                    if (key === 'settings') { setSettingsInitialSection('general'); setShowSettings(true); }
                    if (key === 'leave') handleLeaveGroup();
                  }}
                >
                  <Dropdown.Item id="settings">
                    <SettingsIcon size={16} />
                    Paramètres du groupe
                  </Dropdown.Item>
                  <Dropdown.Item id="leave" className="text-red-500">
                    <LogOutIcon size={16} />
                    Quitter le groupe
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        </div>

        {/* ── Messages ── */}
        <ScrollShadow ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-2 md:p-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-[var(--muted)]">
                <Spinner size="md" />
                <span className="text-[13px]">Chargement des messages...</span>
              </div>
            </div>
          ) : enrichedMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
              <Card className="flex flex-col items-center gap-4 rounded-3xl border border-[var(--border)]/20 bg-[var(--surface-secondary)]/30 px-8 py-7 shadow-none backdrop-blur-sm">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10">
                  <UsersRoundIcon size={28} className="text-[var(--accent)]" />
                </div>
                <div className="text-center">
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)]">{groupInfo?.name || 'Groupe'}</h3>
                  <p className="mt-1 max-w-xs text-[13px] text-[var(--muted)]">
                    C&apos;est le début de votre conversation de groupe. Envoyez un message pour commencer !
                  </p>
                </div>
              </Card>
            </div>
          ) : (
            <div className="space-y-1" ref={messagesContainerRef}>
              {enrichedMessages.map((message) => {
                const isEditing = editingMessageId === message.id;
                return (
                  <MessageItem
                    key={message.id}
                    message={message}
                    currentUser={currentUser}
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
            <div className="mt-1 flex items-center gap-1.5 px-3 text-xs text-[var(--muted)]/70">
              <span className="flex items-center gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="inline-block size-1 animate-bounce rounded-full bg-[var(--muted)]"
                    style={{ animationDelay: `${i * 0.18}s`, animationDuration: '0.9s' }}
                  />
                ))}
              </span>
              <span>{typingUsers.map((u) => u.username).join(', ')} écrit…</span>
            </div>
          )}
        </ScrollShadow>

        {/* ── Reply bar ── */}
        {replyingTo && (
          <div className="flex items-center gap-2 rounded-t-xl border border-b-0 border-[var(--border)]/40 bg-[var(--surface-secondary)]/30 px-4 py-2 backdrop-blur-sm">
            <ReplyIcon size={16} className="text-[var(--muted)]" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{replyingTo.authorName}</p>
              <p className="truncate text-xs text-[var(--muted)]">{replyingTo.content}</p>
            </div>
            <Button isIconOnly size="sm" variant="ghost" onPress={() => setReplyingTo(null)}>
              <XIcon size={14} />
            </Button>
          </div>
        )}

        {/* ── Input area ── */}
        <div className="shrink-0 px-4 pb-4">
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <div className={`relative flex min-w-0 flex-1 items-end gap-1 rounded-xl border border-[var(--border)]/60 bg-[var(--surface)]/80 px-2 py-1.5 backdrop-blur-sm transition-colors focus-within:border-[var(--accent)]/30 ${replyingTo ? 'rounded-t-none border-t-0' : ''}`}>
              <EmojiPicker onSelect={handleEmojiInsert}>
                <div className="mb-0.5 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-secondary)]/40 hover:text-[var(--foreground)]">
                  <SmileIcon size={18} />
                </div>
              </EmojiPicker>
              <textarea
                ref={textareaRef}
                value={messageInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Écrire dans ${groupInfo?.name || 'le groupe'}…`}
                className="min-h-9 max-h-30 flex-1 resize-none border-0 bg-transparent py-1.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:outline-none"
                rows={1}
              />
              <GifPicker onSelect={handleGifSelect}>
                <div className="mb-0.5 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-secondary)]/40 hover:text-[var(--foreground)]">
                  <ImageIcn size={18} />
                </div>
              </GifPicker>
            </div>
            <Button
              type="submit"
              isIconOnly
              size="sm"
              isDisabled={!messageInput.trim()}
              className={`mb-0.5 size-8 shrink-0 rounded-xl transition-all ${messageInput.trim() ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-[var(--surface-secondary)] text-[var(--muted)] opacity-50'}`}
            >
              <SendIcon size={16} />
            </Button>
          </form>
        </div>
      </div>

      {/* ── Panel membres (sidebar droite) ── */}
      {showMembers && (
        <div className="flex w-52 flex-col border-l border-[var(--border)]/30 bg-[var(--background)]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">
              Membres — {groupInfo?.participants.length || 0}
            </p>
            <Button isIconOnly size="sm" variant="tertiary" className="size-6 rounded-md" onPress={() => setShowMembers(false)}>
              <XIcon size={12} />
            </Button>
          </div>
          <ScrollShadow className="flex-1 overflow-y-auto">
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
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 hover:bg-[var(--surface-secondary)]/30 ${!participant.isOnline ? 'opacity-40' : ''}`}
                    >
                      <div className="relative shrink-0">
                        <Avatar size="sm" className="size-7">
                          <Avatar.Image src={participant.avatarUrl ? resolveMediaUrl(participant.avatarUrl) : undefined} />
                          <Avatar.Fallback className="text-[10px] font-medium">{(participant.displayName || participant.username)?.[0] || '?'}</Avatar.Fallback>
                        </Avatar>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-[1.5px] ring-[var(--background)] ${
                            participant.isOnline ? 'bg-green-500' : 'bg-[var(--muted)]/30'
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-[12px] font-medium">
                            {participant.displayName || participant.username || 'Utilisateur'}
                          </p>
                          {participant.role === 'owner' && (
                            <CrownIcon size={10} className="shrink-0 text-yellow-500" />
                          )}
                        </div>
                      </div>
                    </button>
                  </UserProfilePopover>
                ))}
            </div>
          </ScrollShadow>
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
