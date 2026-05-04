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
  UserPlusIcon, PhoneIcon, VideoIcon, PaperclipIcon, FileTextIcon,
} from '@/components/icons';
import { useMessages } from '@/hooks/use-messages';
import { useAuth } from '@/hooks/use-auth';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useCallContext } from '@/hooks/use-call-context';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useLayoutPrefs, densityCls } from '@/hooks/use-layout-prefs';
import { notify } from '@/hooks/use-notification';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { EmojiPicker } from '@/components/chat/emoji-picker';

import { UserProfilePopover } from '@/components/chat/user-profile-popover';
import { GroupSettingsDialog } from '@/components/chat/group-settings-dialog';
import { getLastSeen } from '@/lib/notification-store';
import { cn } from '@/lib/utils';
import {
  MessageItem,
  shouldGroup,
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
  const ui = useUIStyle();
  const { prefs } = useLayoutPrefs();
  const d = densityCls(prefs.density);
  const [messageInput, setMessageInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; authorName: string } | null>(null);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<'general' | 'members'>('general');

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
      <div data-tour="chat-area" className={`flex min-w-0 flex-1 flex-col overflow-hidden ${ui.contentBg}`}>
        {/* ── Header ── */}
        <div className={`flex ${d.headerH} shrink-0 items-center gap-3 px-4 ${ui.isGlass ? 'border-b border-white/15 bg-white/10 dark:border-white/8' : 'border-b border-border/30 bg-surface/60'}`}>
          {isMobile && (
            <Button size="icon-sm" variant="ghost" onClick={toggleSidebar}>
              <MenuIcon size={20} />
            </Button>
          )}

          <div className="flex size-7 items-center justify-center rounded-xl bg-primary/8">
            {groupInfo?.avatarUrl ? (
              <Avatar className="size-7">
                <AvatarImage src={resolveMediaUrl(groupInfo.avatarUrl)} />
                <AvatarFallback className="text-[10px] font-medium">{groupInfo.name?.[0]}</AvatarFallback>
              </Avatar>
            ) : (
              <UsersRoundIcon size={14} className="text-primary" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-foreground">{groupInfo?.name || 'Groupe'}</h2>
            <p className="text-[10px] text-muted-foreground/60">
              {groupInfo?.participants.length || 0} membres
            </p>
          </div>

          <div className="flex items-center gap-1">
            {canManageMembers && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-sm" variant="ghost"
                      onClick={handleOpenAddMembers}
                      className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      <UserPlusIcon size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ajouter un membre</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm" variant="ghost"
                    onClick={() => handleInitiateCall('voice')}
                    className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                    disabled={callStatus !== 'idle'}
                  >
                    <PhoneIcon size={15} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Appel vocal</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm" variant="ghost"
                    onClick={() => handleInitiateCall('video')}
                    className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                    disabled={callStatus !== 'idle'}
                  >
                    <VideoIcon size={15} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Appel vidéo</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm" variant="ghost"
                    onClick={() => setShowMembers(!showMembers)}
                    className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    <UsersRoundIcon size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Membres</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-secondary/40"
                >
                  <MoreHorizontalIcon size={16} />
                </div>
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
          </div>
        </div>

        {/* ── Messages ── */}
        <ScrollArea ref={scrollRef} className="min-h-0 flex-1 p-2 md:p-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Spinner size="md" />
                <span className="text-[13px]">Chargement des messages...</span>
              </div>
            </div>
          ) : enrichedMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
              <Card className="flex flex-col items-center gap-4 rounded-3xl border border-border/20 bg-surface-secondary/30 px-8 py-7 shadow-none">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                  <UsersRoundIcon size={28} className="text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="text-[15px] font-semibold text-foreground">{groupInfo?.name || 'Groupe'}</h3>
                  <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">
                    C&apos;est le début de votre conversation de groupe. Envoyez un message pour commencer !
                  </p>
                </div>
              </Card>
            </div>
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
            <div className="mt-1 flex items-center gap-1.5 px-3 text-xs text-muted-foreground/70">
              <span className="flex items-center gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="inline-block size-1 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${i * 0.18}s`, animationDuration: '0.9s' }}
                  />
                ))}
              </span>
              <span>{typingUsers.map((u) => u.username).join(', ')} écrit…</span>
            </div>
          )}
        </ScrollArea>

        {/* ── Cooldown notice ── */}
        {cooldownActive && (
          <div className="mx-3 mb-1 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-[12px] font-medium text-amber-400 md:mx-4">
            Calme-toi ! Tu envoies trop de messages.
          </div>
        )}

        {/* ── Input area ── */}
        <form onSubmit={handleSendMessage} className="relative shrink-0 px-3 pb-3 pt-1 md:px-4 md:pb-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            multiple
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv"
            onChange={handleFileSelect}
          />

          {/* Reply preview */}
          {replyingTo && (
            <div className={`mb-2 flex items-center gap-2 px-3 py-2 ${ui.replyBar}`}>
              <div className="h-4 w-0.5 rounded-full bg-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-primary">Réponse à {replyingTo.authorName}</p>
                <p className="truncate text-[11px] text-muted-foreground/60">{replyingTo.content}</p>
              </div>
              <Button size="icon-sm" variant="ghost" className="size-6 rounded-xl" onClick={() => setReplyingTo(null)}>
                <XIcon size={14} />
              </Button>
            </div>
          )}

          <div className={`flex items-center gap-1 px-1.5 py-1.5 transition-colors focus-within:border-primary/30 md:gap-1.5 ${ui.inputBar} ${replyingTo ? 'rounded-tl-none rounded-tr-none border-t-0' : ''}`}>
            {/* File attachment button */}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm" variant="ghost"
                    className="size-7 shrink-0 self-end rounded-xl pb-0.5 text-muted-foreground hover:text-foreground"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? <Spinner size="sm" /> : <PaperclipIcon size={16} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Joindre un fichier (image, PDF, DOCX… &lt;10 Mo)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Pending attachments + text input */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-1 px-0.5 pt-1">
                  {pendingAttachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-1 rounded-lg border border-border/40 bg-surface-secondary px-2 py-0.5 text-[11px]">
                      {att.isImage
                        ? <ImageIcn size={11} className="shrink-0 text-blue-400" />
                        : <FileTextIcon size={11} className="shrink-0 text-amber-400" />}
                      <span className="max-w-30 truncate text-foreground/70">{att.name}</span>
                      <button type="button" className="ml-0.5 text-muted-foreground hover:text-destructive" onClick={() => setPendingAttachments((p) => p.filter((_, j) => j !== i))}>
                        <XIcon size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                ref={textareaRef}
                rows={1}
                value={messageInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={`Écrire dans ${groupInfo?.name || 'le groupe'}…`}
                className="w-full resize-none border-0 bg-transparent py-0.5 text-[13px] leading-5 text-foreground outline-none placeholder:text-muted-foreground/50"
                style={{ minHeight: '20px', maxHeight: '110px', overflowY: 'auto' }}
                aria-label="Message"
              />
            </div>

            {/* Actions */}
            <div className="flex shrink-0 self-end items-center gap-0.5">
              <EmojiPicker onSelect={handleEmojiInsert} onGifSelect={handleGifSelect}>
                <Button size="icon-sm" variant="ghost" className="size-7 rounded-xl text-muted-foreground hover:text-foreground">
                  <SmileIcon size={18} />
                </Button>
              </EmojiPicker>
              <Button
                size="icon-sm" variant="ghost"
                className={`size-7 rounded-xl transition-colors ${messageInput.trim() || pendingAttachments.length > 0 ? 'text-primary' : 'text-muted-foreground/40'}`}
                disabled={!messageInput.trim() && pendingAttachments.length === 0}
                onClick={() => {
                  if (messageInput.trim() || pendingAttachments.length > 0) {
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
