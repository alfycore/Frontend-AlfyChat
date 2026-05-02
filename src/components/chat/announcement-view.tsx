'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { MegaphoneIcon, PlusIcon, XIcon, SendIcon, SmileIcon, PencilIcon, Trash2Icon, MenuIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { EmojiPicker } from '@/components/chat/emoji-picker';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';
import { Twemoji } from '@/lib/twemoji';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useServerPermissions } from '@/hooks/use-server-permissions';
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
          <Button
            key={r.emoji}
            size="sm"
            variant="ghost"
            onClick={() => onToggle(r.emoji)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-all h-auto',
              hasReacted
                ? 'border-amber-400/40 bg-amber-500/15 text-amber-400 hover:bg-amber-500/20'
                : 'border-border/40 bg-card/60 text-foreground/70 hover:border-border hover:bg-card',
            )}
          >
            <Twemoji emoji={r.emoji} size={14} />
            <span className="tabular-nums">{r.count}</span>
          </Button>
        );
      })}
      {/* Bouton ajout emoji */}
      <EmojiPicker onSelect={onAdd}>
        <Button
          size="icon-sm"
          variant="ghost"
          className="size-7 rounded-full border border-dashed border-border/40 text-muted-foreground hover:border-amber-400/40 hover:text-amber-400"
        >
          <SmileIcon size={13} />
        </Button>
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
  const ui = useUIStyle();
  const initials = (post.author?.displayName || post.author?.username || '?')[0].toUpperCase();

  const handleToggle = (emoji: string) => {
    const r = post.reactions.find((x) => x.emoji === emoji);
    const hasReacted = !!currentUserId && !!r?.userIds.includes(currentUserId);
    onReaction(post.id, emoji, hasReacted);
  };

  return (
    <article
      className={cn(
        'group relative rounded-2xl p-5 transition-all duration-200',
        ui.isGlass
          ? 'border border-white/12 bg-white/7 backdrop-blur-xl hover:bg-white/12 hover:border-white/20'
          : 'border border-border/40 bg-card/60 shadow-sm hover:border-amber-500/20 hover:bg-card hover:shadow-md',
      )}
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
            className="size-9 rounded-xl object-cover ring-1 ring-amber-500/25 shadow-sm"
          />
        ) : (
          <div className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-amber-500/30 to-amber-500/15 ring-1 ring-amber-500/25 shadow-sm">
            <span className="font-heading text-[13px] tracking-tight text-amber-400">{initials}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-heading text-[13px] tracking-tight text-foreground">
            {post.author?.displayName || post.author?.username || 'Inconnu'}
          </p>
          <p className="text-[11px] text-muted-foreground" title={formatDate(post.createdAt)}>
            {timeAgo(post.createdAt)}
            {post.updatedAt && post.updatedAt !== post.createdAt && (
              <span className="ml-1 opacity-60">(modifié)</span>
            )}
          </p>
        </div>

        {/* Actions (delete) */}
        {isAuthor && showActions && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => onDelete(post.id)}
            className="size-7 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2Icon size={14} />
          </Button>
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border/30 bg-card/90 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/30 px-5 py-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
            <MegaphoneIcon size={15} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Nouvelle annonce</p>
            <p className="text-[11px] text-muted-foreground">#{channelName || 'annonces'}</p>
          </div>
          <Button size="icon-sm" variant="ghost" className="size-8 rounded-xl text-muted-foreground" onClick={onClose}>
            <XIcon size={15} />
          </Button>
        </div>

        {/* Body */}
        <div className="p-5">
          <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">CONTENU <span className="opacity-50">(Markdown supporté)</span></label>
          <Textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"Rédigez votre annonce…\n\nVous pouvez utiliser **gras**, *italique*, # titres, etc."}
            rows={7}
            className="w-full resize-none"
          />
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{content.length} caractères</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border/30 px-5 py-3">
          <Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            className="rounded-xl bg-amber-500 text-white hover:bg-amber-600"
            onClick={handleSubmit}
            disabled={!content.trim()}
          >
            <SendIcon size={13} />
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
  const ui = useUIStyle();
  const { isMobile, toggleSidebar } = useMobileNav();
  const perms = useServerPermissions(serverId);
  const canPublish = perms.isOwner || perms.isAdmin || perms.canManage || perms.canManageMessages;
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
    <div className={`flex h-full min-h-0 flex-col ${ui.isGlass ? 'bg-white/20 backdrop-blur-2xl dark:bg-black/25' : ''}`}>
      {/* ── Header ── */}
      <div className={`flex h-14 shrink-0 items-center gap-2.5 px-3 ${ui.header}`}>
        {isMobile && (
          <Button size="icon-sm" variant="ghost" className="size-8 shrink-0 rounded-xl text-muted-foreground" onClick={toggleSidebar}>
            <MenuIcon size={16} />
          </Button>
        )}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-amber-400/15">
          <MegaphoneIcon size={13} className="text-amber-400" />
        </div>
        <h2 className="flex-1 truncate text-[14px] font-semibold text-foreground">{channelName || 'annonces'}</h2>
        {canPublish && (
          <button
            onClick={() => setShowModal(true)}
            className="flex h-7 items-center gap-1.5 rounded-xl bg-amber-400/15 px-3 text-[12px] font-medium text-amber-400 transition-colors hover:bg-amber-400/25"
          >
            <PlusIcon size={13} /> Publier
          </button>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-2xl space-y-4 p-5">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[var(--border)]/30 bg-[var(--surface)]/60 p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-28 rounded" />
                    <Skeleton className="h-2 w-16 rounded" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </div>
            ))
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-5 flex size-[72px] items-center justify-center rounded-[22px] bg-amber-400/10">
                <MegaphoneIcon size={30} className="text-amber-400/60" />
              </div>
              <h3 className="mb-1.5 text-[18px] font-bold tracking-tight text-foreground">Aucune annonce</h3>
              <p className="mb-5 max-w-xs text-[13px] text-muted-foreground">Publiez la première annonce dans #{channelName || 'annonces'}</p>
              <Button
                className="gap-1.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600"
                onClick={() => setShowModal(true)}
              >
                <PlusIcon size={15} />
                Publier une annonce
              </Button>
            </div>
          ) : (
            posts.map((post) => (
              <AnnouncementCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                isAuthor={post.authorId === user?.id || canPublish}
                onReaction={handleReaction}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </ScrollArea>

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
