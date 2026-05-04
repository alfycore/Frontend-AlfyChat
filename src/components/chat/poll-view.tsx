'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PollIcon, PlusIcon, XIcon, CheckIcon, MenuIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface PollOption { id: string; text: string }
interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  votes: Record<string, string>;   // userId → optionId
  authorId: string;
  author?: { username: string; displayName?: string; avatarUrl?: string };
  createdAt: string;
  isClosed?: boolean;
}
interface PollViewProps { serverId: string; channelId: string; channelName?: string }

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function parsePoll(msg: any): Poll | null {
  try {
    const c = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
    if (c?.__type !== 'poll') return null;
    return {
      id: msg.id,
      question: c.question,
      options: c.options,
      votes: c.votes || {},
      authorId: msg.senderId || msg.authorId || msg.sender_id,
      author: msg.sender || msg.author,
      createdAt: msg.createdAt || msg.created_at,
      isClosed: c.isClosed ?? false,
    };
  } catch { return null; }
}

/* ── PollCard ──────────────────────────────────────────────────────────────── */

function PollCard({
  poll, currentUserId, onVote, onClose, isOwner,
}: { poll: Poll; currentUserId?: string; onVote: (id: string, opt: string) => void; onClose: (id: string) => void; isOwner: boolean }) {
  const ui = useUIStyle();
  const myVote = currentUserId ? poll.votes[currentUserId] : null;
  const total = Object.keys(poll.votes).length;
  const hasVoted = !!myVote;

  return (
    <div className={cn(
      'mx-4 mb-3 overflow-hidden rounded-2xl border',
      ui.isGlass
        ? 'border-white/14 bg-white/7 backdrop-blur-xl shadow-[inset_0_0.5px_0_rgba(255,255,255,0.18)]'
        : 'border-border/50 bg-card shadow-sm',
    )}>
      {/* question */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold leading-snug text-foreground">{poll.question}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {poll.author?.displayName || poll.author?.username || 'Inconnu'} · {timeAgo(poll.createdAt)}
            {' · '}{total} vote{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {poll.isClosed && <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px]">Terminé</Badge>}
          {isOwner && !poll.isClosed && (
            <Button size="icon-sm" variant="ghost"
              className="size-6 rounded-lg text-muted-foreground hover:text-destructive"
              onClick={() => onClose(poll.id)}>
              <XIcon size={12} />
            </Button>
          )}
        </div>
      </div>

      {/* options */}
      <div className="space-y-2 px-4 pb-4">
        {poll.options.map((opt) => {
          const count = Object.values(poll.votes).filter(v => v === opt.id).length;
          const pct = total > 0 ? (count / total) * 100 : 0;
          const isMyVote = myVote === opt.id;
          const showPct = hasVoted || poll.isClosed;

          return (
            <button key={opt.id}
              onClick={() => !poll.isClosed && onVote(poll.id, opt.id)}
              disabled={poll.isClosed}
              className={cn(
                'relative w-full overflow-hidden rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-200',
                poll.isClosed ? 'cursor-default' : 'cursor-pointer',
                isMyVote
                  ? 'border border-orange-400/50 text-orange-400'
                  : cn('border',
                    ui.isGlass
                      ? 'border-white/10 bg-white/5 hover:bg-white/12 text-foreground/80'
                      : 'border-border/50 bg-background/60 hover:bg-foreground/5 text-foreground/80',
                  ),
              )}
            >
              {/* progress fill */}
              {showPct && (
                <div
                  className={cn('absolute inset-0 rounded-xl transition-all duration-700',
                    isMyVote ? 'bg-orange-400/20' : 'bg-foreground/4')}
                  style={{ width: `${pct}%` }}
                />
              )}
              {isMyVote && (
                <div className="absolute inset-0 rounded-xl border border-orange-400/30" />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  {isMyVote && <CheckIcon size={11} className="shrink-0 text-orange-400" />}
                  {opt.text}
                </span>
                {showPct && (
                  <span className="text-[11px] tabular-nums opacity-60">{Math.round(pct)}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────────── */

export function PollView({ serverId, channelId, channelName }: PollViewProps) {
  const { user } = useAuth();
  const ui = useUIStyle();
  const { isMobile, toggleSidebar } = useMobileNav();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  /* load */
  useEffect(() => {
    setPolls([]);
    setIsLoading(true);
    socketService.requestMessageHistory(serverId, channelId, { limit: 100 }, (res: any) => {
      if (res?.messages) {
        const parsed = (res.messages as any[]).map(parsePoll).filter(Boolean) as Poll[];
        setPolls(parsed.reverse());
      }
      setIsLoading(false);
    });
    socketService.joinChannel(channelId);
    return () => { socketService.leaveChannel(channelId); };
  }, [serverId, channelId]);

  /* realtime */
  useEffect(() => {
    const handleNew = (data: any) => {
      const msg = data?.payload ?? data;
      if (msg.channelId !== channelId && msg.channel_id !== channelId) return;
      const poll = parsePoll(msg);
      if (poll) setPolls(prev => [poll, ...prev]);
    };
    const handleEdited = (data: any) => {
      const p = data?.payload ?? data;
      const { messageId, content } = p;
      setPolls(prev => prev.map(poll => {
        if (poll.id !== messageId) return poll;
        try {
          const c = JSON.parse(content);
          return { ...poll, votes: c.votes ?? poll.votes, isClosed: c.isClosed ?? poll.isClosed };
        } catch { return poll; }
      }));
    };
    const handleDeleted = (data: any) => {
      const id = (data?.payload ?? data)?.messageId;
      if (id) setPolls(prev => prev.filter(p => p.id !== id));
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

  const handleVote = useCallback((pollId: string, optionId: string) => {
    if (!user) return;
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;
    const newVotes = { ...poll.votes };
    if (newVotes[user.id] === optionId) delete newVotes[user.id];
    else newVotes[user.id] = optionId;
    const updated = JSON.stringify({ __type: 'poll', question: poll.question, options: poll.options, votes: newVotes, isClosed: poll.isClosed });
    socketService.editServerMessage(serverId, pollId, updated, channelId);
    // optimistic
    setPolls(prev => prev.map(p => p.id === pollId ? { ...p, votes: newVotes } : p));
  }, [polls, user, serverId, channelId]);

  const handleClose = useCallback((pollId: string) => {
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;
    const updated = JSON.stringify({ __type: 'poll', question: poll.question, options: poll.options, votes: poll.votes, isClosed: true });
    socketService.editServerMessage(serverId, pollId, updated, channelId);
    setPolls(prev => prev.map(p => p.id === pollId ? { ...p, isClosed: true } : p));
  }, [polls, serverId, channelId]);

  const handleCreate = useCallback(() => {
    const validOpts = options.filter(o => o.trim());
    if (!question.trim() || validOpts.length < 2) return;
    const content = JSON.stringify({
      __type: 'poll',
      question: question.trim(),
      options: validOpts.map((text, i) => ({ id: `opt_${i}_${Date.now()}`, text: text.trim() })),
      votes: {},
      isClosed: false,
    });
    socketService.sendServerMessage({ serverId, channelId, content });
    setQuestion('');
    setOptions(['', '']);
    setShowCreate(false);
  }, [question, options, serverId, channelId]);

  return (
    <div className={`flex h-full min-h-0 flex-col ${ui.contentBg}`}>
      {/* Header */}
      <div className={`flex h-14 shrink-0 items-center gap-2.5 px-3 ${ui.header}`}>
        {isMobile && (
          <Button size="icon-sm" variant="ghost" className="size-8 shrink-0 rounded-xl text-muted-foreground" onClick={toggleSidebar}>
            <MenuIcon size={16} />
          </Button>
        )}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-orange-400/15">
          <PollIcon size={13} className="text-orange-400" />
        </div>
        <h2 className="truncate text-[14px] font-semibold text-foreground">{channelName || 'Sondages'}</h2>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setShowCreate(v => !v)}
            className="h-7 gap-1.5 rounded-xl border-0 bg-orange-400/15 text-[12px] font-medium text-orange-400 shadow-none hover:bg-orange-400/25">
            <PlusIcon size={13} /> Nouveau
          </Button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className={cn(
          'mx-4 mt-3 rounded-2xl border p-4',
          ui.isGlass
            ? 'border-white/14 bg-white/8 backdrop-blur-xl'
            : 'border-border/50 bg-card shadow-sm',
        )}>
          <p className="mb-3 text-[13px] font-semibold text-foreground">Nouveau sondage</p>
          <Input
            placeholder="Votre question…"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            className="mb-2 rounded-xl text-[13px]"
          />
          {options.map((opt, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <Input
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={e => setOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                className="rounded-xl text-[13px]"
              />
              {options.length > 2 && (
                <Button size="icon-sm" variant="ghost" className="size-9 shrink-0 rounded-xl text-muted-foreground"
                  onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))}>
                  <XIcon size={13} />
                </Button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <Button variant="ghost" size="sm" className="mb-3 w-full rounded-xl text-[12px] text-muted-foreground"
              onClick={() => setOptions(prev => [...prev, ''])}>
              <PlusIcon size={12} className="mr-1.5" /> Ajouter une option
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-[12px]" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button size="sm" className="flex-1 rounded-xl text-[12px]" onClick={handleCreate}
              disabled={!question.trim() || options.filter(o => o.trim()).length < 2}>
              Créer le sondage
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1 pt-3">
        {isLoading ? (
          <div className="space-y-3 px-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        ) : polls.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-[18px] bg-orange-400/10">
              <PollIcon size={28} className="text-orange-400/50" />
            </div>
            <p className="mb-1 text-[15px] font-semibold text-foreground">Aucun sondage</p>
            <p className="text-[13px] text-muted-foreground">Soyez le premier à créer un sondage&nbsp;!</p>
          </div>
        ) : (
          polls.map(poll => (
            <PollCard key={poll.id} poll={poll} currentUserId={user?.id}
              onVote={handleVote} onClose={handleClose}
              isOwner={poll.authorId === user?.id} />
          ))
        )}
        <div className="h-4" />
      </ScrollArea>
    </div>
  );
}
