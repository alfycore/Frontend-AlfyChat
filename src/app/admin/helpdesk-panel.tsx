'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button }   from '@/components/ui/button';
import { Badge }    from '@/components/ui/badge';
import { Input }    from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangleIcon, CheckCircle2Icon, ClockIcon, InboxIcon,
  MessageSquareIcon, PlusIcon, RefreshCwIcon, SearchIcon,
  ShieldIcon, UserIcon, WrenchIcon, XCircleIcon, ZapIcon,
  ChevronLeftIcon, SendIcon, LockIcon, ExternalLinkIcon,
  Trash2Icon, Edit2Icon, BarChart3Icon,
} from '@/components/icons';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

type TicketStatus = 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
type TicketCategory = 'general' | 'technical' | 'billing' | 'account' | 'abuse' | 'feature' | 'other';

interface Ticket {
  id: string;
  ticketNumber: number;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  requesterId: string;
  requesterName: string;
  requesterUsername: string;
  assignedTo: string | null;
  assignedToName: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  resolvedAt: string | null;
  messageCount: number;
}

interface HelpdeskMessage {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorRole: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

interface HelpdeskStats {
  total: number;
  open: number;
  inProgress: number;
  pending: number;
  resolved: number;
  closed: number;
  critical: number;
  unassigned: number;
  avgResolutionHours: number | null;
}

interface StaffAgent {
  id: string;
  username: string;
  display_name: string;
  role: string;
  is_online: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: React.ElementType }> = {
  open:        { label: 'Ouvert',      color: '#3b82f6', icon: InboxIcon },
  pending:     { label: 'En attente',  color: '#f59e0b', icon: ClockIcon },
  in_progress: { label: 'En cours',    color: '#8b5cf6', icon: WrenchIcon },
  resolved:    { label: 'Résolu',      color: '#22c55e', icon: CheckCircle2Icon },
  closed:      { label: 'Fermé',       color: '#6b7280', icon: XCircleIcon },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  low:      { label: 'Faible',    color: '#6b7280' },
  medium:   { label: 'Moyen',     color: '#3b82f6' },
  high:     { label: 'Élevé',     color: '#f59e0b' },
  critical: { label: 'Critique',  color: '#ef4444' },
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  general:   'Général', technical: 'Technique', billing: 'Facturation',
  account:   'Compte',  abuse: 'Signalement',   feature: 'Suggestion',
  other:     'Autre',
};

const ROLE_LABELS: Record<string, string> = {
  admin:      'Administrateur', moderator:  'Modérateur',
  support_l1: 'Support N1',     support_l2: 'Support N2',
  technician: 'Technicien',     user:       'Utilisateur',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs} h`;
  return `il y a ${Math.floor(hrs / 24)} j`;
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: cfg.color + '22', color: cfg.color }}>
      <Icon size={11} />{cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ background: cfg.color + '22', color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ── Stats card ─────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number | string; color: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-lg" style={{ background: color + '22' }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function HelpDeskPanel() {
  const [view, setView] = useState<'list' | 'detail' | 'new'>('list');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<HelpdeskStats | null>(null);
  const [agents, setAgents] = useState<StaffAgent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterAssigned, setFilterAssigned] = useState<string>('');
  const [search, setSearch] = useState('');

  // Selected ticket
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<HelpdeskMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyInternal, setReplyInternal] = useState(false);
  const [replySending, setReplySending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New ticket form
  const [newForm, setNewForm] = useState({
    subject: '', description: '', priority: 'medium' as TicketPriority,
    category: 'general' as TicketCategory, requesterId: '',
  });
  const [creating, setCreating] = useState(false);

  // Edit (assignee / status / priority on detail)
  const [editAssignee, setEditAssignee] = useState<string>('');
  const [editStatus, setEditStatus] = useState<TicketStatus>('open');
  const [editPriority, setEditPriority] = useState<TicketPriority>('medium');
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      const r = await api.get('/api/helpdesk/stats');
      if (r.success) setStats(r.data as any);
    } catch { /* ignore */ }
  }, []);

  const loadAgents = useCallback(async () => {
    try {
      const r = await api.get('/api/helpdesk/agents');
      if (r.success) setAgents(r.data as any[]);
    } catch { /* ignore */ }
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      if (filterCategory) params.set('category', filterCategory);
      if (filterAssigned) params.set('assignedTo', filterAssigned);
      if (search) params.set('search', search);
      params.set('limit', '100');
      const r = await api.get(`/api/helpdesk/tickets?${params.toString()}`);
      if (r.success) setTickets(r.data as Ticket[]);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filterStatus, filterPriority, filterCategory, filterAssigned, search]);

  const loadMessages = useCallback(async (ticketId: string) => {
    setMsgLoading(true);
    try {
      const r = await api.get(`/api/helpdesk/tickets/${ticketId}/messages`);
      if (r.success) setMessages(r.data as HelpdeskMessage[]);
    } catch { /* ignore */ }
    setMsgLoading(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  useEffect(() => { loadStats(); loadAgents(); }, [loadStats, loadAgents]);
  useEffect(() => { if (view === 'list') loadTickets(); }, [view, loadTickets]);
  useEffect(() => {
    if (selectedTicket) loadMessages(selectedTicket.id);
  }, [selectedTicket, loadMessages]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setEditAssignee(ticket.assignedTo ?? '__none');
    setEditStatus(ticket.status);
    setEditPriority(ticket.priority);
    setReplyContent('');
    setView('detail');
  };

  const saveTicketChanges = async () => {
    if (!selectedTicket) return;
    setSaving(true);
    try {
      const r = await api.patch(`/api/helpdesk/tickets/${selectedTicket.id}`, {
        status: editStatus,
        priority: editPriority,
        assignedTo: editAssignee === '__none' ? null : editAssignee,
      });
      if (r.success) {
        setSelectedTicket(r.data as Ticket);
        loadStats();
        loadTickets();
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyContent.trim()) return;
    setReplySending(true);
    try {
      const r = await api.post(`/api/helpdesk/tickets/${selectedTicket.id}/messages`, {
        content: replyContent.trim(),
        isInternal: replyInternal,
      });
      if (r.success) {
        setReplyContent('');
        await loadMessages(selectedTicket.id);
        // refresh ticket for updated message count & status
        const t = await api.get(`/api/helpdesk/tickets/${selectedTicket.id}`);
        if (t.success) setSelectedTicket(t.data as Ticket);
      }
    } catch { /* ignore */ }
    setReplySending(false);
  };

  const createTicket = async () => {
    if (!newForm.subject.trim() || !newForm.description.trim()) return;
    setCreating(true);
    try {
      const r = await api.post('/api/helpdesk/tickets', {
        subject: newForm.subject.trim(),
        description: newForm.description.trim(),
        priority: newForm.priority,
        category: newForm.category,
        requesterId: newForm.requesterId || undefined,
      });
      if (r.success) {
        setNewForm({ subject: '', description: '', priority: 'medium', category: 'general', requesterId: '' });
        setView('list');
        loadTickets();
        loadStats();
        openTicket(r.data as Ticket);
      }
    } catch { /* ignore */ }
    setCreating(false);
  };

  const deleteTicket = async (id: string) => {
    try {
      await api.delete(`/api/helpdesk/tickets/${id}`);
      setDeleteId(null);
      if (selectedTicket?.id === id) { setSelectedTicket(null); setView('list'); }
      loadTickets();
      loadStats();
    } catch { /* ignore */ }
  };

  // ── RENDER: Stats overview ─────────────────────────────────────────────────

  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <StatCard label="Total tickets"   value={stats?.total ?? 0}      color="#6366f1" icon={InboxIcon} />
      <StatCard label="Ouverts"          value={stats?.open ?? 0}       color="#3b82f6" icon={InboxIcon} />
      <StatCard label="En cours"         value={stats?.inProgress ?? 0} color="#8b5cf6" icon={WrenchIcon} />
      <StatCard label="Critiques"        value={stats?.critical ?? 0}   color="#ef4444" icon={AlertTriangleIcon} />
      <StatCard label="Non assignés"     value={stats?.unassigned ?? 0} color="#f59e0b" icon={UserIcon} />
      <StatCard label="Résolus"          value={stats?.resolved ?? 0}   color="#22c55e" icon={CheckCircle2Icon} />
      <StatCard label="Fermés"           value={stats?.closed ?? 0}     color="#6b7280" icon={XCircleIcon} />
      <StatCard
        label="Résolution moyenne"
        value={stats?.avgResolutionHours != null ? `${stats.avgResolutionHours} h` : '—'}
        color="#06b6d4" icon={ZapIcon} />
    </div>
  );

  // ── RENDER: Ticket list ────────────────────────────────────────────────────

  const renderList = () => (
    <div>
      {renderStats()}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <SearchIcon size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9 h-9"
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadTickets()} />
        </div>

        <Select value={filterStatus || '__all'} onValueChange={v => setFilterStatus(v === '__all' ? '' : v)}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Tous statuts</SelectItem>
            {(Object.keys(STATUS_CONFIG) as TicketStatus[]).map(s =>
              <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterPriority || '__all'} onValueChange={v => setFilterPriority(v === '__all' ? '' : v)}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Priorité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Toutes priorités</SelectItem>
            {(Object.keys(PRIORITY_CONFIG) as TicketPriority[]).map(p =>
              <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterCategory || '__all'} onValueChange={v => setFilterCategory(v === '__all' ? '' : v)}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Toutes catégories</SelectItem>
            {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map(c =>
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterAssigned || '__all'} onValueChange={v => setFilterAssigned(v === '__all' ? '' : v)}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Agent" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Tous agents</SelectItem>
            <SelectItem value="__unassigned">Non assignés</SelectItem>
            {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.display_name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button size="sm" variant="outline" className="h-9" onClick={loadTickets}>
          <RefreshCwIcon size={16} />
        </Button>
        <Button size="sm" className="h-9" onClick={() => setView('new')}>
          <PlusIcon size={16} className="mr-1" /> Nouveau ticket
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Chargement…</div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <InboxIcon size={40} className="mb-2 opacity-30" />
          <p className="text-sm">Aucun ticket trouvé</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-16">#</TableHead>
                <TableHead>Sujet</TableHead>
                <TableHead className="w-28">Statut</TableHead>
                <TableHead className="w-24">Priorité</TableHead>
                <TableHead className="w-28">Catégorie</TableHead>
                <TableHead className="w-36">Demandeur</TableHead>
                <TableHead className="w-36">Assigné à</TableHead>
                <TableHead className="w-28">Mis à jour</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map(ticket => (
                <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => openTicket(ticket)}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{ticket.ticketNumber}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm line-clamp-1">{ticket.subject}</p>
                    {ticket.messageCount > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MessageSquareIcon size={11} />{ticket.messageCount} message{ticket.messageCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </TableCell>
                  <TableCell><StatusBadge status={ticket.status} /></TableCell>
                  <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{CATEGORY_LABELS[ticket.category]}</span></TableCell>
                  <TableCell>
                    <span className="text-sm">{ticket.requesterName}</span>
                    <p className="text-xs text-muted-foreground">@{ticket.requesterUsername}</p>
                  </TableCell>
                  <TableCell>
                    {ticket.assignedToName
                      ? <span className="text-sm">{ticket.assignedToName}</span>
                      : <span className="text-xs text-muted-foreground italic">Non assigné</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{timeAgo(ticket.updatedAt)}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(ticket.id)}>
                      <Trash2Icon size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  // ── RENDER: Ticket detail ──────────────────────────────────────────────────

  const renderDetail = () => {
    if (!selectedTicket) return null;
    return (
      <div className="flex gap-4 h-full">
        {/* Left — conversation */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setView('list')}>
              <ChevronLeftIcon size={16} className="mr-1" /> Tickets
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-sm">{selectedTicket.subject}</span>
            <span className="ml-auto text-xs text-muted-foreground font-mono">#{selectedTicket.ticketNumber}</span>
          </div>

          {/* Original message */}
          <div className="rounded-lg border bg-muted/20 p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                {selectedTicket.requesterName[0]?.toUpperCase()}
              </div>
              <span className="font-medium text-sm">{selectedTicket.requesterName}</span>
              <span className="text-xs text-muted-foreground">@{selectedTicket.requesterUsername}</span>
              <span className="ml-auto text-xs text-muted-foreground">{timeAgo(selectedTicket.createdAt)}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
          </div>

          {/* Messages thread */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 min-h-0 max-h-[calc(100vh-520px)]">
            {msgLoading ? (
              <div className="text-center text-sm text-muted-foreground py-4">Chargement…</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">Aucune réponse pour l'instant</div>
            ) : messages.map(msg => {
              const isStaff = ['admin', 'support_l1', 'support_l2', 'technician', 'moderator'].includes(msg.authorRole);
              return (
                <div key={msg.id}
                  className={`flex gap-2 ${isStaff ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                    ${isStaff ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {msg.authorName[0]?.toUpperCase()}
                  </div>
                  <div className={`max-w-[70%] ${isStaff ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`rounded-xl px-3 py-2 text-sm
                      ${msg.isInternal
                        ? 'border border-amber-400/50 bg-amber-50/10 text-amber-200'
                        : isStaff ? 'bg-primary/20 text-foreground' : 'bg-muted text-foreground'}`}>
                      {msg.isInternal && (
                        <p className="text-xs text-amber-400 font-medium mb-1 flex items-center gap-1">
                          <LockIcon size={11} /> Note interne
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-0.5 px-1">
                      {msg.authorName} · {ROLE_LABELS[msg.authorRole] ?? msg.authorRole} · {timeAgo(msg.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply box */}
          {!['resolved', 'closed'].includes(selectedTicket.status) ? (
            <div className="rounded-lg border bg-card p-3">
              <Textarea
                placeholder="Écrire une réponse…"
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                className="min-h-20 resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-sm"
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply(); }}
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input type="checkbox" className="rounded" checked={replyInternal}
                    onChange={e => setReplyInternal(e.target.checked)} />
                  <LockIcon size={11} /> Note interne (invisible au demandeur)
                </label>
                <Button size="sm" disabled={!replyContent.trim() || replySending} onClick={sendReply}>
                  <SendIcon size={14} className="mr-1.5" />
                  {replySending ? 'Envoi…' : 'Envoyer'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/20 p-3 text-center text-sm text-muted-foreground">
              Ce ticket est {selectedTicket.status === 'resolved' ? 'résolu' : 'fermé'}.
              Modifiez le statut pour y répondre.
            </div>
          )}
        </div>

        {/* Right — sidebar */}
        <div className="w-64 shrink-0 space-y-4">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Propriétés</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Statut</p>
                <Select value={editStatus} onValueChange={v => setEditStatus(v as TicketStatus)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_CONFIG) as TicketStatus[]).map(s =>
                      <SelectItem key={s} value={s} className="text-xs">{STATUS_CONFIG[s].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Priorité</p>
                <Select value={editPriority} onValueChange={v => setEditPriority(v as TicketPriority)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRIORITY_CONFIG) as TicketPriority[]).map(p =>
                      <SelectItem key={p} value={p} className="text-xs">{PRIORITY_CONFIG[p].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Assigné à</p>
                <Select value={editAssignee || '__none'} onValueChange={setEditAssignee}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none" className="text-xs">Non assigné</SelectItem>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">
                        {a.display_name}
                        <span className="ml-1 text-muted-foreground">({ROLE_LABELS[a.role] ?? a.role})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="w-full" disabled={saving} onClick={saveTicketChanges}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Détails</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Catégorie</span>
                <span>{CATEGORY_LABELS[selectedTicket.category]}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Demandeur</span>
                <span>@{selectedTicket.requesterUsername}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Créé</span>
                <span>{timeAgo(selectedTicket.createdAt)}</span>
              </div>
              {selectedTicket.resolvedAt && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Résolu</span>
                  <span>{timeAgo(selectedTicket.resolvedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Button variant="destructive" size="sm" className="w-full"
            onClick={() => setDeleteId(selectedTicket.id)}>
            <Trash2Icon size={14} className="mr-1.5" /> Supprimer le ticket
          </Button>
        </div>
      </div>
    );
  };

  // ── RENDER: New ticket form ────────────────────────────────────────────────

  const renderNewTicket = () => (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setView('list')}>
          <ChevronLeftIcon size={16} className="mr-1" /> Retour
        </Button>
        <h2 className="font-semibold">Créer un ticket</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Sujet *</label>
          <Input placeholder="Décrivez brièvement le problème"
            value={newForm.subject} onChange={e => setNewForm(f => ({ ...f, subject: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Description *</label>
          <Textarea placeholder="Décrivez le problème en détail…" className="min-h-30"
            value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Priorité</label>
            <Select value={newForm.priority} onValueChange={v => setNewForm(f => ({ ...f, priority: v as TicketPriority }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PRIORITY_CONFIG) as TicketPriority[]).map(p =>
                  <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Catégorie</label>
            <Select value={newForm.category} onValueChange={v => setNewForm(f => ({ ...f, category: v as TicketCategory }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map(c =>
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">ID utilisateur demandeur (optionnel)</label>
          <Input placeholder="Laisser vide pour vous-même"
            value={newForm.requesterId} onChange={e => setNewForm(f => ({ ...f, requesterId: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setView('list')}>Annuler</Button>
          <Button disabled={!newForm.subject.trim() || !newForm.description.trim() || creating} onClick={createTicket}>
            {creating ? 'Création…' : 'Créer le ticket'}
          </Button>
        </div>
      </div>
    </div>
  );

  // ── RENDER: Agents panel ───────────────────────────────────────────────────

  const renderAgents = () => (
    <div className="rounded-lg border overflow-hidden mt-6">
      <div className="bg-muted/30 px-4 py-2 border-b">
        <h3 className="text-sm font-semibold">Agents de support</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20">
            <TableHead>Agent</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map(agent => (
            <TableRow key={agent.id}>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{agent.display_name}</p>
                  <p className="text-xs text-muted-foreground">@{agent.username}</p>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {ROLE_LABELS[agent.role] ?? agent.role}
                </span>
              </TableCell>
              <TableCell>
                <span className={`flex items-center gap-1.5 text-xs font-medium ${agent.is_online ? 'text-green-500' : 'text-muted-foreground'}`}>
                  <span className={`size-1.5 rounded-full ${agent.is_online ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                  {agent.is_online ? 'En ligne' : 'Hors ligne'}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {view === 'list' && (
        <>
          {renderList()}
          {renderAgents()}
        </>
      )}
      {view === 'detail' && renderDetail()}
      {view === 'new' && renderNewTicket()}

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le ticket ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Cette action est irréversible. Tous les messages seront supprimés.</p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button variant="destructive" onClick={() => deleteId && deleteTicket(deleteId)}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
