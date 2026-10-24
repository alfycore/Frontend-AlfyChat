'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Chip, Description, Input, Label, ListBox, Modal, Select, TextField,
} from '@heroui/react';
import {
  KeyRound, Pencil, Plus, RefreshCcw, RotateCcw, Server, Trash2,
} from 'lucide-react';

import { api } from '@/lib/api';
import {
  EmptyState, PageHeader, RowAction, SectionCard, StatusDot, TableShell, TableSkeleton,
  Td, Th, Toggle, Tr,
} from '@/components/alfy/admin/primitives';
import { ConfirmDialog } from '@/components/alfy/admin/confirm-dialog';
import { ServiceKeyDialog, type IssuedServiceKey } from '@/components/alfy/admin/service-key-dialog';
import { LOCATIONS, SERVICE_PORTS, SERVICE_TYPES } from '@/components/alfy/admin/service-types';

interface ServiceInstance {
  id: string;
  serviceType: string;
  endpoint: string;
  domain: string;
  location: string;
  healthy: boolean;
  enabled: boolean;
  degraded?: boolean;
  degradedReason?: string;
  score?: number;
  lastHeartbeat: string | null;
}

const EMPTY_FORM = {
  id: '',
  serviceType: 'messages',
  endpoint: '',
  domain: '',
  location: 'EU',
};

type Tone = 'success' | 'warning' | 'danger' | 'muted';

function health(s: ServiceInstance): Tone {
  if (!s.enabled) return 'muted';
  if (s.degraded) return 'danger';
  // Aucun heartbeat depuis le démarrage du gateway (clé absente ou instance arrêtée)
  if (!s.lastHeartbeat) return 'warning';
  if (!s.healthy) return 'danger';
  const elapsed = Date.now() - new Date(s.lastHeartbeat).getTime();
  return elapsed > 600_000 ? 'danger' : elapsed > 90_000 ? 'warning' : 'success';
}

function healthLabel(s: ServiceInstance, tone: Tone): string {
  if (tone === 'muted') return 'Désactivée';
  if (s.degraded) return 'Dégradée';
  if (!s.lastHeartbeat) return 'En attente';
  return { success: 'En ligne', warning: 'Inactive', danger: 'Hors ligne' }[tone];
}

