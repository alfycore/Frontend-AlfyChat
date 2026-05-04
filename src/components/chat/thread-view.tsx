'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ThreadIcon, PlusIcon, ArrowLeftIcon, ChevronUpIcon, ChevronDownIcon, MenuIcon,
  SendIcon, SmileIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { EmojiPicker } from '@/components/chat/emoji-picker';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface ThreadReply {
  id: string;
  content: string;
  authorId: string;
  author?: { username: string; displayName?: string; avatarUrl?: string };
  createdAt: string;
  upvotes: string[];
  downvotes: string[];
}

interface Thread {
  id: string;
  title: string;
  body: string;
  authorId: string;
  author?: { username: string; displayName?: string; avatarUrl?: string };
  createdAt: string;
  upvotes: string[];
  downvotes: string[];
  replies: ThreadReply[];
  tags?: string[];
}
interface ThreadViewProps { serverId: string; channelId: string; channelName?: string }

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function parseThread(msg: any): Thread | null {
  try {
    const c = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
    if (c?.__type !== 'thread') return null;
    return {
      id: msg.id,
      title: c.title,
      body: c.body || '',
      authorId: msg.senderId || msg.authorId || msg.sender_id,
      author: msg.sender || msg.author,
      createdAt: msg.createdAt || msg.created_at,
      upvotes: c.upvotes || [],
      downvotes: c.downvotes || [],
      replies: c.replies || [],
      tags: c.tags || [],
    };
  } catch { return null; }
}

/* ── ThreadCard (list) ─────────────────────────────────────────────────────── */

