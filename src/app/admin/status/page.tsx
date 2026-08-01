'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Chip, Input, Label, ListBox, Modal, Select, TextArea, TextField,
} from '@heroui/react';
import { CheckCircle2, Megaphone, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';

import { api } from '@/lib/api';
import {
  DateText, EmptyState, PageHeader, SectionCard, TableShell, TableSkeleton,
  Td, Th, Toggle, toStringList, Tr,
} from '@/components/alfy/admin/primitives';

type Severity = 'info' | 'warning' | 'critical';
type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

interface Incident {
  id: number;
  title: string;
  message?: string;
  severity: Severity;
  status: IncidentStatus;
  services?: string[];
  createdAt: string;
  resolvedAt?: string | null;
}

const SEVERITIES: { key: Severity; label: string; color: 'accent' | 'warning' | 'danger' }[] = [
  { key: 'info',     label: 'Information', color: 'accent' },
  { key: 'warning',  label: 'Dégradation', color: 'warning' },
  { key: 'critical', label: 'Panne',       color: 'danger' },
];

const STATUSES: { key: IncidentStatus; label: string }[] = [
  { key: 'investigating', label: 'Investigation' },
  { key: 'identified',    label: 'Cause identifiée' },
  { key: 'monitoring',    label: 'Sous surveillance' },
  { key: 'resolved',      label: 'Résolu' },
];

const EMPTY_FORM = {
  title: '',
  message: '',
  severity: 'warning' as Severity,
  status: 'investigating' as IncidentStatus,
  services: '',
};

export default function AdminStatusPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Incident | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.getAdminIncidents(includeResolved);
    if (res.success && res.data) {
      setIncidents((res.data as { incidents?: Incident[] }).incidents ?? []);
    } else {
      setError(res.error ?? 'Impossible de charger les incidents.');
    }
    setLoading(false);
  }, [includeResolved]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (incident: Incident) => {
    setEditing(incident);
    setForm({
      title: incident.title,
      message: incident.message ?? '',
      severity: incident.severity,
      status: incident.status,
      services: toStringList(incident.services).join(', '),
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      severity: form.severity,
      status: form.status,
      services: toStringList(form.services),
    };

    const res = editing
      ? await api.updateIncident(editing.id, payload)
      : await api.createIncident(payload);
    setSaving(false);

    if (!res.success) {
      setError(res.error ?? 'L’incident n’a pas pu être enregistré.');
      return;
    }
    setDialogOpen(false);
    load();
  };

  const resolve = async (incident: Incident) => {
    const res = await api.updateIncident(incident.id, { status: 'resolved' });
    if (res.success) load();
  };

  const remove = async (incident: Incident) => {
    const res = await api.deleteIncident(incident.id);
    if (res.success) load();
  };

  const open = incidents.filter((i) => i.status !== 'resolved');

  return (
    <>
      <PageHeader
        title="Status public"
        description="Incidents publiés sur la page d’état visible par les utilisateurs."
      >
        <Button size="sm" variant="secondary" onPress={load} isPending={loading}>
          <RotateCcw className="size-3.5" aria-hidden />
          Actualiser
        </Button>
        <Button size="sm" onPress={openCreate}>
          <Plus className="size-3.5" aria-hidden />
          Déclarer un incident
        </Button>
      </PageHeader>

      {error && (
        <Alert status="danger" className="mb-5">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {!loading && open.length === 0 && (
        <Alert status="success" className="mb-5">
          <Alert.Content>
            <Alert.Title>Tous les systèmes sont opérationnels</Alert.Title>
            <Alert.Description>Aucun incident ouvert n’est publié actuellement.</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <SectionCard
        flush
        title="Incidents"
        description={`${incidents.length} incident${incidents.length > 1 ? 's' : ''}`}
        actions={
          <label className="flex items-center gap-2 text-xs text-muted">
            Inclure les résolus
            <Toggle
              isSelected={includeResolved}
              onChange={setIncludeResolved}
              label="Inclure les incidents résolus"
            />
          </label>
        }
      >
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : incidents.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Aucun incident"
            description="Rien n’est publié sur la page d’état publique."
          />
        ) : (
          <TableShell
            minWidth={840}
            head={
              <>
                <Th>Incident</Th>
                <Th>Gravité</Th>
                <Th>Statut</Th>
                <Th>Services</Th>
                <Th>Ouvert</Th>
                <Th align="right">Actions</Th>
              </>
            }
          >
            {incidents.map((i) => {
              const sev = SEVERITIES.find((s) => s.key === i.severity);
              return (
                <Tr key={i.id} className={i.status === 'resolved' ? 'opacity-60' : undefined}>
                  <Td className="max-w-sm">
                    <p className="truncate text-sm font-medium">{i.title}</p>
                    {i.message && (
                      <p className="truncate text-xs text-muted" title={i.message}>
                        {i.message}
                      </p>
                    )}
                  </Td>
                  <Td>
                    <Chip size="sm" variant="soft" color={sev?.color ?? 'default'}>
                      <Chip.Label>{sev?.label ?? i.severity}</Chip.Label>
                    </Chip>
                  </Td>
                  <Td>
                    <span className="text-sm">
                      {STATUSES.find((s) => s.key === i.status)?.label ?? i.status}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-muted">
                      {toStringList(i.services).join(', ') || '—'}
                    </span>
                  </Td>
                  <Td><DateText value={i.createdAt} withTime /></Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      {i.status !== 'resolved' && (
                        <Button size="sm" variant="ghost" onPress={() => resolve(i)}>
                          Résoudre
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label={`Modifier ${i.title}`}
                        onPress={() => openEdit(i)}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label={`Supprimer ${i.title}`}
                        className="text-danger hover:bg-danger/10"
                        onPress={() => remove(i)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </TableShell>
        )}
      </SectionCard>

      {/* ── Formulaire ── */}
      <Modal.Backdrop isOpen={dialogOpen} onOpenChange={setDialogOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[500px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-warning/12 text-warning">
                <Megaphone className="size-5" aria-hidden />
              </Modal.Icon>
              <Modal.Heading>
                {editing ? 'Modifier l’incident' : 'Déclarer un incident'}
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="space-y-4">
              <TextField
                value={form.title}
                onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                isRequired
              >
                <Label>Titre</Label>
                <Input placeholder="Latence élevée sur l’envoi de messages" />
              </TextField>

              <TextField
                value={form.message}
                onChange={(v) => setForm((f) => ({ ...f, message: v }))}
              >
                <Label>Message public</Label>
                <TextArea
                  rows={3}
                  placeholder="Nous investiguons une hausse de latence sur la zone Europe."
                />
              </TextField>

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  selectedKey={form.severity}
                  onSelectionChange={(k) => setForm((f) => ({ ...f, severity: k as Severity }))}
                >
                  <Label>Gravité</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {SEVERITIES.map((s) => (
                        <ListBox.Item key={s.key} id={s.key} textValue={s.label}>
                          <Label>{s.label}</Label>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <Select
                  selectedKey={form.status}
                  onSelectionChange={(k) => setForm((f) => ({ ...f, status: k as IncidentStatus }))}
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
              </div>

              <TextField
                value={form.services}
                onChange={(v) => setForm((f) => ({ ...f, services: v }))}
              >
                <Label>Services concernés</Label>
                <Input placeholder="messages, calls" autoComplete="off" />
              </TextField>
            </Modal.Body>

            <Modal.Footer>
              <Button slot="close" variant="tertiary" isDisabled={saving}>Annuler</Button>
              <Button onPress={save} isPending={saving}>
                {editing ? 'Enregistrer' : 'Publier'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