export default function AdminServicesPage() {
  const [instances, setInstances] = useState<ServiceInstance[]>([]);
  const [types, setTypes]         = useState<string[]>([...SERVICE_TYPES]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);

  const [editing, setEditing] = useState<ServiceInstance | null>(null);
  const [endpointDraft, setEndpointDraft] = useState('');
  const [deleting, setDeleting] = useState<ServiceInstance | null>(null);

  // Clé révélée une seule fois (création ou rotation) — jamais relisible ensuite
  const [issued, setIssued] = useState<IssuedServiceKey | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.getAdminServices();
    if (res.success && res.data) {
      setInstances((res.data.instances ?? []) as ServiceInstance[]);
      // Le gateway fait foi : un type ajouté côté serveur apparaît sans redéployer le front
      if (res.data.types?.length) setTypes(res.data.types);
      setError(null);
    } else {
      setError(res.error ?? 'Impossible de charger les instances.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const order = new Map(types.map((t, i) => [t, i]));
    return [...instances].sort((a, b) =>
      (order.get(a.serviceType) ?? 99) - (order.get(b.serviceType) ?? 99) || a.id.localeCompare(b.id));
  }, [instances, types]);

  const counts = useMemo(() => {
    const c = { online: 0, pending: 0, down: 0 };
    for (const s of instances) {
      const t = health(s);
      if (t === 'success') c.online++;
      else if (!s.lastHeartbeat && s.enabled) c.pending++;
      else if (t === 'danger') c.down++;
    }
    return c;
  }, [instances]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setAddOpen(true);
  };

  const add = async () => {
    if (!form.id.trim() || !form.endpoint.trim()) {
      setFormError('L’identifiant et l’URL sont obligatoires.');
      return;
    }
    setSaving(true);
    const endpoint = form.endpoint.trim();
    const res = await api.addAdminService({
      id: form.id.trim(),
      serviceType: form.serviceType,
      endpoint,
      domain: form.domain.trim() || undefined,
      location: form.location,
    });
    setSaving(false);

    if (!res.success) {
      setFormError(res.error ?? 'L’instance n’a pas pu être ajoutée.');
      return;
    }
    setAddOpen(false);
    if (res.data?.serviceKey) {
      setIssued({ id: form.id.trim(), key: res.data.serviceKey, endpoint, created: true });
    }
    load();
  };

  const toggle = async (s: ServiceInstance, enabled: boolean) => {
    setInstances((prev) => prev.map((i) => (i.id === s.id ? { ...i, enabled } : i)));
    const res = await api.patchAdminService(s.id, { enabled });
    if (!res.success) {
      setError(res.error ?? 'L’instance n’a pas pu être modifiée.');
      load();
    }
  };

  const remove = async () => {
    if (!deleting) return;
    const res = await api.deleteAdminService(deleting.id);
    setDeleting(null);
    if (res.success) load();
    else setError(res.error ?? 'L’instance n’a pas pu être supprimée.');
  };

  const saveEndpoint = async () => {
    if (!editing) return;
    const res = await api.updateAdminServiceEndpoint(editing.id, endpointDraft.trim());
    if (res.success) { setEditing(null); load(); }
    else setError(res.error ?? 'L’URL n’a pas pu être modifiée.');
  };

  const rotate = async (s: ServiceInstance) => {
    setBusyId(s.id);
    const res = await api.rotateAdminServiceKey(s.id);
    setBusyId(null);

    const key = res.data?.serviceKey;
    if (res.success && key) setIssued({ id: s.id, key, endpoint: s.endpoint });
    else setError(res.error ?? 'La clé n’a pas pu être régénérée.');
  };

  const restore = async (s: ServiceInstance) => {
    setBusyId(s.id);
    const res = await api.restoreAdminService(s.id);
    setBusyId(null);
    if (res.success) load();
    else setError(res.error ?? 'L’instance n’a pas pu être restaurée.');
  };

  const port = SERVICE_PORTS[form.serviceType];

  return (
    <>
      <PageHeader
        title="Services"
        description="Instances de microservices connues du gateway, avec leur clé d’authentification."
      >
        <Button size="sm" variant="secondary" onPress={load} isPending={loading}>
          <RotateCcw className="size-3.5" aria-hidden />
          Actualiser
        </Button>
        <Button size="sm" onPress={openAdd}>
          <Plus className="size-3.5" aria-hidden />
          Ajouter une instance
        </Button>
      </PageHeader>

      {error && (
        <Alert status="danger" className="mb-5">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <SectionCard
        flush
        title="Instances enregistrées"
        description={
          `${instances.length} instance${instances.length > 1 ? 's' : ''} · ${counts.online} en ligne`
          + (counts.pending ? ` · ${counts.pending} en attente de connexion` : '')
          + (counts.down ? ` · ${counts.down} hors ligne` : '')
        }
      >
        {loading && instances.length === 0 ? (
          <TableSkeleton rows={5} cols={5} />
        ) : instances.length === 0 ? (
          <EmptyState
            icon={Server}
            title="Aucune instance"
            description="L’auto-enregistrement est désactivé : les instances doivent être ajoutées ici."
            action={
              <Button size="sm" onPress={openAdd}>
                <Plus className="size-3.5" aria-hidden />
                Ajouter une instance
              </Button>
            }
          />
        ) : (
          <TableShell
            minWidth={900}
            head={
              <>
                <Th>Instance</Th>
                <Th>Type</Th>
                <Th>Zone</Th>
                <Th>État</Th>
                <Th align="center">Active</Th>
                <Th align="right">Actions</Th>
              </>
            }
          >
            {grouped.map((s) => {
              const tone = health(s);
              return (
                <Tr key={s.id}>
                  <Td>
                    <p className="truncate text-sm font-medium">{s.id}</p>
                    <p className="truncate text-xs text-muted">{s.endpoint || '—'}</p>
                  </Td>
                  <Td>
                    <Chip size="sm" variant="soft"><Chip.Label>{s.serviceType}</Chip.Label></Chip>
                  </Td>
                  <Td><span className="text-sm text-muted">{s.location}</span></Td>
                  <Td>
                    <StatusDot tone={tone} label={healthLabel(s, tone)} pulse={tone === 'success'} />
                    {s.degraded && s.degradedReason && (
                      <p className="mt-0.5 truncate text-xs text-danger">{s.degradedReason}</p>
                    )}
                    {!s.lastHeartbeat && s.enabled && (
                      <p className="mt-0.5 text-xs text-muted">Aucun heartbeat reçu — clé installée ?</p>
                    )}
                  </Td>
                  <Td align="center">
                    <div className="flex justify-center">
                      <Toggle
                        isSelected={s.enabled}
                        onChange={(v) => toggle(s, v)}
                        label={`Activer ${s.id}`}
                      />
                    </div>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      {s.degraded && (
                        <RowAction
                          icon={RefreshCcw}
                          label="Remettre en service"
                          isDisabled={busyId === s.id}
                          onPress={() => restore(s)}
                        />
                      )}
                      <RowAction
                        icon={Pencil}
                        label="Modifier l’URL"
                        onPress={() => { setEditing(s); setEndpointDraft(s.endpoint); }}
                      />
                      <RowAction
                        icon={KeyRound}
                        label="Régénérer la clé"
                        isDisabled={busyId === s.id}
                        onPress={() => rotate(s)}
                      />
                      <RowAction
                        icon={Trash2}
                        label="Supprimer"
                        tone="danger"
                        onPress={() => setDeleting(s)}
                      />
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </TableShell>
        )}
      </SectionCard>

      {/* ── Ajout ── */}
      <Modal.Backdrop isOpen={addOpen} onOpenChange={setAddOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-accent/12 text-accent">
                <Server className="size-5" aria-hidden />
              </Modal.Icon>
              <Modal.Heading>Ajouter une instance</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="space-y-4">
              {formError && (
                <Alert status="danger">
                  <Alert.Content>
                    <Alert.Description>{formError}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  selectedKey={form.serviceType}
                  onSelectionChange={(k) => setForm((f) => ({ ...f, serviceType: String(k) }))}
                >
                  <Label>Type</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {types.map((t) => (
                        <ListBox.Item key={t} id={t} textValue={t}>
                          <Label>{t}</Label>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <Select
                  selectedKey={form.location}
                  onSelectionChange={(k) => setForm((f) => ({ ...f, location: String(k) }))}
                >
                  <Label>Zone</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {LOCATIONS.map((l) => (
                        <ListBox.Item key={l} id={l} textValue={l}>
                          <Label>{l}</Label>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>

              <TextField
                value={form.id}
                onChange={(v) => setForm((f) => ({ ...f, id: v }))}
                isRequired
              >
                <Label>Identifiant</Label>
                <Input placeholder={`${form.serviceType}-${form.location.toLowerCase()}-01`} autoComplete="off" />
                <Description>Lettres, chiffres, point, tiret ou souligné.</Description>
              </TextField>

              <TextField
                value={form.endpoint}
                onChange={(v) => setForm((f) => ({ ...f, endpoint: v }))}
                isRequired
              >
                <Label>URL de l’instance</Label>
                <Input
                  placeholder={`https://${form.serviceType}.alfychat.app`}
                  autoComplete="off"
                />
                <Description>
                  Nom de domaine obligatoire (pas d’IP). En local : http://localhost:{port ?? 3000}
                </Description>
              </TextField>

              <TextField
                value={form.domain}
                onChange={(v) => setForm((f) => ({ ...f, domain: v }))}
              >
                <Label>Domaine public</Label>
                <Input placeholder="Déduit de l’URL si vide" autoComplete="off" />
              </TextField>
            </Modal.Body>

            <Modal.Footer>
              <Button slot="close" variant="tertiary" isDisabled={saving}>Annuler</Button>
              <Button onPress={add} isPending={saving}>Ajouter</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* ── Modification d'URL ── */}
      <Modal.Backdrop isOpen={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>URL de {editing?.id}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <TextField value={endpointDraft} onChange={setEndpointDraft} isRequired>
                <Label>URL de l’instance</Label>
                <Input placeholder={`https://${editing?.serviceType ?? 'messages'}.alfychat.app`} autoComplete="off" />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">Annuler</Button>
              <Button onPress={saveEndpoint}>Enregistrer</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <ConfirmDialog
        isOpen={deleting !== null}
        title={`Supprimer ${deleting?.id ?? ''} ?`}
        description="L’instance ne recevra plus de trafic et sa clé sera révoquée. Son identifiant reste bloqué jusqu’au prochain redémarrage du gateway."
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />

      <ServiceKeyDialog issued={issued} onClose={() => setIssued(null)} />
    </>
  );
}
