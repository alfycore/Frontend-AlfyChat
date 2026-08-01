'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon, ArrowRightIcon, InboxIcon, CheckCircle2Icon, XCircleIcon,
  ClockIcon, ZapIcon, PlusIcon, SearchIcon,
} from '@/components/icons';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';

interface Ticket {
  id: string;
  ticketNumber: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

type FilterKey = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';

const FILTERS: FilterKey[] = ['all', 'open', 'in_progress', 'resolved', 'closed'];

const STATUS_CFG: Record<string, { color: string; dot: string; Icon: React.ElementType }> = {
  open:        { color: '#3b82f6', dot: 'bg-blue-500',   Icon: InboxIcon },
  pending:     { color: '#f59e0b', dot: 'bg-amber-500',  Icon: ClockIcon },
  in_progress: { color: '#8b5cf6', dot: 'bg-violet-500', Icon: ZapIcon },
  resolved:    { color: '#22c55e', dot: 'bg-green-500',  Icon: CheckCircle2Icon },
  closed:      { color: '#6b7280', dot: 'bg-zinc-500',   Icon: XCircleIcon },
};

const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  low:    { label: 'Faible',  color: '#22c55e' },
  medium: { label: 'Moyen',   color: '#3b82f6' },
  high:   { label: 'Élevé',   color: '#f59e0b' },
};

const CAT_LABELS: Record<string, string> = {
  general: 'Général', account: 'Compte', security: 'Sécurité',
  bug: 'Bug', abuse: 'Signalement', server: 'Serveur', billing: 'Facturation', other: 'Autre',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)   return "à l'instant";
  if (mins < 60)  return `il y a ${mins}m`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days < 7)   return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function MesTicketsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const s = t.static.support;
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login?redirect=/support/mes-tickets'); return; }
    const load = async () => {
      setLoading(true);
      try {
        const r = await api.get('/api/helpdesk/public/tickets');
        if (r.success) setTickets((r.data as any).data ?? r.data ?? []);
        else setError((r as any).error || s.errorGeneric);
      } catch {
        setError(s.errorServer);
      }
      setLoading(false);
    };
    load();
  }, [user, authLoading, router, s]);

  const filtered = useMemo(() => {
    let list = filter === 'all' ? tickets : tickets.filter(tk => tk.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(tk =>
        tk.subject.toLowerCase().includes(q) ||
        tk.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tickets, filter, query]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: tickets.length, open: 0, in_progress: 0, resolved: 0, closed: 0 };
    tickets.forEach(tk => { if (tk.status in c) (c as any)[tk.status]++; });
    return c;
  }, [tickets]);

  const openCount = tickets.filter(tk => tk.status === 'open' || tk.status === 'in_progress').length;

  if (authLoading || (!user && !error)) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <div className="border-b border-border/50 bg-card/40">
        <div className="mx-auto max-w-4xl px-6 pt-10 pb-8">
          <Link href="/support"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-7 group">
            <ArrowLeftIcon size={12} className="group-hover:-translate-x-0.5 transition-transform" />
            {s.backToSupport}
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">{s.myTicketsHeading}</h1>
              <p className="text-xs text-muted-foreground mt-1">
                {tickets.length === 0
                  ? s.noTicketsYet
                  : openCount > 0
                    ? `${openCount} ticket${openCount > 1 ? 's' : ''} ouvert${openCount > 1 ? 's' : ''}`
                    : 'Tous vos tickets sont résolus'
                }
              </p>
            </div>
            <Link href="/support/contact"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shrink-0">
              <PlusIcon size={13} />
              {s.newTicket}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">

        {/* Filters + Search */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map(key => {
              const count = counts[key];
              if (count === 0 && key !== 'all') return null;
              const active = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {s.ticketFilters?.[key] ?? key}
                  <span className={`text-[10px] tabular-nums rounded-full px-1 min-w-4 text-center ${
                    active ? 'bg-primary-foreground/20' : 'bg-muted-foreground/10'
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>
          {tickets.length > 3 && (
            <div className="relative ml-auto">
              <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={s.searchTickets ?? 'Rechercher…'}
                className="pl-8 h-8 text-xs w-48"
              />
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
                <div className="h-3.5 w-1/3 bg-muted rounded mb-3" />
                <div className="h-2.5 w-2/3 bg-muted rounded mb-4" />
                <div className="flex gap-2">
                  <div className="h-5 w-14 bg-muted rounded-full" />
                  <div className="h-5 w-10 bg-muted rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-destructive/70 mb-4">{error}</p>
            <Link href="/support/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              <PlusIcon size={13} /> {s.newTicket}
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <InboxIcon size={22} className="text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground mb-1">
              {query ? 'Aucun ticket trouvé' : s.noTicketsYet}
            </p>
            {!query && (
              <>
                <p className="text-xs text-muted-foreground/70 mb-6">{s.noTicketsHint}</p>
                <Link href="/support/contact"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                  <PlusIcon size={13} /> {s.newTicket}
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(ticket => {
              const cfg = STATUS_CFG[ticket.status] ?? STATUS_CFG.open;
              const prio = PRIORITY_CFG[ticket.priority];
              return (
                <Link
                  key={ticket.id}
                  href={`/support/mes-tickets/${ticket.ticketNumber}`}
                  className="group flex items-start gap-4 rounded-2xl border border-border bg-card px-5 py-4 hover:border-primary/20 hover:bg-primary/2 transition-all active:scale-[0.995]"
                  style={{ borderLeftColor: cfg.color, borderLeftWidth: 3 }}
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-mono text-muted-foreground/60 shrink-0">
                        #{ticket.ticketNumber}
                      </span>
                      <p className="text-sm font-semibold leading-snug truncate group-hover:text-primary transition-colors">
                        {ticket.subject}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      <span className="font-medium mr-1">{CAT_LABELS[ticket.category] ?? ticket.category}</span>
                      — {ticket.description.slice(0, 80)}{ticket.description.length > 80 ? '…' : ''}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5"
                        style={{ color: cfg.color, background: cfg.color + '18' }}>
                        <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                        {s.statusLabels?.[ticket.status] ?? ticket.status}
                      </span>
                      {prio && (
                        <span className="text-[11px] rounded-full px-2 py-0.5 font-medium"
                          style={{ color: prio.color, background: prio.color + '14' }}>
                          {prio.label}
                        </span>
                      )}
                      {ticket.messageCount > 0 && (
                        <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                          {ticket.messageCount} {ticket.messageCount > 1 ? 'messages' : 'message'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between gap-3 shrink-0 self-stretch">
                    <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap">
                      {timeAgo(ticket.updatedAt)}
                    </span>
                    <ArrowRightIcon size={13}
                      className="text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
