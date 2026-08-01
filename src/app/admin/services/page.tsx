'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Chip, Input, Label, ListBox, Modal, Select, TextField,
} from '@heroui/react';
import {
  Copy, Eye, EyeOff, KeyRound, Pencil, Plus, RotateCcw, Server, Trash2,
} from 'lucide-react';

import { api } from '@/lib/api';
import {
  EmptyState, PageHeader, SectionCard, StatusDot, TableShell, TableSkeleton,
  Td, Th, Toggle, Tr,
} from '@/components/alfy/admin/primitives';

const SERVICE_TYPES = [
  'users', 'messages', 'friends', 'calls', 'servers', 'bots', 'media',
  'serverhosting', 'subscriptions',
];

const LOCATIONS = ['EU', 'NA', 'AS', 'SA', 'OC', 'AF'];

interface ServiceInstance {
  id: string;
  serviceType: string;
  endpoint: string;
  domain: string;
  location: string;
  healthy: boolean;
  enabled: boolean;
  degraded?: boolean;
  score?: number;
  lastHeartbeat: string;
}

const EMPTY_FORM = {
  id: '',
  serviceType: 'messages',
  endpoint: '',
  domain: '',
  location: 'EU',
};

function health(s: ServiceInstance): 'success' | 'warning' | 'danger' | 'muted' {
  if (!s.enabled) return 'muted';
  if (s.degraded || !s.healthy) return 'danger';
  const elapsed = Date.now() - new Date(s.lastHeartbeat).getTime();
  return elapsed > 600_000 ? 'danger' : elapsed > 90_000 ? 'warning' : 'success';
}

