'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  ServerIcon, PlusIcon, Trash2Icon, RefreshCwIcon, KeyIcon,
  CopyIcon, EyeIcon, EyeOffIcon, CheckCircle2Icon, XCircleIcon,
  XIcon, Edit2Icon,
} from '@/components/icons';
import { api } from '@/lib/api';

type ServiceStatus = 'online' | 'degraded' | 'offline';
type ServiceType   = 'users' | 'messages' | 'friends' | 'calls' | 'servers' | 'bots' | 'media';

interface GatewayEntry {
  id: string; name: string; url: string; enabled: boolean;
  online: boolean; isSelf: boolean; lastSeen: string;
}

interface ServiceEntry {
  id: string; serviceType: ServiceType; endpoint: string; domain: string;
  location: string; status: ServiceStatus; enabled: boolean; healthy: boolean;
  score: number; degraded: boolean; degradedReason?: string; gatewayId?: string;
  lastHeartbeat: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status, healthy }: { status: ServiceStatus; healthy: boolean }) {
  if (status === 'online' && healthy)
    return <Badge className="bg-green-600/15 text-green-400 border-green-600/30">En ligne</Badge>;
  if (status === 'degraded')
    return <Badge className="bg-yellow-600/15 text-yellow-400 border-yellow-600/30">Dégradé</Badge>;
  return <Badge className="bg-red-600/15 text-red-400 border-red-600/30">Hors ligne</Badge>;
}

function GatewayDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-block size-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`} />
  );
}

function KeyDisplay({ value, onCopy }: { value: string; onCopy: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs">
      <span className="flex-1 break-all">{show ? value : '•'.repeat(Math.min(value.length, 40))}</span>
      <button onClick={() => setShow(v => !v)} className="text-muted-foreground hover:text-foreground shrink-0">
        {show ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
      </button>
      <button onClick={onCopy} className="text-muted-foreground hover:text-foreground shrink-0">
        <CopyIcon className="size-3.5" />
      </button>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function LBPanel() {
  const [gateways, setGateways]       = useState<GatewayEntry[]>([]);
  const [services, setServices]       = useState<ServiceEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeSection, setSection]   = useState<'gateways' | 'services'>('gateways');

  // Gateway form
  const [showGwDialog, setShowGwDialog]   = useState(false);
  const [editingGw, setEditingGw]         = useState<GatewayEntry | null>(null);
  const [gwForm, setGwForm]               = useState({ id: '', name: '', url: '' });
  const [gwSubmitting, setGwSubmitting]   = useState(false);
  const [gwError, setGwError]             = useState('');

  // Service form
  const [showSvcDialog, setShowSvcDialog] = useState(false);
  const [svcForm, setSvcForm]             = useState({ id: '', serviceType: 'users' as ServiceType, location: 'EU' });
  const [svcSubmitting, setSvcSubmitting] = useState(false);
  const [svcError, setSvcError]           = useState('');

  // Key display
  const [newKey, setNewKey]               = useState<{ serviceId: string; key: string } | null>(null);
  const [keyCopied, setKeyCopied]         = useState(false);

  const SERVICE_TYPES: ServiceType[] = ['users','messages','friends','calls','servers','bots','media'];
  const LOCATIONS = ['EU','US','ASIA','AU'];

  const load = useCallback(async () => {
    setLoading(true);
    const [gr, sr] = await Promise.all([api.getLBGateways(), api.getLBServices()]);
    if (gr.success && gr.data) setGateways((gr.data as any).gateways ?? []);
    if (sr.success && sr.data) setServices((sr.data as any).instances ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key).catch(() => {});
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  // ── Gateway CRUD ─────────────────────────────────────────────────────────

  const openAddGateway = () => {
    setEditingGw(null);
    setGwForm({ id: '', name: '', url: '' });
    setGwError('');
    setShowGwDialog(true);
  };

  const openEditGateway = (gw: GatewayEntry) => {
    setEditingGw(gw);
    setGwForm({ id: gw.id, name: gw.name, url: gw.url });
    setGwError('');
    setShowGwDialog(true);
  };

  const submitGateway = async () => {
    if (!gwForm.name.trim() || !gwForm.url.trim()) { setGwError('Nom et URL requis'); return; }
    if (!editingGw && !gwForm.id.trim()) { setGwError('ID requis'); return; }
    setGwSubmitting(true); setGwError('');
    try {
      if (editingGw) {
        await api.patchLBGateway(editingGw.id, { name: gwForm.name, url: gwForm.url });
        setGateways(prev => prev.map(g => g.id === editingGw.id ? { ...g, name: gwForm.name, url: gwForm.url } : g));
      } else {
        const r = await api.addLBGateway({ id: gwForm.id, name: gwForm.name, url: gwForm.url });
        if (!r.success) { setGwError((r as any).error ?? 'Erreur'); return; }
        await load();
      }
      setShowGwDialog(false);
    } finally { setGwSubmitting(false); }
  };

  const deleteGateway = async (id: string) => {
    if (!confirm(`Supprimer le gateway "${id}" ?`)) return;
    await api.deleteLBGateway(id);
    setGateways(prev => prev.filter(g => g.id !== id));
  };

  const toggleGateway = async (id: string, enabled: boolean) => {
    await api.patchLBGateway(id, { enabled });
    setGateways(prev => prev.map(g => g.id === id ? { ...g, enabled } : g));
  };

  // ── Service CRUD ──────────────────────────────────────────────────────────

  const submitService = async () => {
    if (!svcForm.id.trim()) { setSvcError('ID requis'); return; }
    setSvcSubmitting(true); setSvcError('');
    try {
      const r = await api.addLBService(svcForm);
      if (!r.success) { setSvcError((r as any).error ?? 'Erreur'); return; }
      const key = (r.data as any)?.serviceKey ?? '';
      setNewKey({ serviceId: svcForm.id, key });
      setShowSvcDialog(false);
      await load();
    } finally { setSvcSubmitting(false); }
  };

  const deleteService = async (id: string) => {
    if (!confirm(`Supprimer le service "${id}" ? Le microservice ne pourra plus s'enregistrer.`)) return;
    await api.deleteLBService(id);
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const rotateKey = async (id: string) => {
    if (!confirm(`Régénérer la clé pour "${id}" ? La clé actuelle sera invalide immédiatement.`)) return;
    const r = await api.rotateLBServiceKey(id);
    if (r.success && (r.data as any)?.serviceKey) {
      setNewKey({ serviceId: id, key: (r.data as any).serviceKey });
    }
  };

  const toggleService = async (id: string, enabled: boolean) => {
    await api.patchLBService(id, { enabled });
    setServices(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Infrastructure & Load Balancing</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gérez les gateways et les microservices enregistrés
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCwIcon className="size-3.5" /> Actualiser
        </Button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 border-b border-border">
        {(['gateways', 'services'] as const).map(s => (
          <button key={s} onClick={() => setSection(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSection === s ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {s === 'gateways' ? `Gateways (${gateways.length})` : `Services (${services.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="size-6 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
        </div>
      ) : activeSection === 'gateways' ? (

        /* ── GATEWAYS ── */
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openAddGateway}><PlusIcon className="size-3.5" /> Ajouter gateway</Button>
          </div>

          {gateways.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
              Aucun gateway configuré.
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {gateways.map(gw => (
                <Card key={gw.id} className={!gw.enabled ? 'opacity-60' : ''}>
                  <CardContent className="py-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <GatewayDot online={gw.online && gw.enabled} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{gw.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{gw.id}</p>
                        </div>
                        {gw.isSelf && <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">SELF</Badge>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!gw.isSelf && (
                          <>
                            <button onClick={() => openEditGateway(gw)} className="text-muted-foreground hover:text-foreground p-1">
                              <Edit2Icon className="size-3.5" />
                            </button>
                            <button onClick={() => deleteGateway(gw.id)} className="text-muted-foreground hover:text-destructive p-1">
                              <Trash2Icon className="size-3.5" />
                            </button>
                          </>
                        )}
                        <Switch checked={gw.enabled} onCheckedChange={v => toggleGateway(gw.id, v)} disabled={gw.isSelf} />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground font-mono truncate">{gw.url}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {gw.online ? 'Vu il y a < 2 min' : 'Hors ligne'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

      ) : (

        /* ── SERVICES ── */
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              Créez un slot → copiez la clé → ajoutez <code className="bg-muted px-1 rounded text-xs">SERVICE_KEY=sk_...</code> dans le .env du microservice
            </p>
            <Button size="sm" onClick={() => { setSvcForm({ id: '', serviceType: 'users', location: 'EU' }); setSvcError(''); setShowSvcDialog(true); }}>
              <PlusIcon className="size-3.5" /> Créer service
            </Button>
          </div>

          {services.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
              Aucun service enregistré.
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {services.map(svc => (
                <Card key={svc.id} className={!svc.enabled ? 'opacity-60' : ''}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusBadge status={svc.status} healthy={svc.healthy} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{svc.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {svc.serviceType.toUpperCase()} · {svc.location}
                            {svc.gatewayId && <> · via <span className="font-mono">{svc.gatewayId}</span></>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => rotateKey(svc.id)} title="Rotation de clé"
                          className="text-muted-foreground hover:text-foreground p-1">
                          <KeyIcon className="size-3.5" />
                        </button>
                        <button onClick={() => deleteService(svc.id)}
                          className="text-muted-foreground hover:text-destructive p-1">
                          <Trash2Icon className="size-3.5" />
                        </button>
                        <Switch checked={svc.enabled} onCheckedChange={v => toggleService(svc.id, v)} />
                      </div>
                    </div>
                    {svc.endpoint && (
                      <p className="mt-1.5 text-xs text-muted-foreground font-mono truncate">{svc.endpoint}</p>
                    )}
                    {svc.degraded && svc.degradedReason && (
                      <p className="mt-1 text-xs text-yellow-500 truncate">⚠ {svc.degradedReason}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary/60 transition-all"
                          style={{ width: `${Math.round(svc.score)}%` }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground w-8 text-right">{Math.round(svc.score)}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Dialog: Nouvelle clé générée ── */}
      {newKey && (
        <Dialog open onOpenChange={() => setNewKey(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clé générée pour {newKey.serviceId}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Copiez cette clé et ajoutez-la dans le <code className="bg-muted px-1 rounded">.env</code> du microservice.
                Elle ne sera plus affichée après la fermeture de cette fenêtre.
              </p>
              <KeyDisplay value={newKey.key} onCopy={() => copyKey(newKey.key)} />
              {keyCopied && <p className="text-xs text-green-500">Copié !</p>}
              <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs font-mono">
                SERVICE_KEY={newKey.key}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { copyKey(newKey.key); }}>
                <CopyIcon className="size-3.5" /> Copier la clé
              </Button>
              <Button variant="outline" onClick={() => setNewKey(null)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Dialog: Ajouter/Éditer gateway ── */}
      <Dialog open={showGwDialog} onOpenChange={setShowGwDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGw ? `Modifier ${editingGw.id}` : 'Ajouter un gateway'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {!editingGw && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">ID unique</label>
                <Input value={gwForm.id} onChange={e => setGwForm(f => ({ ...f, id: e.target.value }))}
                  placeholder="gateway-eu-2" />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nom</label>
              <Input value={gwForm.name} onChange={e => setGwForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Gateway Europe 2" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">URL publique</label>
              <Input value={gwForm.url} onChange={e => setGwForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://gateway2.alfychat.app" />
            </div>
            {gwError && <p className="text-xs text-destructive">{gwError}</p>}
          </div>
          <DialogFooter>
            <Button onClick={submitGateway} disabled={gwSubmitting}>
              {gwSubmitting ? 'Enregistrement...' : (editingGw ? 'Mettre à jour' : 'Ajouter')}
            </Button>
            <Button variant="outline" onClick={() => setShowGwDialog(false)}>Annuler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Créer un service ── */}
      <Dialog open={showSvcDialog} onOpenChange={setShowSvcDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un microservice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">ID unique</label>
              <Input value={svcForm.id} onChange={e => setSvcForm(f => ({ ...f, id: e.target.value }))}
                placeholder="users-eu-2" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type de service</label>
              <select value={svcForm.serviceType}
                onChange={e => setSvcForm(f => ({ ...f, serviceType: e.target.value as ServiceType }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Localisation</label>
              <select value={svcForm.location}
                onChange={e => setSvcForm(f => ({ ...f, location: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            {svcError && <p className="text-xs text-destructive">{svcError}</p>}
            <p className="text-xs text-muted-foreground">
              Une clé <code className="bg-muted px-1 rounded">sk_...</code> sera générée. Copiez-la dans
              le <code className="bg-muted px-1 rounded">.env</code> du microservice.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={submitService} disabled={svcSubmitting}>
              {svcSubmitting ? 'Création...' : 'Créer & générer la clé'}
            </Button>
            <Button variant="outline" onClick={() => setShowSvcDialog(false)}>Annuler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
