'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  SuggestionIcon, PlusIcon, XIcon, ChevronUpIcon, ChevronDownIcon, MenuIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────────────────────────── */

type SuggestionStatus = 'pending' | 'approved' | 'implemented' | 'rejected';

interface Suggestion {
  id: string;
  title: string;
  body: string;
  upvotes: string[];   // userIds
  downvotes: string[]; // userIds
  status: SuggestionStatus;
  authorId: string;
  author?: { username: string; displayName?: string; avatarUrl?: string };
  createdAt: string;
}
interface SuggestionViewProps { serverId: string; channelId: string; channelName?: string }

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function parseSuggestion(msg: any): Suggestion | null {
  try {
    const c = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
    if (c?.__type !== 'suggestion') return null;
    return {
      id: msg.id,
      title: c.title,
      body: c.body || '',
      upvotes: c.upvotes || [],
      downvotes: c.downvotes || [],
      status: c.status || 'pending',
      authorId: msg.senderId || msg.authorId || msg.sender_id,
      author: msg.sender || msg.author,
      createdAt: msg.createdAt || msg.created_at,
    };
  } catch { return null; }
}

const STATUS_META: Record<SuggestionStatus, { label: string; cls: string }> = {
  pending:     { label: 'En attente',   cls: 'bg-muted/60 text-muted-foreground' },
  approved:    { label: 'Approuvée',    cls: 'bg-emerald-400/15 text-emerald-400' },
  implemented: { label: 'Réalisée',     cls: 'bg-blue-400/15 text-blue-400' },
  rejected:    { label: 'Rejetée',      cls: 'bg-red-400/15 text-red-400' },
};

/* ── SuggestionCard ─────────────────────────────────────────────────────────── */

