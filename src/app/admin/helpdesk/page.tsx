'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Chip, Input, Label, ListBox, Modal, SearchField, Select,
  TextArea, TextField,
} from '@heroui/react';
import {
  AlertOctagon, CheckCircle2, Clock, Inbox, LifeBuoy, Lock, RotateCcw, Send,
  Trash2, UserCheck,
} from 'lucide-react';

import { api } from '@/lib/api';
import {
  DateText, EmptyState, InitialAvatar, PageHeader, SectionCard, StatCard,
  TableShell, TableSkeleton, Td, Th, Tr,
} from '@/components/alfy/admin/primitives';

type TicketStatus = 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

interface Ticket {
  id: string;
  ticketNumber: number;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  requesterName: string;
  requesterUsername: string;
  assignedTo: string | null;
  assignedToName: string | null;
  createdAt: string;
  messageCount: number;
}

interface HelpdeskMessage {
  id: string;
  authorName: string;
  authorUsername: string;
  authorRole: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

interface HelpdeskStats {
  total: number; open: number; inProgress: number; pending: number;
  resolved: number; closed: number; critical: number; unassigned: number;
  avgResolutionHours: number | null;
}

interface StaffAgent {
  id: string;
  username: string;
  display_name: string;
  role: string;
  is_online: boolean;
}

const STATUSES: { key: TicketStatus; label: string; color: 'accent' | 'warning' | 'success' | 'default' }[] = [
  { key: 'open',        label: 'Ouvert',     color: 'accent' },
  { key: 'pending',     label: 'En attente', color: 'warning' },
  { key: 'in_progress', label: 'En cours',   color: 'accent' },
  { key: 'resolved',    label: 'Résolu',     color: 'success' },
  { key: 'closed',      label: 'Clos',       color: 'default' },
];

const PRIORITIES: { key: TicketPriority; label: string; color: 'default' | 'accent' | 'warning' | 'danger' }[] = [
  { key: 'low',      label: 'Basse',   color: 'default' },
  { key: 'medium',   label: 'Moyenne', color: 'accent' },
  { key: 'high',     label: 'Haute',   color: 'warning' },
  { key: 'critical', label: 'Critique', color: 'danger' },
];

const STATUS_FILTERS = [{ key: 'all', label: 'Tous les statuts' }, ...STATUSES];

export default function AdminHelpdeskPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats]     = useState<HelpdeskStats | null>(null);
  const [agents, setAgents]   = useState<StaffAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Ticket ouvert dans le panneau de conversation
  const [active, setActive] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<HelpdeskMessage[]>([]);
  const [thread, setThread] = useState(false);
  const [reply, setReply]   = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ limit: '200' });
    if (statusFilter !== 'all') params.set('status', statusFilter);

    const [ticketsRes, statsRes, agentsRes] = await Promise.all([
      api.get(`/api/helpdesk/tickets?${params.toString()}`),
      api.get('/api/helpdesk/stats'),
      api.get('/api/helpdesk/agents'),
    ]);

    if (ticketsRes.success && ticketsRes.data) {
      const d = ticketsRes.data as Ticket[] | { tickets?: Ticket[] };
      setTickets(Array.isArray(d) ? d : (d.tickets ?? []));
    } else {
      setError(ticketsRes.error ?? 'Impossible de charger les tickets.');
    }

    if (statsRes.success && statsRes.data) setStats(statsRes.data as HelpdeskStats);
    if (agentsRes.success && agentsRes.data) {
      const d = agentsRes.data as StaffAgent[] | { agents?: StaffAgent[] };
      setAgents(Array.isArray(d) ? d : (d.agents ?? []));
    }

    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.requesterUsername?.toLowerCase().includes(q) ||
        String(t.ticketNumber).includes(q),
    );
  }, [tickets, search]);

  const openThread = async (ticket: Ticket) => {
    setActive(ticket);
    setThread(true);
    setMessages([]);
    setReply('');
    setInternal(false);

    const res = await api.get(`/api/helpdesk/tickets/${ticket.id}/messages`);
    if (res.success && res.data) {
      const d = res.data as HelpdeskMessage[] | { messages?: HelpdeskMessage[] };
      setMessages(Array.isArray(d) ? d : (d.messages ?? []));
    }
  };

  const send = async () => {
    if (!active || !reply.trim()) return;
    setSending(true);

    const res = await api.post(`/api/helpdesk/tickets/${active.id}/messages`, {
      content: reply.trim(),
      isInternal: internal,
    });
    setSending(false);

    if (res.success) {
      setReply('');
      openThread(active);
    } else {
      setError(res.error ?? 'Le message n’a pas pu être envoyé.');
    }
  };

  const patchTicket = async (ticket: Ticket, data: Record<string, unknown>) => {
    const res = await api.patch(`/api/helpdesk/tickets/${ticket.id}`, data);
    if (res.success) {
      load();
      if (active?.id === ticket.id) setActive({ ...ticket, ...data } as Ticket);
    } else {
      setError(res.error ?? 'Le ticket n’a pas pu être mis à jour.');
    }
  };

  const remove = async (ticket: Ticket) => {
    const res = await api.delete(`/api/helpdesk/tickets/${ticket.id}`);
    if (res.success) { setThread(false); load(); }
  };

  return (
    <>
      <PageHeader
        title="Helpdesk"
        description="Tickets d’assistance ouverts par les utilisateurs."
      >
        <Button size="sm" variant="secondary" onPress={load} isPending={loading}>
          <RotateCcw className="size-3.5" aria-hidden />
          Actualiser
        </Button>
      </PageHeader>

      {error && (
        <Alert status="danger" className="mb-5">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="admin-stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ouverts" value={stats?.open ?? 0} icon={Inbox} tone="accent" loading={loading} />
        <StatCard label="En cours" value={stats?.inProgress ?? 0} icon={Clock} tone="warning" loading={loading} />
        <StatCard label="Critiques" value={stats?.critical ?? 0} icon={AlertOctagon} tone="danger" loading={loading} />
        <StatCard
          label="Non assignés"
          value={stats?.unassigned ?? 0}
          hint={
            stats?.avgResolutionHours != null
              ? `Résolution moyenne : ${Math.round(stats.avgResolutionHours)} h`
              : undefined
          }
          icon={UserCheck}
          loading={loading}
        />
      </div>

      <SectionCard
        flush
        title="Tickets"
        description={`${visible.length} ticket${visible.length > 1 ? 's' : ''}`}
        actions={
          <>
            <SearchField
              aria-label="Rechercher un ticket"
              value={search}
              onChange={setSearch}
              className="w-full sm:w-56"
            >
              <Input placeholder="Sujet, numéro, demandeur…" />
            </SearchField>
            <Select
              aria-label="Filtrer par statut"
              selectedKey={statusFilter}
              onSelectionChange={(k) => setStatusFilter(String(k))}
              className="w-40"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {STATUS_FILTERS.map((s) => (
                    <ListBox.Item key={s.key} id={s.key} textValue={s.label}>
                      <Label>{s.label}</Label>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </>
        }
      >
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="Aucun ticket"
            description={
              search || statusFilter !== 'all'
                ? 'Aucun ticket ne correspond à ces filtres.'
                : 'Aucune demande d’assistance en cours.'
            }
          />
        ) : (
          <TableShell
            minWidth={900}
            head={
              <>
                <Th>Ticket</Th>
                <Th>Demandeur</Th>
                <Th>Priorité</Th>
                <Th>Statut</Th>
                <Th>Assigné à</Th>
                <Th>Ouvert</Th>
              </>
            }
          >
            {visible.map((t) => {
              const status = STATUSES.find((s) => s.key === t.status);
              const prio = PRIORITIES.find((p) => p.key === t.priority);
              return (
                <Tr key={t.id} onPress={() => openThread(t)}>
                  <Td className="max-w-sm">
                    <p className="truncate text-sm font-medium">
                      <span className="text-muted">#{t.ticketNumber}</span> {t.subject}
                    </p>
                    <p className="text-xs text-muted">
                      {t.messageCount} message{t.messageCount > 1 ? 's' : ''}
                    </p>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <InitialAvatar name={t.requesterName ?? '?'} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm">{t.requesterName}</p>
                        <p className="truncate text-xs text-muted">@{t.requesterUsername}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Chip size="sm" variant="soft" color={prio?.color ?? 'default'}>
                      <Chip.Label>{prio?.label ?? t.priority}</Chip.Label>
                    </Chip>
                  </Td>
                  <Td>
                    <Chip size="sm" variant="soft" color={status?.color ?? 'default'}>
                      <Chip.Label>{status?.label ?? t.status}</Chip.Label>
                    </Chip>
                  </Td>
                  <Td>
                    <span className="text-xs text-muted">
                      {t.assignedToName ?? 'Personne'}
                    </span>
                  </Td>
                  <Td><DateText value={t.createdAt} /></Td>
                </Tr>
              );
            })}
          </TableShell>
        )}
      </SectionCard>

      {/* ── Conversation ── */}
      <Modal.Backdrop isOpen={thread} onOpenChange={setThread}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[640px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-accent/12 text-accent">
                <LifeBuoy className="size-5" aria-hidden />
              </Modal.Icon>
              <Modal.Heading>
                #{active?.ticketNumber} — {active?.subject}
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="space-y-4">
              {/* Pilotage du ticket */}
              <div className="grid gap-3 sm:grid-cols-3">
                <Select
                  aria-label="Statut"
                  selectedKey={active?.status}
                  onSelectionChange={(k) => active && patchTicket(active, { status: k })}
                >
                  <Label>Statut</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {STATUSES.map((s) => (
                        <ListBox.Item key={s.key} id={s.key} textValue={s.label}>
                          <Label>{s.label}</Label>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <Select
                  aria-label="Priorité"
                  selectedKey={active?.priority}
                  onSelectionChange={(k) => active && patchTicket(active, { priority: k })}
                >
                  <Label>Priorité</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {PRIORITIES.map((p) => (
                        <ListBox.Item key={p.key} id={p.key} textValue={p.label}>
                          <Label>{p.label}</Label>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <Select
                  aria-label="Assignation"
                  selectedKey={active?.assignedTo ?? 'none'}
                  onSelectionChange={(k) =>
                    active && patchTicket(active, { assignedTo: k === 'none' ? null : k })
                  }
                >
                  <Label>Assigné à</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id="none" textValue="Personne">
                        <Label>Personne</Label>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                      {agents.map((a) => (
                        <ListBox.Item key={a.id} id={a.id} textValue={a.display_name || a.username}>
                          <Label>{a.display_name || a.username}</Label>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>

              {/* Demande initiale */}
              {active && (
                <div className="rounded-md border border-border bg-surface-secondary p-3">
                  <p className="mb-1 text-xs font-medium text-muted">
                    {active.requesterName} · <DateText value={active.createdAt} withTime />
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {active.description}
                  </p>
                </div>
              )}

              {/* Fil */}
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted">
                    Aucune réponse pour l’instant.
                  </p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={
                        'rounded-md border p-3 ' +
                        (m.isInternal
                          ? 'border-warning/40 bg-warning/5'
                          : 'border-border bg-surface')
                      }
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-medium">{m.authorName}</span>
                        {m.isInternal && (
                          <Chip size="sm" variant="soft" color="warning">
                            <Chip.Label className="flex items-center gap-1">
                              <Lock className="size-2.5" aria-hidden />
                              Note interne
                            </Chip.Label>
                          </Chip>
                        )}
                        <DateText value={m.createdAt} withTime />
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Réponse */}
              <TextField value={reply} onChange={setReply}>
                <Label>Réponse</Label>
                <TextArea rows={3} placeholder="Rédigez votre réponse…" />
              </TextField>

              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(e) => setInternal(e.target.checked)}
                  className="size-3.5 accent-[var(--accent)]"
                />
                Note interne — invisible pour le demandeur
              </label>
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="ghost"
                className="mr-auto text-danger hover:bg-danger/10"
                onPress={() => active && remove(active)}
              >
                <Trash2 className="size-3.5" aria-hidden />
                Supprimer
              </Button>
              {active?.status !== 'resolved' && (
                <Button
                  variant="secondary"
                  onPress={() => active && patchTicket(active, { status: 'resolved' })}
                >
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  Marquer résolu
                </Button>
              )}
              <Button onPress={send} isPending={sending} isDisabled={!reply.trim()}>
                <Send className="size-3.5" aria-hidden />
                Envoyer
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
