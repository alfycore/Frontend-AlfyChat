'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Chip, Input, Label, ListBox, Modal, Select, Tabs, TextField,
} from '@heroui/react';
import {
  Globe, KeyRound, Network, Plus, RefreshCcw, RotateCcw, Trash2,
} from 'lucide-react';

import { api } from '@/lib/api';
import {
  EmptyState, PageHeader, SectionCard, StatusDot, TableShell, TableSkeleton,
  Td, Th, Toggle, Tr,
} from '@/components/alfy/admin/primitives';
import { ConfirmDialog } from '@/components/alfy/admin/confirm-dialog';
import { ServiceKeyDialog, type IssuedServiceKey } from '@/components/alfy/admin/service-key-dialog';
import { LOCATIONS, SERVICE_TYPES } from '@/components/alfy/admin/service-types';

interface LBGateway {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  online?: boolean;
  isSelf?: boolean;
}

interface LBService {
  id: string;
  serviceType: string;
  location: string;
  endpoint?: string;
  enabled: boolean;
  degraded?: boolean;
  status?: 'online' | 'degraded' | 'offline';
  lastHeartbeat?: string | null;
}

function serviceTone(s: LBService): { tone: 'success' | 'warning' | 'danger' | 'muted'; label: string } {
  if (!s.enabled) return { tone: 'muted', label: 'Désactivé' };
  if (s.degraded) return { tone: 'danger', label: 'Dégradé' };
  if (s.status === 'online') return { tone: 'success', label: 'En ligne' };
  // Aucun heartbeat depuis le démarrage du gateway (clé absente ou instance arrêtée)
  if (!s.lastHeartbeat) return { tone: 'warning', label: 'En attente' };
  return { tone: 'danger', label: 'Hors ligne' };
}