export default function AdminServicesPage() {
  const [instances, setInstances] = useState<ServiceInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);

  const [editing, setEditing] = useState<ServiceInstance | null>(null);
  const [endpointDraft, setEndpointDraft] = useState('');

  // Clé révélée une seule fois après rotation — jamais relisible ensuite
  const [rotated, setRotated] = useState<{ id: string; key: string } | null>(null);
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [rotatingId, setRotatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.getAdminServices();
    if (res.success && res.data) {
      setInstances((res.data as { instances?: ServiceInstance[] }).instances ?? []);
    } else {
      setError(res.error ?? 'Impossible de charger les instances.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.id.trim() || !form.endpoint.trim()) {
      setError('L’identifiant et l’URL sont obligatoires.');
      return;
    }
    setSaving(true);
    const res = await api.addAdminService(form);
    setSaving(false);

    if (!res.success) {
      setError(res.error ?? 'L’instance n’a pas pu être ajoutée.');
      return;
    }
    setAddOpen(false);
    setForm(EMPTY_FORM);
    load();
  };

  const toggle = async (s: ServiceInstance, enabled: boolean) => {
    setInstances((prev) => prev.map((i) => (i.id === s.id ? { ...i, enabled } : i)));
    const res = await api.patchAdminService(s.id, { enabled });
    if (!res.success) load();
  };

  const remove = async (s: ServiceInstance) => {
    const res = await api.deleteAdminService(s.id);
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
    setRotatingId(s.id);
    const res = await api.rotateAdminServiceKey(s.id);
    setRotatingId(null);

    const key = (res.data as { serviceKey?: string } | undefined)?.serviceKey;
    if (res.success && key) {
      setRotated({ id: s.id, key });
      setKeyVisible(false);
      setCopied(false);
    } else {
      setError(res.error ?? 'La clé n’a pas pu être régénérée.');
    }
  };

  const copyKey = async () => {
    if (!rotated) return;
    await navigator.clipboard.writeText(rotated.key);
    setCopied(true);
  };

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
        <Button size="sm" onPress={() => { setForm(EMPTY_FORM); setAddOpen(true); }}>
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
        description={`${instances.length} instance${instances.length > 1 ? 's' : ''}`}
      >
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : instances.length === 0 ? (
          <EmptyState
            icon={Server}
            title="Aucune instance"
            description="L’auto-enregistrement est désactivé : les instances doivent être ajoutées ici."
            action={
              <Button size="sm" onPress={() => setAddOpen(true)}>
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
            {instances.map((s) => {
              const tone = health(s);
              return (
                <Tr key={s.id}>
                  <Td>
                    <p className="truncate text-sm font-medium">{s.id}</p>
                    <p className="truncate text-xs text-muted">{s.endpoint}</p>
                  </Td>
                  <Td>
                    <Chip size="sm" variant="soft"><Chip.Label>{s.serviceType}</Chip.Label></Chip>
                  </Td>
                  <Td><span className="text-sm text-muted">{s.location}</span></Td>
                  <Td>
                    <StatusDot
                      tone={tone}
                      label={{ success: 'En ligne', warning: 'Inactif', danger: 'Hors ligne', muted: 'Désactivée' }[tone]}
                      pulse={tone === 'success'}
                    />
                    {s.degraded && (
                      <p className="mt-0.5 text-xs text-danger">Dégradée</p>
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
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label={`Modifier l'URL de ${s.id}`}
                        onPress={() => { setEditing(s); setEndpointDraft(s.endpoint); }}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label={`Régénérer la clé de ${s.id}`}
                        isPending={rotatingId === s.id}
                        onPress={() => rotate(s)}
                      >
                        <KeyRound className="size-4" aria-hidden />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label={`Supprimer ${s.id}`}
                        className="text-danger hover:bg-danger/10"
                        onPress={() => remove(s)}
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

      {/* ── Ajout ── */}
      <Modal.Backdrop isOpen={addOpen} onOpenChange={setAddOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[460px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-accent/12 text-accent">
                <Server className="size-5" aria-hidden />
              </Modal.Icon>
              <Modal.Heading>Ajouter une instance</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="space-y-4">
              <TextField
                value={form.id}
                onChange={(v) => setForm((f) => ({ ...f, id: v }))}
                isRequired
              >
                <Label>Identifiant</Label>
                <Input placeholder="messages-eu-01" autoComplete="off" />
              </TextField>

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
                      {SERVICE_TYPES.map((t) => (
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
                value={form.endpoint}
                onChange={(v) => setForm((f) => ({ ...f, endpoint: v }))}
                isRequired
              >
                <Label>URL interne</Label>
                <Input placeholder="http://10.0.0.12:3002" autoComplete="off" />
              </TextField>

              <TextField
                value={form.domain}
                onChange={(v) => setForm((f) => ({ ...f, domain: v }))}
              >
                <Label>Domaine public</Label>
                <Input placeholder="messages.alfychat.app" autoComplete="off" />
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
                <Label>URL interne</Label>
                <Input placeholder="http://10.0.0.12:3002" autoComplete="off" />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">Annuler</Button>
              <Button onPress={saveEndpoint}>Enregistrer</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* ── Clé régénérée ── */}
      <Modal.Backdrop isOpen={rotated !== null} onOpenChange={(o) => !o && setRotated(null)}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-warning/12 text-warning">
                <KeyRound className="size-5" aria-hidden />
              </Modal.Icon>
              <Modal.Heading>Nouvelle clé pour {rotated?.id}</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="space-y-3">
              <Alert status="warning">
                <Alert.Content>
                  <Alert.Description>
                    Cette clé n’est affichée qu’une fois. Copiez-la maintenant et
                    reportez-la dans la configuration de l’instance.
                  </Alert.Description>
                </Alert.Content>
              </Alert>

              <div className="flex items-center gap-2 rounded-md border border-border bg-surface-secondary p-2.5">
                <code className="min-w-0 flex-1 truncate font-mono text-xs">
                  {keyVisible ? rotated?.key : '•'.repeat(48)}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label={keyVisible ? 'Masquer la clé' : 'Afficher la clé'}
                  onPress={() => setKeyVisible((v) => !v)}
                >
                  {keyVisible
                    ? <EyeOff className="size-4" aria-hidden />
                    : <Eye className="size-4" aria-hidden />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label="Copier la clé"
                  onPress={copyKey}
                >
                  <Copy className="size-4" aria-hidden />
                </Button>
              </div>

              {copied && <p className="text-xs text-success">Clé copiée dans le presse-papiers.</p>}
            </Modal.Body>

            <Modal.Footer>
              <Button slot="close">J’ai copié la clé</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
