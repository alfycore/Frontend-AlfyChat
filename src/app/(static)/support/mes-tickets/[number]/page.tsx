'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeftIcon, CheckCircle2Icon, XCircleIcon,
  ClockIcon, ZapIcon, InboxIcon, AlertTriangleIcon, SendIcon,
  ShieldIcon, WrenchIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

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

interface Message {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open:        { label: 'Ouvert',     color: '#3b82f6', bg: '#3b82f620' },
  pending:     { label: 'En attente', color: '#f59e0b', bg: '#f59e0b20' },
  in_progress: { label: 'En cours',   color: '#8b5cf6', bg: '#8b5cf620' },
  resolved:    { label: 'Résolu',     color: '#22c55e', bg: '#22c55e20' },
  closed:      { label: 'Fermé',      color: '#6b7280', bg: '#6b728020' },
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Question générale', technical: 'Technique', billing: 'Facturation',
  account: 'Compte', abuse: 'Signalement', feature: 'Suggestion', other: 'Autre',
};

const STAFF_ROLES = new Set(['admin', 'support_l1', 'support_l2', 'technician', 'moderator']);

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#6b7280', bg: '#6b728020' };
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5"
      style={{ color: cfg.color, background: cfg.bg }}>
      {status === 'open' && <InboxIcon size={9} />}
      {status === 'in_progress' && <ZapIcon size={9} />}
      {status === 'resolved' && <CheckCircle2Icon size={9} />}
      {status === 'closed' && <XCircleIcon size={9} />}
      {status === 'pending' && <ClockIcon size={9} />}
      {cfg.label}
    </span>
  );
}

