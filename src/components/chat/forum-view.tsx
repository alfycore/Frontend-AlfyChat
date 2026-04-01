'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  ForumIcon,
  PlusIcon,
  ArrowLeftIcon,
  BubbleChatIcon,
  ClockIcon,
  XIcon,
  SendIcon,
  SmileIcon,
  PaperclipIcon,
} from '@/components/icons';
import { Button, Chip, InputGroup, ScrollShadow, Separator, Skeleton, TextArea, TextField } from '@heroui/react';
import { EmojiPicker } from '@/components/chat/emoji-picker';
import { MessageItem, type MessageSender, type MessageData } from '@/components/chat/message-item';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { api, resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author?: { username: string; displayName?: string; avatarUrl?: string };
  createdAt: string;
  replyCount: number;
  lastReplyAt?: string;
  isPinned?: boolean;
  tags: string[];
}

interface ForumViewProps {
  serverId: string;
  channelId: string;
  channelName?: string;
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `il y a ${days}j`;
  return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

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

/* ── Avatar ─────────────────────────────────────────────────────────────────── */

function Avatar({ user, size = 8 }: { user?: ForumPost['author']; size?: number }) {
  const initials = (user?.displayName || user?.username || '?')[0].toUpperCase();
  if (user?.avatarUrl) {
    return (
      <img
        src={resolveMediaUrl(user.avatarUrl) || ''}
        alt={user.displayName || user.username}
        className={cn(`size-${size} rounded-full object-cover shrink-0`)}
      />
    );
  }
  return (
    <div className={cn(`size-${size} rounded-full bg-violet-500/20 flex items-center justify-center shrink-0`)}>
      <span className="text-[11px] font-bold text-violet-400">{initials}</span>
    </div>
  );
}

/* ── New post modal ──────────────────────────────────────────────────────────── */

function NewPostModal({
  channelName,
  onClose,
  onCreate,
}: {
  channelName?: string;
  onClose: () => void;
  onCreate: (title: string, content: string, tags: string[]) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags((prev) => [...prev, t]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    onCreate(title.trim(), content.trim(), tags);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)]/30 bg-[var(--surface)]/80 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)]/30 px-5 py-4">
          <div className="flex size-8 items-center justify-center rounded-xl bg-violet-500/10">
            <ForumIcon size={15} className="text-violet-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--foreground)]">Nouveau post</p>
            <p className="text-[11px] text-[var(--muted)]">#{channelName || 'forum'}</p>
          </div>
          <Button isIconOnly size="sm" variant="ghost" className="size-8 rounded-xl text-[var(--muted)]" onPress={onClose}>
            <XIcon size={15} />
          </Button>
        </div>

        {/* Body */}
        <div className="space-y-3 p-5">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[var(--muted)]">TITRE</label>
            <InputGroup fullWidth>
              <InputGroup.Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de votre post…"
                maxLength={120}
              />
            </InputGroup>
            <p className="mt-1 text-right text-[10px] text-[var(--muted)]">{title.length}/120</p>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[var(--muted)]">CONTENU</label>
            <TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Décrivez votre sujet en détail…"
              rows={5}
              fullWidth
              className="resize-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[var(--muted)]">TAGS <span className="opacity-50">(optionnel, max 5)</span></label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-400">
                  #{tag}
                  <Button
                    isIconOnly size="sm" variant="ghost"
                    onPress={() => removeTag(tag)}
                    className="ml-0.5 size-4 rounded-full text-violet-400/60 hover:text-violet-400 min-w-0"
                  >×</Button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <InputGroup className="flex-1">
                <InputGroup.Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                  placeholder="bug, feature, aide…"
                  disabled={tags.length >= 5}
                  className="text-[12px]"
                />
              </InputGroup>
              <Button size="sm" variant="ghost" className="rounded-xl text-violet-400" onPress={addTag} isDisabled={!tagInput.trim() || tags.length >= 5}>
                Ajouter
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[var(--border)]/30 px-5 py-3">
          <Button size="sm" variant="ghost" className="rounded-xl text-[var(--muted)]" onPress={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            className="rounded-xl bg-violet-500 text-white hover:bg-violet-600"
            onPress={handleSubmit}
            isDisabled={!title.trim() || !content.trim()}
          >
            Publier
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Post card ───────────────────────────────────────────────────────────────── */

function PostCard({ post, onClick }: { post: ForumPost; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group w-full rounded-xl border border-[var(--border)]/30 bg-[var(--surface)]/60 p-4 text-left transition-all hover:border-violet-500/30 hover:bg-[var(--surface)] hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <Avatar user={post.author} size={9} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {post.isPinned && (
              <span className="rounded-xl bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-400">
                Épinglé
              </span>
            )}
            <h3 className="truncate text-sm font-semibold text-[var(--foreground)] group-hover:text-violet-400 transition-colors">
              {post.title}
            </h3>
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--muted)]">{post.content}</p>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--muted)]">
            <span className="font-medium text-[var(--foreground)]/60">
              {post.author?.displayName || post.author?.username || 'Inconnu'}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <ClockIcon size={11} />
              {timeAgo(post.createdAt)}
            </span>
            <span className="ml-auto flex items-center gap-1">
              <BubbleChatIcon size={11} />
              {post.replyCount} réponse{post.replyCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ── Post discussion view ────────────────────────────────────────────────────── */

function PostDiscussion({
  post,
  serverId,
  channelId,
  onBack,
}: {
  post: ForumPost;
  serverId: string;
  channelId: string;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesById = useMemo(() => new Map<string, MessageData>(), [post.id]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  // Load replies — we tag them with the post id via a special prefix in content
  // For now we filter messages whose replyToId matches the post's "root" message id
  useEffect(() => {
    setIsLoading(true);
    setMessages([]);
    messagesById.clear();

    socketService.requestMessageHistory(serverId, channelId, { limit: 200 }, (res: any) => {
      if (res?.messages) {
        const all = (res.messages as any[]).map((m: any) => ({
          ...m,
          authorId: m.authorId || m.senderId || m.sender_id,
          reactions: m.reactions || [],
          isSystem: m.isSystem || m.is_system || false,
        })) as MessageData[];
        // Thread: first message is the root (id === post.id), rest are its replies
        const thread = all.filter(
          (m) => m.id === post.id || m.replyToId === post.id,
        );
        thread.forEach((m) => messagesById.set(m.id, m));
        setMessages(thread);
      }
      setIsLoading(false);
      setTimeout(scrollToBottom, 50);
    });
  }, [post.id, serverId, channelId]);

  // Real-time new messages in this thread
  useEffect(() => {
    const handleNew = (data: any) => {
      const msg = data?.payload ?? data;
      if (msg.channelId !== channelId && msg.channel_id !== channelId) return;
      const replyToId = msg.replyToId || msg.reply_to_id;
      if (replyToId !== post.id) return; // not a reply to this post
      const normalised: MessageData = {
        id: msg.id,
        content: msg.content,
        authorId: msg.senderId || msg.sender_id,
        sender: msg.sender ?? undefined,
        createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
        updatedAt: msg.updatedAt || msg.updated_at,
        reactions: msg.reactions || [],
        replyToId,
        isSystem: msg.isSystem || msg.is_system || false,
      };
      if (messagesById.has(normalised.id)) return;
      messagesById.set(normalised.id, normalised);
      setMessages((prev) => [...prev, normalised]);
      setTimeout(scrollToBottom, 30);
    };

    socketService.onServerMessageNew(handleNew);
    return () => { socketService.off('SERVER_MESSAGE_NEW', handleNew); };
  }, [post.id, channelId]);

  const handleSend = useCallback(() => {
    if (!input.trim() || !user) return;
    socketService.sendServerMessage({
      serverId,
      channelId,
      content: input.trim(),
      replyToId: post.id,
    });
    setInput('');
    setTimeout(scrollToBottom, 50);
  }, [input, user, serverId, channelId, post.id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const currentUser: MessageSender | null = user
    ? { id: user.id, username: user.username, displayName: user.displayName || user.username, avatarUrl: user.avatarUrl ?? undefined }
    : null;

  const dateGroups = useMemo(() => {
    const replies = messages.filter((m) => m.id !== post.id);
    return groupByDate(replies);
  }, [messages, post.id]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Back header */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-[var(--border)]/30 bg-[var(--surface)]/60 px-4 py-3">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="size-8 rounded-xl text-[var(--muted)]"
          onPress={onBack}
        >
          <ArrowLeftIcon size={16} />
        </Button>
        <div className="flex size-7 items-center justify-center rounded-xl bg-violet-500/10">
          <ForumIcon size={14} className="text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{post.title}</p>
          <p className="text-[10px] text-[var(--muted)]">
            {messages.filter((m) => m.id !== post.id).length} réponse{messages.filter((m) => m.id !== post.id).length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Original post */}
      <div className="mx-4 mt-4 shrink-0 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Avatar user={post.author} size={7} />
          <span className="text-[12px] font-semibold text-[var(--foreground)]/80">
            {post.author?.displayName || post.author?.username || 'Inconnu'}
          </span>
          <span className="ml-auto text-[11px] text-[var(--muted)]">{timeAgo(post.createdAt)}</span>
        </div>
        <h2 className="mb-1 text-base font-bold text-[var(--foreground)]">{post.title}</h2>
        <p className="text-[13px] leading-relaxed text-[var(--muted)]">{post.content}</p>
      </div>

      {/* Separator */}
      <div className="relative mx-4 my-4 flex shrink-0 items-center">
        <Separator className="flex-1" />
        <Chip variant="soft" size="sm" className="mx-3 shrink-0 rounded-full border border-[var(--border)] bg-[var(--background)] text-[11px] font-medium text-[var(--muted)]">
          <Chip.Label>Réponses</Chip.Label>
        </Chip>
        <Separator className="flex-1" />
      </div>

      {/* Replies */}
      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
        {isLoading ? (
          <div className="space-y-4 px-4 py-4">
            {[80, 55, 70].map((w, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" animationType="shimmer" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-20 rounded" animationType="shimmer" />
                  <Skeleton className="h-4 rounded" animationType="shimmer" style={{ width: `${w}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : dateGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-violet-500/10">
              <BubbleChatIcon size={22} className="text-violet-400" />
            </div>
            <p className="text-sm font-medium text-[var(--foreground)]">Pas encore de réponses</p>
            <p className="text-[12px] text-[var(--muted)]">Soyez le premier à répondre !</p>
          </div>
        ) : (
          <div className="pb-2">
            {dateGroups.map((group, gi) => (
              <div key={gi}>
                <div className="relative mx-4 my-3 flex items-center">
                  <Separator className="flex-1" />
                  <span className="mx-3 shrink-0 text-[10px] text-[var(--muted)]">{group.date}</span>
                  <Separator className="flex-1" />
                </div>
                {group.messages.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    currentUser={currentUser}
                    isEditing={false}
                    editInput=""
                    replyMessage={null}
                    onSetEditInput={() => {}}
                    onReply={() => {}}
                    onCopy={(c) => navigator.clipboard.writeText(c).catch(() => {})}
                    onReaction={() => {}}
                    onRemoveReaction={() => {}}
                    onStartEdit={() => {}}
                    onSaveEdit={() => {}}
                    onCancelEdit={() => {}}
                    onDelete={() => {}}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollShadow>

      {/* Reply input */}
      <div className="shrink-0 px-4 pb-4 pt-1">
        <div className="flex items-end gap-1 rounded-xl border border-[var(--border)]/60 bg-[var(--surface)]/80 px-2 py-1.5 transition-colors focus-within:border-violet-500/30">
          <label className="flex size-8 shrink-0 cursor-pointer items-center justify-center self-end rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-secondary)]/40 hover:text-[var(--foreground)]">
            <input type="file" accept="image/*" className="hidden" />
            <PaperclipIcon size={16} />
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Répondre à ce post…"
            rows={1}
            className="min-h-9 max-h-48 flex-1 resize-none border-0 bg-transparent py-1.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none"
          />
          <div className="self-end pb-0.5">
            <EmojiPicker onSelect={(emoji) => setInput((prev) => prev + emoji)}>
              <Button isIconOnly size="sm" variant="ghost" className="size-8 rounded-xl text-[var(--muted)]">
                <SmileIcon size={16} />
              </Button>
            </EmojiPicker>
          </div>
          <div className="self-end pb-0.5">
            <Button
              isIconOnly
              size="sm"
              className={cn(
                'size-8 rounded-xl transition-all',
                input.trim()
                  ? 'bg-violet-500 text-white'
                  : 'bg-[var(--surface-secondary)] text-[var(--muted)] opacity-50',
              )}
              onPress={handleSend}
              isDisabled={!input.trim()}
            >
              <SendIcon size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Forum skeleton ──────────────────────────────────────────────────────────── */

function ForumSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-[var(--border)]/30 bg-[var(--surface)]/40 p-4">
          <div className="flex gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" animationType="shimmer" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded" animationType="shimmer" />
              <Skeleton className="h-3 w-full rounded" animationType="shimmer" />
              <Skeleton className="h-3 w-2/3 rounded" animationType="shimmer" />
              <Skeleton className="h-3 w-1/3 rounded" animationType="shimmer" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main ForumView ──────────────────────────────────────────────────────────── */

export function ForumView({ serverId, channelId, channelName }: ForumViewProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);

  // Load posts = load all messages in channel, treat each root message (no replyToId) as a post
  useEffect(() => {
    setIsLoading(true);
    setPosts([]);
    setSelectedPost(null);

    socketService.requestMessageHistory(serverId, channelId, { limit: 200 }, (res: any) => {
      if (res?.messages) {
        const all = (res.messages as any[]).map((m: any) => ({
          ...m,
          authorId: m.authorId || m.senderId || m.sender_id,
          reactions: m.reactions || [],
          isSystem: false,
        }));

        // Root messages = no replyToId
        const roots = all.filter((m: any) => !m.replyToId && !m.reply_to_id);
        // Count replies per root
        const replyCounts: Record<string, number> = {};
        const lastReply: Record<string, string> = {};
        for (const m of all) {
          const rid = m.replyToId || m.reply_to_id;
          if (rid) {
            replyCounts[rid] = (replyCounts[rid] || 0) + 1;
            if (!lastReply[rid] || m.createdAt > lastReply[rid]) {
              lastReply[rid] = m.createdAt || m.created_at;
            }
          }
        }

        const forumPosts: ForumPost[] = roots.map((m: any) => ({
          id: m.id,
          title: m.content?.split('\n')[0]?.slice(0, 80) || 'Post sans titre',
          content: m.content || '',
          authorId: m.authorId,
          author: m.sender
            ? { username: m.sender.username, displayName: m.sender.displayName, avatarUrl: m.sender.avatarUrl }
            : m.senderName
            ? { username: m.senderName, displayName: m.senderName, avatarUrl: m.senderAvatar || undefined }
            : undefined,
          createdAt: m.createdAt || m.created_at || new Date().toISOString(),
          replyCount: replyCounts[m.id] || 0,
          lastReplyAt: lastReply[m.id],
          tags: Array.isArray(m.forumTags) ? m.forumTags : (m.forum_tags ? (typeof m.forum_tags === 'string' ? JSON.parse(m.forum_tags) : m.forum_tags) : []),
        }));

        // Sort: pinned first, then by lastReplyAt or createdAt desc
        forumPosts.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const aDate = a.lastReplyAt || a.createdAt;
          const bDate = b.lastReplyAt || b.createdAt;
          return bDate.localeCompare(aDate);
        });

        setPosts(forumPosts);
      }
      setIsLoading(false);
    });

    socketService.joinChannel(channelId);
    return () => { socketService.leaveChannel(channelId); };
  }, [serverId, channelId]);

  // Real-time: new root message = new post
  useEffect(() => {
    const handleNew = (data: any) => {
      const msg = data?.payload ?? data;
      if (msg.channelId !== channelId && msg.channel_id !== channelId) return;
      const replyToId = msg.replyToId || msg.reply_to_id;
      if (replyToId) {
        // Update reply count for existing post
        setPosts((prev) =>
          prev.map((p) =>
            p.id === replyToId
              ? { ...p, replyCount: p.replyCount + 1, lastReplyAt: msg.createdAt || new Date().toISOString() }
              : p,
          ),
        );
        return;
      }
      // New root post
      const newPost: ForumPost = {
        id: msg.id,
        title: msg.content?.split('\n')[0]?.slice(0, 80) || 'Post sans titre',
        content: msg.content || '',
        authorId: msg.senderId || msg.sender_id,
        author: msg.sender
          ? { username: msg.sender.username, displayName: msg.sender.displayName, avatarUrl: msg.sender.avatarUrl }
          : msg.senderName
          ? { username: msg.senderName, displayName: msg.senderName, avatarUrl: msg.senderAvatar || undefined }
          : undefined,
        createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
        replyCount: 0,
        tags: Array.isArray(msg.forumTags) ? msg.forumTags : [],
      };
      setPosts((prev) => [newPost, ...prev]);
    };

    socketService.onServerMessageNew(handleNew);
    return () => { socketService.off('SERVER_MESSAGE_NEW', handleNew); };
  }, [channelId]);

  const handleCreatePost = useCallback((title: string, content: string, tags: string[]) => {
    if (!user) return;
    const body = title === content ? title : `${title}\n${content}`;
    socketService.sendServerMessage({ serverId, channelId, content: body, tags });
  }, [user, serverId, channelId]);

  // If a post is selected → discussion view
  if (selectedPost) {
    return (
      <PostDiscussion
        post={selectedPost}
        serverId={serverId}
        channelId={channelId}
        onBack={() => setSelectedPost(null)}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-[var(--border)]/30 bg-[var(--surface)]/60 px-4">
        <div className="flex size-7 items-center justify-center rounded-xl bg-violet-500/10">
          <ForumIcon size={14} className="text-violet-400" />
        </div>
        <h2 className="font-semibold text-[var(--foreground)]">{channelName || 'forum'}</h2>
        <p className="text-[12px] text-[var(--muted)]">
          {isLoading ? '…' : `${posts.length} post${posts.length !== 1 ? 's' : ''}`}
        </p>
        <div className="ml-auto">
          <Button
            size="sm"
            className="h-8 rounded-xl bg-violet-500 px-3 text-[12px] font-medium text-white hover:bg-violet-600"
            onPress={() => setShowNewPost(true)}
          >
            <PlusIcon size={13} className="mr-1" />
            Nouveau post
          </Button>
        </div>
      </div>

      {/* Post list */}
      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <ForumSkeleton />
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-4 flex size-16 items-center justify-center rounded-2xl bg-violet-500/10">
              <div className="absolute inset-0 rounded-2xl bg-violet-500/8 " />
              <ForumIcon size={32} className="relative text-violet-400" />
            </div>
            <h3 className="mb-1 text-xl font-bold text-[var(--foreground)]">Aucun post pour l&apos;instant</h3>
            <p className="mb-4 text-sm text-[var(--muted)]">Lancez la discussion en créant le premier post.</p>
            <Button
              size="sm"
              className="rounded-xl bg-violet-500 px-4 text-white hover:bg-violet-600"
              onPress={() => setShowNewPost(true)}
            >
              <PlusIcon size={13} className="mr-1" />
              Créer un post
            </Button>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
            ))}
          </div>
        )}
      </ScrollShadow>

      {/* New post modal */}
      {showNewPost && (
        <NewPostModal
          channelName={channelName}
          onClose={() => setShowNewPost(false)}
          onCreate={handleCreatePost}
        />
      )}
    </div>
  );
}