function ThreadCard({ thread, currentUserId, onVote, onClick }: {
  thread: Thread; currentUserId?: string;
  onVote: (id: string, dir: 'up' | 'down') => void;
  onClick: () => void;
}) {
  const ui = useUIStyle();
  const score = thread.upvotes.length - thread.downvotes.length;
  const myUp = currentUserId && thread.upvotes.includes(currentUserId);
  const myDown = currentUserId && thread.downvotes.includes(currentUserId);

  return (
    <div className={cn(
      'mx-4 mb-3 flex gap-0 overflow-hidden rounded-2xl border transition-all',
      ui.isGlass
        ? 'border-white/12 bg-white/7 backdrop-blur-xl hover:bg-white/11'
        : 'border-border/50 bg-card shadow-sm hover:border-primary/30 hover:shadow-md',
    )}>
      {/* score */}
      <div className={cn('flex w-11 shrink-0 flex-col items-center justify-center gap-0.5 border-r py-3',
        ui.isGlass ? 'border-white/10' : 'border-border/40')}>
        <button onClick={e => { e.stopPropagation(); onVote(thread.id, 'up'); }}
          className={cn('flex size-6 items-center justify-center rounded-lg transition-colors',
            myUp ? 'text-violet-400 bg-violet-400/10' : 'text-muted-foreground hover:text-violet-400 hover:bg-violet-400/10')}>
          <ChevronUpIcon size={13} />
        </button>
        <span className={cn('text-[12px] font-bold tabular-nums',
          score > 0 ? 'text-violet-400' : score < 0 ? 'text-red-400' : 'text-muted-foreground')}>
          {score}
        </span>
        <button onClick={e => { e.stopPropagation(); onVote(thread.id, 'down'); }}
          className={cn('flex size-6 items-center justify-center rounded-lg transition-colors',
            myDown ? 'text-red-400 bg-red-400/10' : 'text-muted-foreground hover:text-red-400 hover:bg-red-400/10')}>
          <ChevronDownIcon size={13} />
        </button>
      </div>

      <button onClick={onClick} className="min-w-0 flex-1 px-3 py-3 text-left">
        <p className="text-[13px] font-semibold leading-snug text-foreground">{thread.title}</p>
        {thread.body && <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">{thread.body}</p>}
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground/70">
          <span>{thread.author?.displayName || thread.author?.username || 'Inconnu'}</span>
          <span>·</span>
          <span>{timeAgo(thread.createdAt)}</span>
          <span>·</span>
          <span>{thread.replies.length} réponse{thread.replies.length !== 1 ? 's' : ''}</span>
        </div>
      </button>
    </div>
  );
}

/* ── ThreadDetail ──────────────────────────────────────────────────────────── */

function ThreadDetail({ thread, serverId, channelId, currentUserId, onVoteThread, onBack }: {
  thread: Thread; serverId: string; channelId: string;
  currentUserId?: string;
  onVoteThread: (id: string, dir: 'up' | 'down') => void;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const ui = useUIStyle();
  const [reply, setReply] = useState('');
  const score = thread.upvotes.length - thread.downvotes.length;
  const myUp = currentUserId && thread.upvotes.includes(currentUserId);
  const myDown = currentUserId && thread.downvotes.includes(currentUserId);

  const handleSendReply = useCallback(() => {
    if (!reply.trim() || !user) return;
    const newReply: ThreadReply = {
      id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      content: reply.trim(),
      authorId: user.id,
      author: { username: user.username, displayName: user.displayName || user.username, avatarUrl: user.avatarUrl ?? undefined },
      createdAt: new Date().toISOString(),
      upvotes: [],
      downvotes: [],
    };
    const updatedReplies = [...thread.replies, newReply];
    const updated = JSON.stringify({
      __type: 'thread',
      title: thread.title, body: thread.body,
      upvotes: thread.upvotes, downvotes: thread.downvotes,
      replies: updatedReplies, tags: thread.tags,
    });
    socketService.editServerMessage(serverId, thread.id, updated, channelId);
    setReply('');
  }, [reply, user, thread, serverId, channelId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* back + header */}
      <div className={cn('flex shrink-0 items-center gap-2.5 border-b px-3 py-3',
        ui.isGlass ? 'border-white/10' : 'border-border/50')}>
        <Button size="icon-sm" variant="ghost" className="size-8 rounded-xl text-muted-foreground" onClick={onBack}>
          <ArrowLeftIcon size={15} />
        </Button>
        <span className="flex-1 truncate text-[13px] font-semibold text-foreground">{thread.title}</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {/* OP */}
        <div className="px-4 pt-4">
          <div className={cn('rounded-2xl border p-4 mb-4',
            ui.isGlass ? 'border-white/12 bg-white/7 backdrop-blur-xl' : 'border-border/50 bg-card shadow-sm')}>
            <div className="flex items-center gap-2.5 mb-3">
              <Avatar className="size-8 shrink-0">
                <AvatarImage src={resolveMediaUrl(thread.author?.avatarUrl || '') || undefined} />
                <AvatarFallback className="text-[10px]">{initials(thread.author?.displayName || thread.author?.username || '?')}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[12px] font-semibold text-foreground">{thread.author?.displayName || thread.author?.username || 'Inconnu'}</p>
                <p className="text-[10px] text-muted-foreground/70">{timeAgo(thread.createdAt)}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <button onClick={() => onVoteThread(thread.id, 'up')}
                  className={cn('flex size-7 items-center justify-center rounded-lg transition-colors',
                    myUp ? 'text-violet-400 bg-violet-400/10' : 'text-muted-foreground hover:text-violet-400')}>
                  <ChevronUpIcon size={13} />
                </button>
                <span className={cn('text-[13px] font-bold tabular-nums',
                  score > 0 ? 'text-violet-400' : score < 0 ? 'text-red-400' : 'text-muted-foreground')}>{score}</span>
                <button onClick={() => onVoteThread(thread.id, 'down')}
                  className={cn('flex size-7 items-center justify-center rounded-lg transition-colors',
                    myDown ? 'text-red-400 bg-red-400/10' : 'text-muted-foreground hover:text-red-400')}>
                  <ChevronDownIcon size={13} />
                </button>
              </div>
            </div>
            {thread.body && <p className="text-[13px] leading-relaxed text-foreground/90">{thread.body}</p>}
          </div>

          {/* replies */}
          {thread.replies.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                {thread.replies.length} réponse{thread.replies.length !== 1 ? 's' : ''}
              </p>
              {thread.replies.map(r => (
                <div key={r.id} className={cn('flex gap-3 rounded-xl p-3',
                  ui.isGlass ? 'bg-white/4' : 'bg-foreground/2.5')}>
                  <Avatar className="size-7 shrink-0 mt-0.5">
                    <AvatarImage src={resolveMediaUrl(r.author?.avatarUrl || '') || undefined} />
                    <AvatarFallback className="text-[10px]">{initials(r.author?.displayName || r.author?.username || '?')}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[12px] font-semibold text-foreground">{r.author?.displayName || r.author?.username || 'Inconnu'}</span>
                      <span className="text-[10px] text-muted-foreground/60">{timeAgo(r.createdAt)}</span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-foreground/80">{r.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="h-2" />
      </ScrollArea>

      {/* reply input */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        <div className={cn('flex items-end gap-1 rounded-2xl border px-3 py-2',
          ui.isGlass
            ? 'border-white/18 bg-white/30 backdrop-blur-3xl dark:border-white/10 dark:bg-white/8'
            : 'border-border/60 bg-background/80')}>
          <textarea value={reply} onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
            placeholder="Votre réponse…"
            className="min-h-9 max-h-32 flex-1 resize-none border-0 bg-transparent py-1.5 text-[13px] text-foreground placeholder:text-muted focus:outline-none"
            rows={1} />
          <div className="self-end pb-0.5">
            <Button size="icon-sm" onClick={handleSendReply} disabled={!reply.trim()}
              className={cn('size-8 rounded-xl transition-all',
                reply.trim() ? 'bg-violet-400 text-white hover:bg-violet-500' : 'bg-violet-400/15 text-violet-400/50')}>
              <SendIcon size={15} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────────── */

export function ThreadView({ serverId, channelId, channelName }: ThreadViewProps) {
  const { user } = useAuth();
  const ui = useUIStyle();
  const { isMobile, toggleSidebar } = useMobileNav();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sort, setSort] = useState<'top' | 'new'>('top');

  useEffect(() => {
    setThreads([]);
    setIsLoading(true);
    socketService.requestMessageHistory(serverId, channelId, { limit: 100 }, (res: any) => {
      if (res?.messages) {
        const parsed = (res.messages as any[]).map(parseThread).filter(Boolean) as Thread[];
        setThreads(parsed);
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
      const t = parseThread(msg);
      if (t) setThreads(prev => [t, ...prev]);
    };
    const handleEdited = (data: any) => {
      const p = data?.payload ?? data;
      setThreads(prev => prev.map(t => {
        if (t.id !== p.messageId) return t;
        try {
          const c = JSON.parse(p.content);
          const updated = { ...t, upvotes: c.upvotes ?? t.upvotes, downvotes: c.downvotes ?? t.downvotes, replies: c.replies ?? t.replies };
          if (activeThread?.id === t.id) setActiveThread(updated);
          return updated;
        } catch { return t; }
      }));
    };
    const handleDeleted = (data: any) => {
      const id = (data?.payload ?? data)?.messageId;
      if (id) { setThreads(prev => prev.filter(t => t.id !== id)); if (activeThread?.id === id) setActiveThread(null); }
    };
    socketService.onServerMessageNew(handleNew);
    socketService.onServerMessageEdited(handleEdited);
    socketService.onServerMessageDeleted(handleDeleted);
    return () => {
      socketService.off('SERVER_MESSAGE_NEW', handleNew);
      socketService.off('SERVER_MESSAGE_EDITED', handleEdited);
      socketService.off('SERVER_MESSAGE_DELETED', handleDeleted);
    };
  }, [channelId, activeThread]);

  const handleVote = useCallback((id: string, dir: 'up' | 'down') => {
    if (!user) return;
    const t = threads.find(th => th.id === id);
    if (!t) return;
    let up = [...t.upvotes], down = [...t.downvotes];
    if (dir === 'up') {
      if (up.includes(user.id)) up = up.filter(u => u !== user.id);
      else { up = [...up, user.id]; down = down.filter(u => u !== user.id); }
    } else {
      if (down.includes(user.id)) down = down.filter(u => u !== user.id);
      else { down = [...down, user.id]; up = up.filter(u => u !== user.id); }
    }
    const updated = JSON.stringify({ __type: 'thread', title: t.title, body: t.body, upvotes: up, downvotes: down, replies: t.replies, tags: t.tags });
    socketService.editServerMessage(serverId, id, updated, channelId);
    setThreads(prev => prev.map(th => th.id === id ? { ...th, upvotes: up, downvotes: down } : th));
  }, [threads, user, serverId, channelId]);

  const handleCreate = useCallback(() => {
    if (!title.trim()) return;
    const content = JSON.stringify({ __type: 'thread', title: title.trim(), body: body.trim(), upvotes: [], downvotes: [], replies: [], tags: [] });
    socketService.sendServerMessage({ serverId, channelId, content });
    setTitle('');
    setBody('');
    setShowCreate(false);
  }, [title, body, serverId, channelId]);

  const sorted = [...threads].sort((a, b) =>
    sort === 'top'
      ? (b.upvotes.length - b.downvotes.length) - (a.upvotes.length - a.downvotes.length)
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className={`flex h-full min-h-0 flex-col ${ui.contentBg}`}>
      {/* Header */}
      <div className={`flex h-14 shrink-0 items-center gap-2.5 px-3 ${ui.header}`}>
        {isMobile && (
          <Button size="icon-sm" variant="ghost" className="size-8 shrink-0 rounded-xl text-muted-foreground" onClick={toggleSidebar}>
            <MenuIcon size={16} />
          </Button>
        )}
        {activeThread ? (
          <Button size="icon-sm" variant="ghost" className="size-8 shrink-0 rounded-xl text-muted-foreground" onClick={() => setActiveThread(null)}>
            <ArrowLeftIcon size={15} />
          </Button>
        ) : null}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-violet-400/15">
          <ThreadIcon size={13} className="text-violet-400" />
        </div>
        <h2 className="flex-1 truncate text-[14px] font-semibold text-foreground">
          {activeThread ? activeThread.title : (channelName || 'Fils')}
        </h2>
        {!activeThread && (
          <div className="flex items-center gap-2">
            <div className={cn('flex rounded-xl p-0.5 text-[11px] font-medium', ui.isGlass ? 'bg-white/8' : 'bg-muted/60')}>
              {(['top', 'new'] as const).map(s => (
                <button key={s} onClick={() => setSort(s)}
                  className={cn('rounded-[9px] px-2.5 py-1 transition-colors',
                    sort === s ? 'bg-background/80 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  {s === 'top' ? 'Top' : 'Récent'}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => setShowCreate(v => !v)}
              className="h-7 gap-1.5 rounded-xl border-0 bg-violet-400/15 text-[12px] font-medium text-violet-400 shadow-none hover:bg-violet-400/25">
              <PlusIcon size={13} /> Nouveau
            </Button>
          </div>
        )}
      </div>

      {activeThread ? (
        <ThreadDetail thread={activeThread} serverId={serverId} channelId={channelId}
          currentUserId={user?.id} onVoteThread={handleVote} onBack={() => setActiveThread(null)} />
      ) : (
        <>
          {showCreate && (
            <div className={cn('mx-4 mt-3 rounded-2xl border p-4',
              ui.isGlass ? 'border-white/14 bg-white/8 backdrop-blur-xl' : 'border-border/50 bg-card shadow-sm')}>
              <p className="mb-3 text-[13px] font-semibold text-foreground">Nouveau fil</p>
              <Input placeholder="Titre du fil…" value={title} onChange={e => setTitle(e.target.value)} className="mb-2 rounded-xl text-[13px]" />
              <Textarea placeholder="Description (optionnel)…" value={body} onChange={e => setBody(e.target.value)} className="mb-3 max-h-24 min-h-14 resize-none rounded-xl text-[13px]" />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-[12px]" onClick={() => setShowCreate(false)}>Annuler</Button>
                <Button size="sm" className="flex-1 rounded-xl text-[12px]" onClick={handleCreate} disabled={!title.trim()}>Créer</Button>
              </div>
            </div>
          )}

          <ScrollArea className="min-h-0 flex-1 pt-3">
            {isLoading ? (
              <div className="space-y-3 px-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="mb-4 flex size-16 items-center justify-center rounded-[18px] bg-violet-400/10">
                  <ThreadIcon size={28} className="text-violet-400/50" />
                </div>
                <p className="mb-1 text-[15px] font-semibold text-foreground">Aucun fil</p>
                <p className="text-[13px] text-muted-foreground">Lancez la première discussion&nbsp;!</p>
              </div>
            ) : (
              sorted.map(t => (
                <ThreadCard key={t.id} thread={t} currentUserId={user?.id}
                  onVote={handleVote} onClick={() => setActiveThread(t)} />
              ))
            )}
            <div className="h-4" />
          </ScrollArea>
        </>
      )}
    </div>
  );
}
