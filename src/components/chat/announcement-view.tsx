'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { MegaphoneIcon, PlusIcon, XIcon, SendIcon, SmileIcon, PencilIcon, Trash2Icon } from '@/components/icons';
import { Button, ScrollShadow, Skeleton } from '@heroui/react';
import { EmojiPicker } from '@/components/chat/emoji-picker';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';
import { Twemoji } from '@/lib/twemoji';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/lib/api';

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface ReactionGroup {
  emoji: string;
  count: number;
  userIds: string[];
}

interface Announcement {
  id: string;
  content: string;
  authorId: string;
  author?: { username: string; displayName?: string; avatarUrl?: string };
  createdAt: string;
  updatedAt?: string;
  reactions: ReactionGroup[];
  isPinned?: boolean;
}

interface AnnouncementViewProps {
  serverId: string;
  channelId: string;
  channelName?: string;
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/* ── Reaction bar ────────────────────────────────────────────────────────────── */

function ReactionBar({
  reactions,
  currentUserId,
  onToggle,
  onAdd,
}: {
  reactions: ReactionGroup[];
  currentUserId?: string;
  onToggle: (emoji: string) => void;
  onAdd: (emoji: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {reactions.map((r) => {
        const hasReacted = !!currentUserId && r.userIds.includes(currentUserId);
        return (
          <button
            key={r.emoji}
            onClick={() => onToggle(r.emoji)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-all',
              hasReacted
                ? 'border-amber-400/40 bg-amber-500/15 text-amber-400 hover:bg-amber-500/20'
                : 'border-[var(--border)]/40 bg-[var(--surface)]/60 text-[var(--foreground)]/70 hover:border-[var(--border)] hover:bg-[var(--surface)]',
            )}
          >
            <Twemoji emoji={r.emoji} size={14} />
            <span className="tabular-nums">{r.count}</span>
          </button>
        );
      })}
      {/* Bouton ajout emoji */}
      <EmojiPicker onSelect={onAdd}>
        <button className="inline-flex size-7 items-center justify-center rounded-full border border-dashed border-[var(--border)]/40 text-[var(--muted)] transition-colors hover:border-amber-400/40 hover:text-amber-400">
          <HugeiconsIcon icon={SmileIcon} size={13} />
        </button>
      </EmojiPicker>
    </div>
  );
}

/* ── Announcement card ───────────────────────────────────────────────────────── */

function AnnouncementCard({
  post,
  currentUserId,
  isAuthor,
  onReaction,
  onDelete,
}: {
  post: Announcement;
  currentUserId?: string;
  isAuthor: boolean;
  onReaction: (messageId: string, emoji: string, hasReacted: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const initials = (post.author?.displayName || post.author?.username || '?')[0].toUpperCase();

  const handleToggle = (emoji: string) => {
    const r = post.reactions.find((x) => x.emoji === emoji);
    const hasReacted = !!currentUserId && !!r?.userIds.includes(currentUserId);
    onReaction(post.id, emoji, hasReacted);
  };

  return (
    <article
      className="group relative rounded-2xl border border-[var(--border)]/30 bg-[var(--surface)]/60 p-5 transition-colors hover:border-amber-500/20 hover:bg-[var(--surface)]"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Pin badge */}
      {post.isPinned && (
        <div className="absolute right-4 top-4 flex items-center gap-1 text-[10px] font-semibold text-amber-400/70">
          <span>📌</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex items-center gap-2.5">
        {post.author?.avatarUrl ? (
          <img
            src={resolveMediaUrl(post.author.avatarUrl) || ''}
            alt=""
            className="size-9 rounded-full object-cover ring-2 ring-amber-500/20"
          />
        ) : (
          <div className="flex size-9 items-center justify-center rounded-full bg-amber-500/20 ring-2 ring-amber-500/20">
            <span className="text-[13px] font-bold text-amber-400">{initials}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[var(--foreground)]">
            {post.author?.displayName || post.author?.username || 'Inconnu'}
          </p>
          <p className="text-[11px] text-[var(--muted)]" title={formatDate(post.createdAt)}>
            {timeAgo(post.createdAt)}
            {post.updatedAt && post.updatedAt !== post.createdAt && (
              <span className="ml-1 opacity-60">(modifié)</span>
            )}
          </p>
        </div>

        {/* Actions (delete) */}
        {isAuthor && showActions && (
          <button
            onClick={() => onDelete(post.id)}
            className="flex size-7 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <HugeiconsIcon icon={Trash2Icon} size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="prose prose-sm max-w-none text-[var(--foreground)] [&>*:last-child]:mb-0">
        <MarkdownRenderer content={post.content} />
      </div>

      {/* Reactions */}
      <ReactionBar
        reactions={post.reactions}
        currentUserId={currentUserId}
        onToggle={handleToggle}
        onAdd={(emoji) => handleToggle(emoji)}
      />
    </article>
  );
}

/* ── New announcement modal ──────────────────────────────────────────────────── */

function NewAnnouncementModal({
  channelName,
  onClose,
  onCreate,
}: {
  channelName?: string;
  onClose: () => void;
  onCreate: (content: string) => void;
}) {
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (!content.trim()) return;
    onCreate(content.trim());
    onClose();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--border)]/40 bg-[var(--surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)]/30 px-5 py-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <HugeiconsIcon icon={MegaphoneIcon} size={15} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--foreground)]">Nouvelle annonce</p>
            <p className="text-[11px] text-[var(--muted)]">#{channelName || 'annonces'}</p>
          </div>
          <Button isIconOnly size="sm" variant="ghost" className="size-8 rounded-lg text-[var(--muted)]" onPress={onClose}>
            <HugeiconsIcon icon={XIcon} size={15} />
          </Button>
        </div>

        {/* Body */}
        <div className="p-5">
          <label className="mb-1.5 block text-[11px] font-medium text-[var(--muted)]">CONTENU <span className="opacity-50">(Markdown supporté)</span></label>
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Rédigez votre annonce…&#10;&#10;Vous pouvez utiliser **gras**, *italique*, # titres, etc."
            rows={7}
            className="w-full resize-none rounded-xl border border-[var(--border)]/50 bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-amber-500/40 focus:outline-none"
          />
          <p className="mt-1 text-right text-[10px] text-[var(--muted)]">{content.length} caractères</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[var(--border)]/30 px-5 py-3">
          <Button size="sm" variant="ghost" className="rounded-lg text-[var(--muted)]" onPress={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            className="rounded-lg bg-amber-500 text-white hover:bg-amber-600"
            onPress={handleSubmit}
            isDisabled={!content.trim()}
          >
            <HugeiconsIcon icon={SendIcon} size={13} />
            Publier
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Main AnnouncementView ───────────────────────────────────────────────────── */

export function AnnouncementView({ serverId, channelId, channelName }: AnnouncementViewProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const messagesById = useRef(new Map<string, boolean>());

  /* Normalise réactions depuis l'API */
  function normaliseReactions(raw: any[]): ReactionGroup[] {
    if (!raw || !raw.length) return [];
    const map = new Map<string, ReactionGroup>();
    for (const r of raw) {
      const emoji = r.emoji;
      if (!map.has(emoji)) map.set(emoji, { emoji, count: 0, userIds: [] });
      const g = map.get(emoji)!;
      g.count++;
      if (r.user_id || r.userId) g.userIds.push(r.user_id || r.userId);
    }
    return Array.from(map.values());
  }

  /* Charge l'historique */
  useEffect(() => {
    setPosts([]);
    setIsLoading(true);
    messagesById.current.clear();

    socketService.requestMessageHistory(serverId, channelId, { limit: 50 }, (res: any) => {
      if (res?.messages) {
        const items: Announcement[] = (res.messages as any[]).map((m: any) => ({
          id: m.id,
          content: m.content,
          authorId: m.authorId || m.senderId || m.sender_id,
          author: m.sender
            ? { username: m.sender.username, displayName: m.sender.displayName || undefined, avatarUrl: m.sender.avatarUrl || undefined }
            : m.senderName
            ? { username: m.senderName, displayName: m.senderName, avatarUrl: m.senderAvatar || undefined }
            : undefined,
          createdAt: m.createdAt || m.created_at || new Date().toISOString(),
          updatedAt: m.updatedAt || m.updated_at,
          reactions: normaliseReactions(m.reactions || []),
          isPinned: m.isPinned || false,
        }));
        items.forEach((i) => messagesById.current.set(i.id, true));
        setPosts(items.reverse());
      }
      setIsLoading(false);
    });

    socketService.joinChannel(channelId);
    return () => socketService.leaveChannel(channelId);
  }, [serverId, channelId]);

  /* Temps réel — nouveau message */
  useEffect(() => {
    const handleNew = (data: any) => {
      const msg = data?.payload ?? data;
      if (msg.channelId !== channelId && msg.channel_id !== channelId) return;
      if (messagesById.current.has(msg.id)) return;
      messagesById.current.set(msg.id, true);
      const post: Announcement = {
        id: msg.id,
        content: msg.content,
        authorId: msg.senderId || msg.sender_id,
        author: msg.sender
          ? { username: msg.sender.username, displayName: msg.sender.displayName || undefined, avatarUrl: msg.sender.avatarUrl || undefined }
          : msg.senderName
          ? { username: msg.senderName, displayName: msg.senderName, avatarUrl: msg.senderAvatar || undefined }
          : undefined,
        createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
        reactions: [],
        isPinned: false,
      };
      setPosts((prev) => [post, ...prev]);
    };

    const handleDeleted = (data: any) => {
      const { messageId } = data?.payload ?? data;
      setPosts((prev) => prev.filter((p) => p.id !== messageId));
    };

    /* Réactions temps réel */
    const handleReaction = (data: any) => {
      const p = data?.payload ?? data;
      const { messageId, emoji, userId, action } = p;
      setPosts((prev) => prev.map((post) => {
        if (post.id !== messageId) return post;
        const reactions = [...post.reactions];
        const idx = reactions.findIndex((r) => r.emoji === emoji);
        if (action === 'add') {
          if (idx >= 0) {
            if (!reactions[idx].userIds.includes(userId)) {
              reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1, userIds: [...reactions[idx].userIds, userId] };
            }
          } else {
            reactions.push({ emoji, count: 1, userIds: [userId] });
          }
        } else {
          if (idx >= 0) {
            const newUserIds = reactions[idx].userIds.filter((id) => id !== userId);
            if (newUserIds.length === 0) reactions.splice(idx, 1);
            else reactions[idx] = { ...reactions[idx], count: newUserIds.length, userIds: newUserIds };
          }
        }
        return { ...post, reactions };
      }));
    };

    socketService.onServerMessageNew(handleNew);
    socketService.onServerMessageDeleted(handleDeleted);
    socketService.on('SERVER_REACTION_UPDATE', handleReaction);
    return () => {
      socketService.off('SERVER_MESSAGE_NEW', handleNew);
      socketService.off('SERVER_MESSAGE_DELETED', handleDeleted);
      socketService.off('SERVER_REACTION_UPDATE', handleReaction);
    };
  }, [channelId]);

  /* Publier une annonce */
  const handleCreate = useCallback((content: string) => {
    socketService.sendServerMessage({ serverId, channelId, content });
  }, [serverId, channelId]);

  /* Supprimer */
  const handleDelete = useCallback((id: string) => {
    socketService.deleteServerMessage(serverId, id, channelId);
  }, [serverId, channelId]);

  /* Toggle réaction */
  const handleReaction = useCallback((messageId: string, emoji: string, hasReacted: boolean) => {
    if (!user) return;
    socketService.toggleServerReaction(serverId, channelId, messageId, emoji, hasReacted);
    // Optimistic update
    setPosts((prev) => prev.map((post) => {
      if (post.id !== messageId) return post;
      const reactions = [...post.reactions];
      const idx = reactions.findIndex((r) => r.emoji === emoji);
      if (!hasReacted) {
        if (idx >= 0) {
          if (!reactions[idx].userIds.includes(user.id)) {
            reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1, userIds: [...reactions[idx].userIds, user.id] };
          }
        } else {
          reactions.push({ emoji, count: 1, userIds: [user.id] });
        }
      } else {
        if (idx >= 0) {
          const newUserIds = reactions[idx].userIds.filter((id) => id !== user.id);
          if (newUserIds.length === 0) reactions.splice(idx, 1);
          else reactions[idx] = { ...reactions[idx], count: newUserIds.length, userIds: newUserIds };
        }
      }
      return { ...post, reactions };
    }));
  }, [serverId, channelId, user]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--background)]">
      {/* ── Header ── */}
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-[var(--border)]/30 bg-[var(--background)]/60 px-4 backdrop-blur-xl">
        <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10">
          <HugeiconsIcon icon={MegaphoneIcon} size={14} className="text-amber-400" />
        </div>
        <h2 className="font-semibold text-[var(--foreground)]">{channelName || 'annonces'}</h2>
        {posts.length > 0 && (
          <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
            {posts.length} annonce{posts.length > 1 ? 's' : ''}
          </span>
        )}
        <div className="ml-auto">
          <Button
            size="sm"
            className="gap-1.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600"
            onPress={() => setShowModal(true)}
          >
            <HugeiconsIcon icon={PlusIcon} size={14} />
            Publier
          </Button>
        </div>
      </div>

      {/* ── Content ── */}
      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 p-5">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[var(--border)]/30 bg-[var(--surface)]/60 p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-9 rounded-full" animationType="shimmer" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-28 rounded" animationType="shimmer" />
                    <Skeleton className="h-2 w-16 rounded" animationType="shimmer" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full rounded" animationType="shimmer" />
                <Skeleton className="h-4 w-3/4 rounded" animationType="shimmer" />
                <Skeleton className="h-4 w-1/2 rounded" animationType="shimmer" />
              </div>
            ))
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="relative mb-5 flex size-20 items-center justify-center rounded-3xl bg-amber-500/10">
                <div className="absolute inset-0 rounded-3xl bg-amber-500/8 blur-xl" />
                <HugeiconsIcon icon={MegaphoneIcon} size={36} className="relative text-amber-400" />
              </div>
              <h3 className="mb-1.5 text-xl font-bold text-[var(--foreground)]">Aucune annonce</h3>
              <p className="mb-5 text-sm text-[var(--muted)]">Publiez la première annonce dans #{channelName || 'annonces'}</p>
              <Button
                className="gap-1.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600"
                onPress={() => setShowModal(true)}
              >
                <HugeiconsIcon icon={PlusIcon} size={15} />
                Publier une annonce
              </Button>
            </div>
          ) : (
            posts.map((post) => (
              <AnnouncementCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                isAuthor={post.authorId === user?.id}
                onReaction={handleReaction}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </ScrollShadow>

      {/* ── Modal ── */}
      {showModal && (
        <NewAnnouncementModal
          channelName={channelName}
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
