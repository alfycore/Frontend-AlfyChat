'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Chip, Input, Label, ListBox, Modal, Select, Tabs, TextField,
} from '@heroui/react';
import {
  Copy, Globe, KeyRound, Network, Plus, RefreshCcw, RotateCcw, Trash2,
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

interface LBGateway {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  healthy?: boolean;
}

interface LBService {
  id: string;
  serviceType: string;
  location: string;
  endpoint?: string;
  enabled: boolean;
  degraded?: boolean;
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

  const [rotated, setRotated]   = useState<{ id: string; key: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [gwRes, svcRes] = await Promise.all([api.getLBGateways(), api.getLBServices()]);

    if (gwRes.success && gwRes.data) {
      const d = gwRes.data as LBGateway[] | { gateways?: LBGateway[] };
      setGateways(Array.isArray(d) ? d : (d.gateways ?? []));
    }
    if (svcRes.success && svcRes.data) {
      const d = svcRes.data as LBService[] | { services?: LBService[] };
      setServices(Array.isArray(d) ? d : (d.services ?? []));
    }
    if (!gwRes.success) setError(gwRes.error ?? 'Impossible de charger le load balancer.');

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
    const res = await api.addLBService(svcForm);
    setSaving(false);
    if (res.success) {
      setSvcOpen(false);
      setSvcForm({ id: '', serviceType: 'messages', location: 'EU' });
      load();
    } else {
      setError(res.error ?? 'Le service n’a pas pu être ajouté.');
    }
  };

  const rotateKey = async (s: LBService) => {
    const res = await api.rotateLBServiceKey(s.id);
    const key = (res.data as { serviceKey?: string } | undefined)?.serviceKey;
    if (res.success && key) setRotated({ id: s.id, key });
    else setError(res.error ?? 'La clé n’a pas pu être régénérée.');
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
                        tone={!g.enabled ? 'muted' : g.healthy === false ? 'danger' : 'success'}
                        label={!g.enabled ? 'Désactivé' : g.healthy === false ? 'Hors ligne' : 'En ligne'}
                        pulse={g.enabled && g.healthy !== false}
                      />
                    </Td>
                    <Td align="center">
                      <div className="flex justify-center">
                        <Toggle
                          isSelected={g.enabled}
                          onChange={async (v) => {
                            setGateways((p) => p.map((x) => (x.id === g.id ? { ...x, enabled: v } : x)));
                            await api.patchLBGateway(g.id, { enabled: v });
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
                        onPress={async () => {
                          const res = await api.deleteLBGateway(g.id);
                          if (res.success) load();
                        }}
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
                {services.map((s) => (
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
                      <StatusDot
                        tone={!s.enabled ? 'muted' : s.degraded ? 'danger' : 'success'}
                        label={!s.enabled ? 'Désactivé' : s.degraded ? 'Dégradé' : 'Sain'}
                        pulse={s.enabled && !s.degraded}
                      />
                    </Td>
                    <Td align="center">
                      <div className="flex justify-center">
                        <Toggle
                          isSelected={s.enabled}
                          onChange={async (v) => {
                            setServices((p) => p.map((x) => (x.id === s.id ? { ...x, enabled: v } : x)));
                            await api.patchLBService(s.id, { enabled: v });
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
                          onPress={async () => {
                            const res = await api.deleteLBService(s.id);
                            if (res.success) load();
                          }}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
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
                    Affichée une seule fois — copiez-la avant de fermer.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
              <div className="flex items-center gap-2 rounded-md border border-border bg-surface-secondary p-2.5">
                <code className="min-w-0 flex-1 truncate font-mono text-xs">{rotated?.key}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label="Copier la clé"
                  onPress={() => rotated && navigator.clipboard.writeText(rotated.key)}
                >
                  <Copy className="size-4" aria-hidden />
                </Button>
              </div>
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