function SuggestionCard({
  s, currentUserId, onVote, onChangeStatus, isOwnerOrAdmin,
}: {
  s: Suggestion; currentUserId?: string;
  onVote: (id: string, dir: 'up' | 'down') => void;
  onChangeStatus: (id: string, status: SuggestionStatus) => void;
  isOwnerOrAdmin: boolean;
}) {
  const ui = useUIStyle();
  const score = s.upvotes.length - s.downvotes.length;
  const myUp = currentUserId && s.upvotes.includes(currentUserId);
  const myDown = currentUserId && s.downvotes.includes(currentUserId);
  const sm = STATUS_META[s.status];

  return (
    <div className={cn(
      'mx-4 mb-3 flex gap-0 overflow-hidden rounded-2xl border',
      ui.isGlass
        ? 'border-white/14 bg-white/7 backdrop-blur-xl shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]'
        : 'border-border/50 bg-card shadow-sm',
    )}>
      {/* vote column */}
      <div className={cn(
        'flex w-12 shrink-0 flex-col items-center justify-center gap-0.5 border-r py-3',
        ui.isGlass ? 'border-white/10' : 'border-border/40',
      )}>
        <button onClick={() => onVote(s.id, 'up')}
          className={cn('flex size-7 items-center justify-center rounded-lg transition-colors',
            myUp ? 'text-emerald-400 bg-emerald-400/10' : 'text-muted-foreground hover:text-emerald-400 hover:bg-emerald-400/10')}>
          <ChevronUpIcon size={14} />
        </button>
        <span className={cn('text-[13px] font-bold tabular-nums',
          score > 0 ? 'text-emerald-400' : score < 0 ? 'text-red-400' : 'text-muted-foreground')}>
          {score}
        </span>
        <button onClick={() => onVote(s.id, 'down')}
          className={cn('flex size-7 items-center justify-center rounded-lg transition-colors',
            myDown ? 'text-red-400 bg-red-400/10' : 'text-muted-foreground hover:text-red-400 hover:bg-red-400/10')}>
          <ChevronDownIcon size={14} />
        </button>
      </div>

      {/* content */}
      <div className="min-w-0 flex-1 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold leading-snug text-foreground">{s.title}</p>
          <Badge className={cn('ml-auto shrink-0 rounded-full px-2 py-0 text-[10px] font-medium', sm.cls)}>{sm.label}</Badge>
        </div>
        {s.body && <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground line-clamp-3">{s.body}</p>}
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground/70">
            {s.author?.displayName || s.author?.username || 'Inconnu'} · {timeAgo(s.createdAt)}
          </p>
          {isOwnerOrAdmin && s.status !== 'implemented' && (
            <div className="flex gap-1">
              {(['approved', 'implemented', 'rejected'] as SuggestionStatus[])
                .filter(st => st !== s.status)
                .map(st => (
                  <button key={st} onClick={() => onChangeStatus(s.id, st)}
                    className={cn('rounded-lg px-2 py-0.5 text-[10px] font-medium transition-colors',
                      STATUS_META[st].cls, 'opacity-70 hover:opacity-100')}>
                    {STATUS_META[st].label}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────────── */

export function SuggestionView({ serverId, channelId, channelName }: SuggestionViewProps) {
  const { user } = useAuth();
  const ui = useUIStyle();
  const { isMobile, toggleSidebar } = useMobileNav();

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sort, setSort] = useState<'top' | 'new'>('top');

  useEffect(() => {
    setSuggestions([]);
    setIsLoading(true);
    socketService.requestMessageHistory(serverId, channelId, { limit: 100 }, (res: any) => {
      if (res?.messages) {
        const parsed = (res.messages as any[]).map(parseSuggestion).filter(Boolean) as Suggestion[];
        setSuggestions(parsed);
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
      const s = parseSuggestion(msg);
      if (s) setSuggestions(prev => [s, ...prev]);
    };
    const handleEdited = (data: any) => {
      const p = data?.payload ?? data;
      setSuggestions(prev => prev.map(s => {
        if (s.id !== p.messageId) return s;
        try {
          const c = JSON.parse(p.content);
          return { ...s, upvotes: c.upvotes ?? s.upvotes, downvotes: c.downvotes ?? s.downvotes, status: c.status ?? s.status };
        } catch { return s; }
      }));
    };
    const handleDeleted = (data: any) => {
      const id = (data?.payload ?? data)?.messageId;
      if (id) setSuggestions(prev => prev.filter(s => s.id !== id));
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

  const handleVote = useCallback((id: string, dir: 'up' | 'down') => {
    if (!user) return;
    const s = suggestions.find(sg => sg.id === id);
    if (!s) return;
    let up = [...s.upvotes];
    let down = [...s.downvotes];
    if (dir === 'up') {
      if (up.includes(user.id)) { up = up.filter(u => u !== user.id); }
      else { up = [...up, user.id]; down = down.filter(u => u !== user.id); }
    } else {
      if (down.includes(user.id)) { down = down.filter(u => u !== user.id); }
      else { down = [...down, user.id]; up = up.filter(u => u !== user.id); }
    }
    const updated = JSON.stringify({ __type: 'suggestion', title: s.title, body: s.body, upvotes: up, downvotes: down, status: s.status });
    socketService.editServerMessage(serverId, id, updated, channelId);
    setSuggestions(prev => prev.map(sg => sg.id === id ? { ...sg, upvotes: up, downvotes: down } : sg));
  }, [suggestions, user, serverId, channelId]);

  const handleChangeStatus = useCallback((id: string, status: SuggestionStatus) => {
    const s = suggestions.find(sg => sg.id === id);
    if (!s) return;
    const updated = JSON.stringify({ __type: 'suggestion', title: s.title, body: s.body, upvotes: s.upvotes, downvotes: s.downvotes, status });
    socketService.editServerMessage(serverId, id, updated, channelId);
    setSuggestions(prev => prev.map(sg => sg.id === id ? { ...sg, status } : sg));
  }, [suggestions, serverId, channelId]);

  const handleCreate = useCallback(() => {
    if (!title.trim()) return;
    const content = JSON.stringify({ __type: 'suggestion', title: title.trim(), body: body.trim(), upvotes: [], downvotes: [], status: 'pending' });
    socketService.sendServerMessage({ serverId, channelId, content });
    setTitle('');
    setBody('');
    setShowCreate(false);
  }, [title, body, serverId, channelId]);

  const sorted = [...suggestions].sort((a, b) =>
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
        <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-emerald-400/15">
          <SuggestionIcon size={13} className="text-emerald-400" />
        </div>
        <h2 className="truncate text-[14px] font-semibold text-foreground">{channelName || 'Suggestions'}</h2>
        <div className="ml-auto flex items-center gap-2">
          {/* sort toggle */}
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
            className="h-7 gap-1.5 rounded-xl border-0 bg-emerald-400/15 text-[12px] font-medium text-emerald-400 shadow-none hover:bg-emerald-400/25">
            <PlusIcon size={13} /> Suggérer
          </Button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className={cn(
          'mx-4 mt-3 rounded-2xl border p-4',
          ui.isGlass ? 'border-white/14 bg-white/8 backdrop-blur-xl' : 'border-border/50 bg-card shadow-sm',
        )}>
          <p className="mb-3 text-[13px] font-semibold text-foreground">Nouvelle suggestion</p>
          <Input placeholder="Titre de votre suggestion…" value={title} onChange={e => setTitle(e.target.value)} className="mb-2 rounded-xl text-[13px]" />
          <Textarea placeholder="Décrivez votre idée (optionnel)…" value={body} onChange={e => setBody(e.target.value)} className="mb-3 max-h-28 min-h-16 resize-none rounded-xl text-[13px]" />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-[12px]" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button size="sm" className="flex-1 rounded-xl text-[12px]" onClick={handleCreate} disabled={!title.trim()}>Envoyer</Button>
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
            <div className="mb-4 flex size-16 items-center justify-center rounded-[18px] bg-emerald-400/10">
              <SuggestionIcon size={28} className="text-emerald-400/50" />
            </div>
            <p className="mb-1 text-[15px] font-semibold text-foreground">Aucune suggestion</p>
            <p className="text-[13px] text-muted-foreground">Partagez votre première idée&nbsp;!</p>
          </div>
        ) : (
          sorted.map(s => (
            <SuggestionCard key={s.id} s={s} currentUserId={user?.id}
              onVote={handleVote} onChangeStatus={handleChangeStatus}
              isOwnerOrAdmin={s.authorId === user?.id} />
          ))
        )}
        <div className="h-4" />
      </ScrollArea>
    </div>
  );
}
