'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CountingIcon, MenuIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface CountEntry {
  id: string;
  number: number;
  authorId: string;
  author?: { username: string; displayName?: string; avatarUrl?: string };
  createdAt: string;
  isFail?: boolean;
  failReason?: string;
}
interface CountingViewProps { serverId: string; channelId: string; channelName?: string }

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function parseCountEntry(msg: any): CountEntry | null {
  try {
    const c = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
    if (c?.__type !== 'count') return null;
    return {
      id: msg.id,
      number: c.number,
      authorId: msg.senderId || msg.authorId || msg.sender_id,
      author: msg.sender || msg.author,
      createdAt: msg.createdAt || msg.created_at,
      isFail: c.isFail ?? false,
      failReason: c.failReason,
    };
  } catch { return null; }
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/* ── Main ──────────────────────────────────────────────────────────────────── */

export function CountingView({ serverId, channelId, channelName }: CountingViewProps) {
  const { user } = useAuth();
  const ui = useUIStyle();
  const { isMobile, toggleSidebar } = useMobileNav();

  const [entries, setEntries] = useState<CountEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentCount = entries.length > 0
    ? entries.filter(e => !e.isFail).reduce((max, e) => Math.max(max, e.number), 0)
    : 0;
  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const lastAuthorId = lastEntry?.authorId;
  const nextExpected = currentCount + 1;

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  useEffect(() => {
    setEntries([]);
    setIsLoading(true);
    socketService.requestMessageHistory(serverId, channelId, { limit: 200 }, (res: any) => {
      if (res?.messages) {
        const parsed = (res.messages as any[]).map(parseCountEntry).filter(Boolean) as CountEntry[];
        setEntries(parsed);
      }
      setIsLoading(false);
      setTimeout(scrollToBottom, 80);
    });
    socketService.joinChannel(channelId);
    return () => { socketService.leaveChannel(channelId); };
  }, [serverId, channelId]);

  useEffect(() => {
    const handleNew = (data: any) => {
      const msg = data?.payload ?? data;
      if (msg.channelId !== channelId && msg.channel_id !== channelId) return;
      const e = parseCountEntry(msg);
      if (e) {
        setEntries(prev => [...prev, e]);
        setTimeout(scrollToBottom, 40);
      }
    };
    socketService.onServerMessageNew(handleNew);
    return () => { socketService.off('SERVER_MESSAGE_NEW', handleNew); };
  }, [channelId, scrollToBottom]);

  const handleSend = useCallback(() => {
    const num = parseInt(input.trim(), 10);
    setError('');

    if (isNaN(num)) { setError('Entrez un nombre entier.'); return; }
    if (lastAuthorId === user?.id) { setError("Ce n'est pas votre tour !"); return; }
    if (num !== nextExpected) {
      // Send fail entry then reset
      const failContent = JSON.stringify({ __type: 'count', number: num, isFail: true, failReason: `Attendu ${nextExpected}, reçu ${num}` });
      socketService.sendServerMessage({ serverId, channelId, content: failContent });
      setInput('');
      return;
    }

    const content = JSON.stringify({ __type: 'count', number: num, isFail: false });
    socketService.sendServerMessage({ serverId, channelId, content });
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [input, nextExpected, lastAuthorId, user, serverId, channelId]);

  const validEntries = entries.filter(e => !e.isFail);
  const bestStreak = validEntries.length;

  return (
    <div className={`flex h-full min-h-0 flex-col ${ui.isGlass ? 'bg-white/20 backdrop-blur-2xl dark:bg-black/25' : ''}`}>
      {/* Header */}
      <div className={`flex h-14 shrink-0 items-center gap-2.5 px-3 ${ui.header}`}>
        {isMobile && (
          <Button size="icon-sm" variant="ghost" className="size-8 shrink-0 rounded-xl text-muted-foreground" onClick={toggleSidebar}>
            <MenuIcon size={16} />
          </Button>
        )}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-rose-400/15">
          <CountingIcon size={13} className="text-rose-400" />
        </div>
        <h2 className="flex-1 truncate text-[14px] font-semibold text-foreground">{channelName || 'Comptage'}</h2>
        <div className="flex items-center gap-1 rounded-xl bg-rose-400/10 px-3 py-1">
          <span className="text-[11px] text-rose-400/70">Record</span>
          <span className="text-[13px] font-bold tabular-nums text-rose-400">{bestStreak}</span>
        </div>
      </div>

      {/* Big count display */}
      <div className={cn(
        'mx-4 mt-3 flex items-center justify-between rounded-2xl border px-5 py-4',
        ui.isGlass
          ? 'border-white/14 bg-white/7 backdrop-blur-xl'
          : 'border-border/50 bg-card shadow-sm',
      )}>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Prochain nombre</p>
          <p className="mt-0.5 text-[48px] font-black leading-none tabular-nums text-foreground">{nextExpected}</p>
          {lastEntry && !lastEntry.isFail && (
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              Dernier : {lastEntry.author?.displayName || lastEntry.author?.username || 'Inconnu'}
            </p>
          )}
        </div>
        <div className="flex size-20 items-center justify-center rounded-[20px] bg-rose-400/10">
          <CountingIcon size={36} className="text-rose-400/60" />
        </div>
      </div>

      {/* History */}
      <ScrollArea className="min-h-0 flex-1 mt-3" ref={scrollRef as any}>
        {isLoading ? (
          <div className="space-y-2 px-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-[13px] text-muted-foreground">Commencez par envoyer le nombre <span className="font-bold text-foreground">1</span>&nbsp;!</p>
          </div>
        ) : (
          <div className="space-y-1 px-4 pb-2">
            {entries.map(entry => (
              <div key={entry.id} className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 transition-colors',
                entry.isFail
                  ? 'bg-red-400/10 border border-red-400/20'
                  : 'hover:bg-foreground/3',
              )}>
                <Avatar className="size-7 shrink-0">
                  <AvatarImage src={resolveMediaUrl(entry.author?.avatarUrl || '') || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {initials(entry.author?.displayName || entry.author?.username || '?')}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-[12px] text-muted-foreground truncate">
                  {entry.author?.displayName || entry.author?.username || 'Inconnu'}
                </span>
                {entry.isFail ? (
                  <div className="text-right">
                    <span className="text-[13px] font-semibold tabular-nums text-red-400 line-through">{entry.number}</span>
                    <p className="text-[10px] text-red-400/70">{entry.failReason}</p>
                  </div>
                ) : (
                  <span className="text-[16px] font-bold tabular-nums text-foreground">{entry.number}</span>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="h-2" />
      </ScrollArea>

      {/* Input */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        {error && <p className="mb-2 text-center text-[11px] text-destructive">{error}</p>}
        {lastAuthorId === user?.id && (
          <p className="mb-2 text-center text-[11px] text-amber-400/80">Ce n&apos;est pas votre tour — attendez qu&apos;un autre joueur compte&nbsp;!</p>
        )}
        <div className={cn(
          'flex items-center gap-2 rounded-2xl border px-3 py-2',
          ui.isGlass
            ? 'border-white/18 bg-white/30 backdrop-blur-3xl dark:border-white/10 dark:bg-white/8'
            : 'border-border/60 bg-background/80',
        )}>
          <Input
            ref={inputRef}
            type="number"
            value={input}
            onChange={e => { setInput(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={`Entrez ${nextExpected}…`}
            className="flex-1 border-0 bg-transparent text-[15px] font-bold shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <Button size="sm" onClick={handleSend} disabled={!input.trim() || lastAuthorId === user?.id}
            className={cn('h-8 rounded-xl text-[13px]',
              input.trim() && lastAuthorId !== user?.id
                ? 'bg-rose-400 text-white hover:bg-rose-500'
                : 'bg-rose-400/15 text-rose-400/50')}>
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
}