function formatTime(dateStr: string): string {
  try { return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function formatDateSep(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return dateStr; }
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function Avatar({ name, isStaff }: { name: string; isStaff: boolean }) {
  if (isStaff) {
    return (
      <div className="size-8 rounded-full flex items-center justify-center shrink-0 bg-primary/20">
        <ShieldIcon size={14} className="text-primary" />
      </div>
    );
  }
  return (
    <div className="size-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold bg-muted text-muted-foreground">
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

export default function TicketDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const number = params?.number as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace(`/login?redirect=/support/mes-tickets/${number}`); return; }
    const load = async () => {
      setLoading(true);
      try {
        const [tr, mr] = await Promise.all([
          api.get(`/api/helpdesk/public/tickets/${number}`),
          api.get(`/api/helpdesk/public/tickets/${number}/messages`),
        ]);
        if (tr.success) setTicket((tr.data as any).data ?? tr.data);
        else setError((tr as any).error || 'Ticket introuvable.');
        if (mr.success) setMessages((mr.data as any).data ?? mr.data ?? []);
      } catch {
        setError('Impossible de charger le ticket.');
      }
      setLoading(false);
    };
    load();
  }, [user, authLoading, router, number]);

  useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);

  const sendReply = async () => {
    if (!reply.trim() || !ticket || sending) return;
    setSending(true);
    setSendError('');
    try {
      const r = await api.post(`/api/helpdesk/public/tickets/${ticket.ticketNumber}/messages`, {
        content: reply.trim(),
      });
      if (r.success) {
        setReply('');
        if (textareaRef.current) { textareaRef.current.style.height = '22px'; }
        const mr = await api.get(`/api/helpdesk/public/tickets/${ticket.ticketNumber}/messages`);
        if (mr.success) setMessages((mr.data as any).data ?? mr.data ?? []);
        if (ticket.status === 'resolved') setTicket(t => t ? { ...t, status: 'open' } : t);
        textareaRef.current?.focus();
      } else {
        setSendError((r as any).error || "Impossible d'envoyer le message.");
      }
    } catch {
      setSendError('Impossible de joindre le serveur.');
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
  };

  // Timeline: description initiale + messages
  type TimelineItem =
    | { type: 'original'; date: string }
    | { type: 'message'; msg: Message; date: string };

  const allItems: TimelineItem[] = ticket ? [
    { type: 'original', date: ticket.createdAt },
    ...messages.map(m => ({ type: 'message' as const, msg: m, date: m.createdAt })),
  ] : [];

  if (authLoading || (!user && !error)) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border/60 bg-card/60 backdrop-blur-sm shrink-0">
        <Link href="/support/mes-tickets"
          className="flex items-center justify-center size-8 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeftIcon size={16} />
        </Link>
        <div className="size-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <ShieldIcon size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          {ticket ? (
            <>
              <p className="text-sm font-semibold leading-none truncate">{ticket.subject}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground font-mono">#{ticket.ticketNumber}</span>
                <StatusBadge status={ticket.status} />
                <span className="text-[11px] text-muted-foreground">{CATEGORY_LABELS[ticket.category] ?? ticket.category}</span>
              </div>
            </>
          ) : (
            <p className="text-sm font-semibold">Support AlfyChat</p>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <AlertTriangleIcon size={32} className="text-destructive opacity-60" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link href="/support/mes-tickets">
              <Button variant="outline" size="sm">Retour à mes tickets</Button>
            </Link>
          </div>
        ) : ticket ? (
          <>
            {allItems.map((item, idx) => {
              const prevDate = idx > 0 ? allItems[idx - 1].date : null;
              const showDateSep = !prevDate || !isSameDay(item.date, prevDate);

              if (item.type === 'original') {
                return (
                  <div key="original">
                    {showDateSep && (
                      <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-border/50" />
                        <span className="text-[11px] text-muted-foreground shrink-0">{formatDateSep(item.date)}</span>
                        <div className="flex-1 h-px bg-border/50" />
                      </div>
                    )}
                    <div className="flex gap-3 justify-end mb-1 mt-3">
                      <div className="flex flex-col items-end max-w-[75%]">
                        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
                          <p className="whitespace-pre-wrap">{ticket.description}</p>
                        </div>
                        <span className="text-[11px] text-muted-foreground mt-1 px-1">{formatTime(item.date)}</span>
                      </div>
                      <Avatar name={user?.displayName ?? user?.username ?? '?'} isStaff={false} />
                    </div>
                  </div>
                );
              }

              const msg = item.msg;
              const isStaff = STAFF_ROLES.has(msg.authorRole);
              const isMe = !isStaff;
              const prevItem = idx > 0 ? allItems[idx - 1] : null;
              const prevIsMe = prevItem?.type === 'message'
                ? !STAFF_ROLES.has(prevItem.msg.authorRole)
                : prevItem?.type === 'original' ? true : null;
              const groupWithPrev = !showDateSep && prevIsMe !== null && prevIsMe === isMe;

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="flex items-center gap-3 my-5">
                      <div className="flex-1 h-px bg-border/50" />
                      <span className="text-[11px] text-muted-foreground shrink-0">{formatDateSep(item.date)}</span>
                      <div className="flex-1 h-px bg-border/50" />
                    </div>
                  )}
                  <div className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'} ${groupWithPrev ? 'mt-0.5' : 'mt-3'}`}>
                    {!isMe && (
                      <div className="w-8 shrink-0">
                        {!groupWithPrev && <Avatar name={msg.authorName} isStaff />}
                      </div>
                    )}
                    <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                      {!groupWithPrev && !isMe && (
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-xs font-semibold text-primary">Support AlfyChat</span>
                          <WrenchIcon size={10} className="text-primary opacity-60" />
                        </div>
                      )}
                      <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isMe
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-muted text-foreground rounded-tl-sm'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground mt-1 px-1">{formatTime(msg.createdAt)}</span>
                    </div>
                    {isMe && (
                      <div className="w-8 shrink-0">
                        {!groupWithPrev && <Avatar name={user?.displayName ?? user?.username ?? '?'} isStaff={false} />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {(ticket.status === 'resolved' || ticket.status === 'closed') && (
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-green-500/20" />
                <div className="flex items-center gap-1.5 text-[11px] text-green-500 shrink-0">
                  <CheckCircle2Icon size={11} />
                  {ticket.status === 'resolved' ? 'Ticket résolu' : 'Ticket fermé'}
                </div>
                <div className="flex-1 h-px bg-green-500/20" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        ) : null}
      </div>

      {/* ── Input ── */}
      {ticket && ticket.status !== 'closed' && (
        <div className="shrink-0 px-4 pb-4 pt-2">
          {ticket.status === 'resolved' && (
            <p className="text-[11px] text-muted-foreground text-center mb-2">
              Ce ticket est résolu — répondre le rouvrira automatiquement
            </p>
          )}
          {sendError && <p className="text-xs text-destructive text-center mb-2">{sendError}</p>}
          <div className="flex items-end gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 focus-within:border-primary/50 transition-colors">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Écrire un message… (Entrée pour envoyer, Shift+Entrée pour saut de ligne)"
              value={reply}
              onChange={e => {
                setReply(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground leading-relaxed min-h-5.5 max-h-30 py-0"
              style={{ height: '22px' }}
            />
            <button
              onClick={sendReply}
              disabled={!reply.trim() || sending}
              className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <SendIcon size={14} />
            </button>
          </div>
        </div>
      )}
      {ticket && ticket.status === 'closed' && (
        <div className="shrink-0 px-4 pb-4 pt-2">
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-center text-sm text-muted-foreground">
            Ce ticket est fermé.{' '}
            <Link href="/support/contact" className="text-primary hover:underline">Ouvrir un nouveau ticket</Link>
          </div>
        </div>
      )}
    </div>
  );
}
