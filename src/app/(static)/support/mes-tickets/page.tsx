'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon, InboxIcon, ClockIcon, CheckCircle2Icon,
  XCircleIcon, MessageSquareIcon, ZapIcon, AlertTriangleIcon,
} from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  open:        { color: '#3b82f6', bg: '#3b82f620' },
  pending:     { color: '#f59e0b', bg: '#f59e0b20' },
  in_progress: { color: '#8b5cf6', bg: '#8b5cf620' },
  resolved:    { color: '#22c55e', bg: '#22c55e20' },
  closed:      { color: '#6b7280', bg: '#6b728020' },
};

const PRIORITY_COLOR: Record<string, string> = {
  low:      '#22c55e',
  medium:   '#3b82f6',
  high:     '#f59e0b',
  critical: '#ef4444',
};

function StatusBadge({ status, s }: { status: string; s: { ticketStatus: Record<string, string> } }) {
  const cfg = STATUS_CONFIG[status] ?? { color: '#6b7280', bg: '#6b728020' };
  const label = s.ticketStatus[status] ?? status;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1"
      style={{ color: cfg.color, background: cfg.bg }}>
      {status === 'open' && <InboxIcon size={10} />}
      {status === 'in_progress' && <ZapIcon size={10} />}
      {status === 'resolved' && <CheckCircle2Icon size={10} />}
      {status === 'closed' && <XCircleIcon size={10} />}
      {status === 'pending' && <ClockIcon size={10} />}
      {label}
    </span>
  );
}

function PriorityBadge({ priority, s }: { priority: string; s: { ticketPriority: Record<string, string> } }) {
  const color = PRIORITY_COLOR[priority] ?? '#6b7280';
  const label = s.ticketPriority[priority] ?? priority;
  return (
    <span className="inline-flex items-center text-xs font-medium" style={{ color }}>
      {priority === 'critical' && <AlertTriangleIcon size={10} className="mr-1" />}
      {label}
    </span>
  );
}

function formatDate(dateStr: string, locale: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(locale, {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

export default function MesTicketsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t, locale } = useTranslation();
  const s = t.static.support;
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?redirect=/support/mes-tickets');
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const r = await api.get('/api/helpdesk/public/tickets');
        if (r.success) {
          const data = r.data as any;
          setTickets(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
        } else {
          setError(r.error || 'Impossible de charger vos tickets.');
        }
      } catch {
        setError('Impossible de joindre le serveur.');
      }
      setLoading(false);
    };
    load();
  }, [user, authLoading, router]);

  if (authLoading || (!user && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <Link href="/support" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeftIcon size={12} /> {s.backToSupport}
          </Link>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <InboxIcon size={22} className="text-primary" />
              </div>
              <div>
                <Badge variant="outline" className="text-[10px] font-mono mb-1">{s.contactBadge}</Badge>
                <h1 className="font-heading text-2xl font-bold leading-tight">{s.myTicketsHeading}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{s.myTicketsSubtitle}</p>
              </div>
            </div>
            <Link href="/support/contact">
              <Button size="sm" className="gap-2">
                <MessageSquareIcon size={14} /> {s.newTicket}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertTriangleIcon size={36} className="text-destructive mb-3 opacity-60" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <InboxIcon size={40} className="text-muted-foreground mb-4 opacity-30" />
            <h2 className="font-semibold text-lg mb-2">{s.noTicketsTitle}</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">{s.noTicketsBody}</p>
            <Link href="/support/contact">
              <Button className="gap-2">
                <MessageSquareIcon size={14} /> {s.openTicket}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(ticket => (
              <Link key={ticket.id} href={`/support/mes-tickets/${ticket.ticketNumber}`}
                className="block rounded-xl border border-border/60 bg-card p-5 hover:border-primary/40 hover:bg-card/80 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">#{ticket.ticketNumber}</span>
                      <StatusBadge status={ticket.status} s={s} />
                      <PriorityBadge priority={ticket.priority} s={s} />
                    </div>
                    <p className="font-medium text-sm leading-snug line-clamp-1">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40">
                  <span className="text-xs text-muted-foreground">
                    {(s.categoryLabels as Record<string, string>)[ticket.category] ?? ticket.category}
                  </span>
                  {ticket.messageCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquareIcon size={11} />
                      {ticket.messageCount > 1 ? s.repliesCount.replace('{n}', String(ticket.messageCount)) : s.replyCount.replace('{n}', String(ticket.messageCount))}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                    <ClockIcon size={11} />
                    {formatDate(ticket.createdAt, locale)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