export default function AdminInfrastructurePage() {
  const [gateways, setGateways] = useState<LBGateway[]>([]);
  const [services, setServices] = useState<LBService[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [gwOpen, setGwOpen]     = useState(false);
  const [gwForm, setGwForm]     = useState({ id: '', name: '', url: '' });
  const [svcOpen, setSvcOpen]   = useState(false);
  const [svcForm, setSvcForm]   = useState({ id: '', serviceType: 'messages', location: 'EU' });
  const [saving, setSaving]     = useState(false);

  const [issued, setIssued]     = useState<IssuedServiceKey | null>(null);
  const [deleting, setDeleting] = useState<{ kind: 'gateway' | 'service'; id: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [gwRes, svcRes] = await Promise.all([api.getLBGateways(), api.getLBServices()]);

    if (gwRes.success && gwRes.data) setGateways((gwRes.data.gateways ?? []) as LBGateway[]);
    // Le gateway renvoie { instances } : lire `services` laissait l'onglet toujours vide
    if (svcRes.success && svcRes.data) setServices((svcRes.data.instances ?? []) as LBService[]);
    if (!gwRes.success || !svcRes.success) {
      setError(gwRes.error ?? svcRes.error ?? 'Impossible de charger le load balancer.');
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addGateway = async () => {
    if (!gwForm.id.trim() || !gwForm.url.trim()) {
      setError('L’identifiant et l’URL sont obligatoires.');
      return;
    }
    setSaving(true);
    const res = await api.addLBGateway(gwForm);
    setSaving(false);
    if (res.success) { setGwOpen(false); setGwForm({ id: '', name: '', url: '' }); load(); }
    else setError(res.error ?? 'Le gateway n’a pas pu être ajouté.');
  };

  const addService = async () => {
    if (!svcForm.id.trim()) {
      setError('L’identifiant est obligatoire.');
      return;
    }
    setSaving(true);
    const id = svcForm.id.trim();
    const res = await api.addLBService({ ...svcForm, id });
    setSaving(false);
    if (res.success) {
      setSvcOpen(false);
      setSvcForm({ id: '', serviceType: 'messages', location: 'EU' });
      if (res.data?.serviceKey) setIssued({ id, key: res.data.serviceKey, created: true });
      load();
    } else {
      setError(res.error ?? 'Le service n’a pas pu être ajouté.');
    }
  };

  const rotateKey = async (s: LBService) => {
    const res = await api.rotateLBServiceKey(s.id);
    const key = res.data?.serviceKey;
    if (res.success && key) setIssued({ id: s.id, key, endpoint: s.endpoint });
    else setError(res.error ?? 'La clé n’a pas pu être régénérée.');
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const res = deleting.kind === 'gateway'
      ? await api.deleteLBGateway(deleting.id)
      : await api.deleteLBService(deleting.id);
    setDeleting(null);
    if (res.success) load();
    else setError(res.error ?? 'La suppression a échoué.');
  };

  return (
    <>
      <PageHeader
        title="Load balancer"
        description="Instances de gateway et services déclarés pour la répartition de charge."
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

      <Tabs defaultSelectedKey="gateways">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Sections du load balancer">
            <Tabs.Tab id="gateways">
              <Globe className="size-3.5" aria-hidden />
              Gateways
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="services">
              <Network className="size-3.5" aria-hidden />
              Services
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* ── Gateways ── */}
        <Tabs.Panel id="gateways" className="pt-4">
          <SectionCard
            flush
            title="Instances de gateway"
            description={`${gateways.length} instance${gateways.length > 1 ? 's' : ''}`}
            actions={
              <Button size="sm" onPress={() => setGwOpen(true)}>
                <Plus className="size-3.5" aria-hidden />
                Ajouter
              </Button>
            }
          >
            {loading ? (
              <TableSkeleton rows={3} cols={4} />
            ) : gateways.length === 0 ? (
              <EmptyState
                icon={Globe}
                title="Aucun gateway déclaré"
                description="Déclarez au moins une instance pour répartir le trafic."
              />
            ) : (
              <TableShell
                minWidth={680}
                head={
                  <>
                    <Th>Gateway</Th>
                    <Th>URL</Th>
                    <Th>État</Th>
                    <Th align="center">Actif</Th>
                    <Th align="right">Action</Th>
                  </>
                }
              >
                {gateways.map((g) => (
                  <Tr key={g.id}>
                    <Td>
                      <p className="truncate text-sm font-medium">{g.name || g.id}</p>
                      <p className="truncate text-xs text-muted">{g.id}</p>
                    </Td>
                    <Td><code className="text-xs text-muted">{g.url}</code></Td>
                    <Td>
                      <StatusDot
                        tone={!g.enabled ? 'muted' : g.online ? 'success' : 'danger'}
                        label={!g.enabled ? 'Désactivé' : g.online ? (g.isSelf ? 'En ligne · ce gateway' : 'En ligne') : 'Hors ligne'}
                        pulse={g.enabled && !!g.online}
                      />
                    </Td>
                    <Td align="center">
                      <div className="flex justify-center">
                        <Toggle
                          isSelected={g.enabled}
                          onChange={async (v) => {
                            setGateways((p) => p.map((x) => (x.id === g.id ? { ...x, enabled: v } : x)));
                            const res = await api.patchLBGateway(g.id, { enabled: v });
                            if (!res.success) { setError(res.error ?? 'Le gateway n’a pas pu être modifié.'); load(); }
                          }}
                          label={`Activer ${g.name || g.id}`}
                        />
                      </div>
                    </Td>
                    <Td align="right">
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label={`Supprimer ${g.id}`}
                        className="text-danger hover:bg-danger/10"
                        isDisabled={g.isSelf}
                        onPress={() => setDeleting({ kind: 'gateway', id: g.id })}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TableShell>
            )}
          </SectionCard>
        </Tabs.Panel>

        {/* ── Services ── */}
        <Tabs.Panel id="services" className="pt-4">
          <SectionCard
            flush
            title="Services déclarés"
            description={`${services.length} service${services.length > 1 ? 's' : ''}`}
            actions={
              <Button size="sm" onPress={() => setSvcOpen(true)}>
                <Plus className="size-3.5" aria-hidden />
                Ajouter
              </Button>
            }
          >
            {loading ? (
              <TableSkeleton rows={3} cols={4} />
            ) : services.length === 0 ? (
              <EmptyState icon={Network} title="Aucun service déclaré" />
            ) : (
              <TableShell
                minWidth={760}
                head={
                  <>
                    <Th>Service</Th>
                    <Th>Type</Th>
                    <Th>Zone</Th>
                    <Th>État</Th>
                    <Th align="center">Actif</Th>
                    <Th align="right">Actions</Th>
                  </>
                }
              >
                {services.map((s) => {
                  const st = serviceTone(s);
                  return (
                  <Tr key={s.id}>
                    <Td>
                      <p className="truncate text-sm font-medium">{s.id}</p>
                      {s.endpoint && (
                        <p className="truncate text-xs text-muted">{s.endpoint}</p>
                      )}
                    </Td>
                    <Td>
                      <Chip size="sm" variant="soft"><Chip.Label>{s.serviceType}</Chip.Label></Chip>
                    </Td>
                    <Td><span className="text-sm text-muted">{s.location}</span></Td>
                    <Td>
                      <StatusDot tone={st.tone} label={st.label} pulse={st.tone === 'success'} />
                    </Td>
                    <Td align="center">
                      <div className="flex justify-center">
                        <Toggle
                          isSelected={s.enabled}
                          onChange={async (v) => {
                            setServices((p) => p.map((x) => (x.id === s.id ? { ...x, enabled: v } : x)));
                            const res = await api.patchLBService(s.id, { enabled: v });
                            if (!res.success) { setError(res.error ?? 'Le service n’a pas pu être modifié.'); load(); }
                          }}
                          label={`Activer ${s.id}`}
                        />
                      </div>
                    </Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        {s.degraded && (
                          <Button
                            size="sm"
                            variant="ghost"
                            isIconOnly
                            aria-label={`Restaurer ${s.id}`}
                            onPress={async () => {
                              const res = await api.restoreLBService(s.id);
                              if (res.success) load();
                            }}
                          >
                            <RefreshCcw className="size-4" aria-hidden />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          isIconOnly
                          aria-label={`Régénérer la clé de ${s.id}`}
                          onPress={() => rotateKey(s)}
                        >
                          <KeyRound className="size-4" aria-hidden />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          isIconOnly
                          aria-label={`Supprimer ${s.id}`}
                          className="text-danger hover:bg-danger/10"
                          onPress={() => setDeleting({ kind: 'service', id: s.id })}
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
        </Tabs.Panel>
      </Tabs>

      {/* ── Ajout gateway ── */}
      <Modal.Backdrop isOpen={gwOpen} onOpenChange={setGwOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-accent/12 text-accent">
                <Globe className="size-5" aria-hidden />
              </Modal.Icon>
              <Modal.Heading>Ajouter un gateway</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              <TextField
                value={gwForm.id}
                onChange={(v) => setGwForm((f) => ({ ...f, id: v }))}
                isRequired
              >
                <Label>Identifiant</Label>
                <Input placeholder="gateway-eu-01" autoComplete="off" />
              </TextField>
              <TextField
                value={gwForm.name}
                onChange={(v) => setGwForm((f) => ({ ...f, name: v }))}
              >
                <Label>Nom affiché</Label>
                <Input placeholder="Gateway Europe" autoComplete="off" />
              </TextField>
              <TextField
                value={gwForm.url}
                onChange={(v) => setGwForm((f) => ({ ...f, url: v }))}
                isRequired
              >
                <Label>URL</Label>
                <Input placeholder="https://eu.alfychat.app" autoComplete="off" />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary" isDisabled={saving}>Annuler</Button>
              <Button onPress={addGateway} isPending={saving}>Ajouter</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* ── Ajout service ── */}
      <Modal.Backdrop isOpen={svcOpen} onOpenChange={setSvcOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-accent/12 text-accent">
                <Network className="size-5" aria-hidden />
              </Modal.Icon>
              <Modal.Heading>Ajouter un service</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              <TextField
                value={svcForm.id}
                onChange={(v) => setSvcForm((f) => ({ ...f, id: v }))}
                isRequired
              >
                <Label>Identifiant</Label>
                <Input placeholder="messages-eu-01" autoComplete="off" />
              </TextField>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  selectedKey={svcForm.serviceType}
                  onSelectionChange={(k) => setSvcForm((f) => ({ ...f, serviceType: String(k) }))}
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
                  selectedKey={svcForm.location}
                  onSelectionChange={(k) => setSvcForm((f) => ({ ...f, location: String(k) }))}
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
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary" isDisabled={saving}>Annuler</Button>
              <Button onPress={addService} isPending={saving}>Ajouter</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <ConfirmDialog
        isOpen={deleting !== null}
        title={`Supprimer ${deleting?.id ?? ''} ?`}
        description={deleting?.kind === 'gateway'
          ? 'Ce gateway ne fera plus partie de la répartition de charge.'
          : 'Le service et sa clé seront supprimés : l’instance ne pourra plus se connecter.'}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />

      <ServiceKeyDialog issued={issued} onClose={() => setIssued(null)} />
    </>
  );
}
