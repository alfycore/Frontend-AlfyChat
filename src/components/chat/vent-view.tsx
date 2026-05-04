'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VentIcon, HeartIcon, MenuIcon, SendIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { EmojiPicker } from '@/components/chat/emoji-picker';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface VentPost {
  id: string;
  content: string;
  authorId: string;   // kept internally for own-post detection, never shown
  createdAt: string;
  supports: string[]; // userIds who sent a support reaction
  isOwn?: boolean;
}
interface VentViewProps { serverId: string; channelId: string; channelName?: string }

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function parseVent(msg: any): VentPost | null {
  try {
    const c = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
    if (c?.__type !== 'vent') return null;
    return {
      id: msg.id,
      content: c.content,
      authorId: msg.senderId || msg.authorId || msg.sender_id,
      createdAt: msg.createdAt || msg.created_at,
      supports: c.supports || [],
    };
  } catch { return null; }
}

/* ── VentCard ──────────────────────────────────────────────────────────────── */

function VentCard({ post, currentUserId, onSupport, onDelete }: {
  post: VentPost;
  currentUserId?: string;
  onSupport: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const ui = useUIStyle();
  const isOwn = post.authorId === currentUserId;
  const hasSupported = currentUserId ? post.supports.includes(currentUserId) : false;

  return (
    <div className={cn(
      'mx-4 mb-3 rounded-2xl border p-4 transition-all',
      isOwn
        ? ui.isGlass
          ? 'border-red-400/30 bg-red-400/6 backdrop-blur-xl'
          : 'border-red-400/25 bg-red-400/4'
        : ui.isGlass
          ? 'border-white/12 bg-white/7 backdrop-blur-xl'
          : 'border-border/50 bg-card shadow-sm',
    )}>
      {/* anonymous badge */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-full bg-red-400/15">
          <VentIcon size={12} className="text-red-400" />
        </div>
        <span className="text-[12px] font-medium text-muted-foreground">
          {isOwn ? 'Vous (anonyme)' : 'Anonyme'}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground/60">{timeAgo(post.createdAt)}</span>
      </div>

      {/* content */}
      <p className="text-[14px] leading-relaxed text-foreground">{post.content}</p>

      {/* actions */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button onClick={() => onSupport(post.id)}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium transition-colors',
            hasSupported
              ? 'bg-red-400/15 text-red-400'
              : 'bg-foreground/5 text-muted-foreground hover:bg-red-400/10 hover:text-red-400',
          )}>
          <HeartIcon size={12} className={hasSupported ? 'fill-red-400' : ''} />
          {post.supports.length > 0 && <span>{post.supports.length}</span>}
          {hasSupported ? 'Soutenu' : 'Soutenir'}
        </button>
        {isOwn && (
          <button onClick={() => onDelete(post.id)}
            className="text-[11px] text-muted-foreground/50 hover:text-destructive transition-colors">
            Retirer
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────────── */

export function VentView({ serverId, channelId, channelName }: VentViewProps) {
  const { user } = useAuth();
  const ui = useUIStyle();
  const { isMobile, toggleSidebar } = useMobileNav();

  const [posts, setPosts] = useState<VentPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setPosts([]);
    setIsLoading(true);
    socketService.requestMessageHistory(serverId, channelId, { limit: 100 }, (res: any) => {
      if (res?.messages) {
        const parsed = (res.messages as any[]).map(parseVent).filter(Boolean) as VentPost[];
        setPosts(parsed.reverse());
      }
      setIsLoading(false);
    });
    socketService.joinChannel(channelId);
    return () => { socketService.leaveChannel(channelId); };
  }, [serverId, channelId]);

  useEffect(() => {
    const handleNew = (data: any) => {
      const msg = data?.payload ?? data;
      if (msg.channelId !== channelId && msg.channel_id !== channelId) return;
      const p = parseVent(msg);
      if (p) setPosts(prev => [p, ...prev]);
    };
    const handleEdited = (data: any) => {
      const p = data?.payload ?? data;
      setPosts(prev => prev.map(post => {
        if (post.id !== p.messageId) return post;
        try {
          const c = JSON.parse(p.content);
          return { ...post, supports: c.supports ?? post.supports };
        } catch { return post; }
      }));
    };
    const handleDeleted = (data: any) => {
      const id = (data?.payload ?? data)?.messageId;
      if (id) setPosts(prev => prev.filter(p => p.id !== id));
    };
    socketService.onServerMessageNew(handleNew);
    socketService.onServerMessageEdited(handleEdited);
    socketService.onServerMessageDeleted(handleDeleted);
    return () => {
      socketService.off('SERVER_MESSAGE_NEW', handleNew);
      socketService.off('SERVER_MESSAGE_EDITED', handleEdited);
      socketService.off('SERVER_MESSAGE_DELETED', handleDeleted);
    };
  }, [channelId]);

  const handleSupport = useCallback((id: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === id);
    if (!post) return;
    const supports = post.supports.includes(user.id)
      ? post.supports.filter(u => u !== user.id)
      : [...post.supports, user.id];
    const updated = JSON.stringify({ __type: 'vent', content: post.content, supports });
    socketService.editServerMessage(serverId, id, updated, channelId);
    setPosts(prev => prev.map(p => p.id === id ? { ...p, supports } : p));
  }, [posts, user, serverId, channelId]);

  const handleDelete = useCallback((id: string) => {
    socketService.deleteServerMessage(serverId, id, channelId);
  }, [serverId, channelId]);

  const handleSend = useCallback(() => {
    if (!draft.trim()) return;
    const content = JSON.stringify({ __type: 'vent', content: draft.trim(), supports: [] });
    socketService.sendServerMessage({ serverId, channelId, content });
    setDraft('');
  }, [draft, serverId, channelId]);

  return (
    <div className={`flex h-full min-h-0 flex-col ${ui.contentBg}`}>
      {/* Header */}
      <div className={`flex h-14 shrink-0 items-center gap-2.5 px-3 ${ui.header}`}>
        {isMobile && (
          <Button size="icon-sm" variant="ghost" className="size-8 shrink-0 rounded-xl text-muted-foreground" onClick={toggleSidebar}>
            <MenuIcon size={16} />
          </Button>
        )}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-red-400/15">
          <VentIcon size={13} className="text-red-400" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-[14px] font-semibold text-foreground">{channelName || 'Défouloir'}</h2>
          <p className="text-[10px] text-muted-foreground/70">100 % anonyme · exprimez-vous librement</p>
        </div>
      </div>

      {/* banner */}
      <div className={cn(
        'mx-4 mt-3 flex items-center gap-2.5 rounded-2xl border px-4 py-2.5',
        ui.isGlass
          ? 'border-red-400/20 bg-red-400/6 backdrop-blur-xl'
          : 'border-red-400/20 bg-red-400/4',
      )}>
        <HeartIcon size={14} className="shrink-0 text-red-400" />
        <p className="text-[11px] text-muted-foreground/80">
          Tout ce qui est posté ici est <strong className="text-foreground/80">anonyme</strong>. Prenez soin de vous et des autres.
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1 pt-3">
        {isLoading ? (
          <div className="space-y-3 px-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-[18px] bg-red-400/10">
              <VentIcon size={28} className="text-red-400/50" />
            </div>
            <p className="mb-1 text-[15px] font-semibold text-foreground">Espace vide</p>
            <p className="text-[13px] text-muted-foreground">Exprimez-vous en toute anonymité.</p>
          </div>
        ) : (
          posts.map(post => (
            <VentCard key={post.id} post={post} currentUserId={user?.id}
              onSupport={handleSupport} onDelete={handleDelete} />
          ))
        )}
        <div className="h-4" />
      </ScrollArea>

      {/* Input */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        <div className={cn(
          'flex items-end gap-1 rounded-2xl border px-3 py-2',
          ui.isGlass
            ? 'border-white/18 bg-white/30 backdrop-blur-3xl dark:border-white/10 dark:bg-white/8'
            : 'border-border/60 bg-background/80',
        )}>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Exprimez-vous librement… (anonyme)"
            className="min-h-9 max-h-40 flex-1 resize-none border-0 bg-transparent py-1.5 text-[13px] text-foreground placeholder:text-muted focus:outline-none"
            rows={1}
          />
          <div className="self-end pb-0.5">
            <EmojiPicker onSelect={e => setDraft(p => p + e)}>
              <Button size="icon-sm" variant="ghost" className="size-8 rounded-xl text-muted-foreground">
                😶
              </Button>
            </EmojiPicker>
          </div>
          <div className="self-end pb-0.5">
            <Button size="icon-sm" onClick={handleSend} disabled={!draft.trim()}
              className={cn('size-8 rounded-xl transition-all',
                draft.trim() ? 'bg-red-400 text-white hover:bg-red-500' : 'bg-red-400/15 text-red-400/50')}>
              <SendIcon size={15} />
            </Button>
          </div>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">Votre identité n&apos;est jamais révélée</p>
      </div>
    </div>
  );
}
