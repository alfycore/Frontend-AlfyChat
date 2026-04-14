'use client';

import { useState, useEffect } from 'react';
import { hostingApi, StorageNodeDb, StorageNodeMedia, HostingOffer, ApiKey } from '@/lib/hosting-api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';

type Tab = 'overview' | 'nodes-db' | 'nodes-media' | 'offers' | 'apikeys';

const STATUS_COLOR: Record<string, string> = {
  online: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  offline: 'bg-red-500/20 text-red-400 border-red-500/30',
  maintenance: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  pending: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export default function HosterPanelPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dbNodes, setDbNodes] = useState<StorageNodeDb[]>([]);
  const [mediaNodes, setMediaNodes] = useState<StorageNodeMedia[]>([]);
  const [offers, setOffers] = useState<HostingOffer[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

  useEffect(() => {
    loadPanel();
  }, []);

  async function loadPanel() {
    setLoading(true);
    try {
      const [prov, dbn, medn, offr, keys] = await Promise.all([
        hostingApi.getMe().catch(() => null),
        hostingApi.listDbNodes().catch(() => []),
        hostingApi.listMediaNodes().catch(() => []),
        hostingApi.listOffers().catch(() => []),
        hostingApi.listApiKeys().catch(() => []),
      ]);
      setProvider((prov as any)?.data ?? prov);
      setDbNodes(Array.isArray((dbn as any)?.data) ? (dbn as any).data : (Array.isArray(dbn) ? dbn : []));
      setMediaNodes(Array.isArray((medn as any)?.data) ? (medn as any).data : (Array.isArray(medn) ? medn : []));
      setOffers(Array.isArray((offr as any)?.data) ? (offr as any).data : (Array.isArray(offr) ? offr as HostingOffer[] : []));
      setApiKeys(Array.isArray((keys as any)?.data) ? (keys as any).data : (Array.isArray(keys) ? keys as ApiKey[] : []));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <PanelSkeleton />;

  if (!provider) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-center">
        <div>
          <i className="bi bi-server text-5xl text-muted-foreground block mb-4" />
          <h2 className="text-xl font-bold mb-2">Compte hébergeur introuvable</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Vous n'avez pas encore de compte hébergeur ou votre clé API est invalide.
          </p>
          <Link href="/hosting/panel/register">
            <Button className="bg-indigo-600 hover:bg-indigo-700">S'inscrire comme hébergeur</Button>
          </Link>
        </div>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: string; count?: number }[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: 'grid' },
    { id: 'nodes-db', label: 'Nœuds DB', icon: 'database', count: dbNodes.length },
    { id: 'nodes-media', label: 'Nœuds Media', icon: 'hdd-fill', count: mediaNodes.length },
    { id: 'offers', label: 'Offres', icon: 'box', count: offers.length },
    { id: 'apikeys', label: 'Clés API', icon: 'key', count: apiKeys.length },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/2 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
              <i className="bi bi-server text-indigo-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg">{provider.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[provider.status] || STATUS_COLOR.pending}`}>
                {provider.status}
              </span>
            </div>
          </div>
          <Link href="/hosting">
            <Button variant="outline" size="sm">Voir la marketplace</Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Navigation onglets */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <i className={`bi bi-${t.icon}`} />
              {t.label}
              {t.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-white/10'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contenu */}
        {tab === 'overview' && <OverviewTab provider={provider} dbNodes={dbNodes} mediaNodes={mediaNodes} offers={offers} />}
        {tab === 'nodes-db' && <DbNodesTab nodes={dbNodes} onRefresh={loadPanel} />}
        {tab === 'nodes-media' && <MediaNodesTab nodes={mediaNodes} onRefresh={loadPanel} />}
        {tab === 'offers' && <OffersTab offers={offers} onRefresh={loadPanel} />}
        {tab === 'apikeys' && <ApiKeysTab keys={apiKeys} onRefresh={loadPanel} />}
      </div>
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

function OverviewTab({ provider, dbNodes, mediaNodes, offers }: any) {
  const onlineDb = dbNodes.filter((n: any) => n.status === 'online').length;
  const onlineMedia = mediaNodes.filter((n: any) => n.status === 'online').length;
  const totalCapacityDb = dbNodes.reduce((s: number, n: any) => s + (n.capacity_gb || 0), 0);
  const totalUsedDb = dbNodes.reduce((s: number, n: any) => s + (n.used_gb || 0), 0);
  const totalCapacityMedia = mediaNodes.reduce((s: number, n: any) => s + (n.capacity_gb || 0), 0);
  const totalUsedMedia = mediaNodes.reduce((s: number, n: any) => s + (n.used_gb || 0), 0);

  return (
    <div className="space-y-6">
      {provider.status === 'pending' && (
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4 flex items-start gap-3">
          <i className="bi bi-clock text-yellow-400 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-300">Validation en attente</p>
            <p className="text-sm text-yellow-400/80 mt-0.5">
              Votre compte est en cours d'examen par les admins AlfyChat. Vous serez notifié par email.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="database" label="Nœuds DB" value={`${onlineDb}/${dbNodes.length}`} sub="en ligne" color="blue" />
        <StatCard icon="hdd-fill" label="Nœuds Media" value={`${onlineMedia}/${mediaNodes.length}`} sub="en ligne" color="purple" />
        <StatCard icon="box" label="Offres actives" value={offers.filter((o: any) => o.is_active !== false).length} sub="publiées" color="emerald" />
        <StatCard icon="hdd-stack" label="Capacité DB" value={`${totalUsedDb.toFixed(0)}/${totalCapacityDb.toFixed(0)} Go`} sub="utilisé" color="orange" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StorageBar label="Stockage DB" used={totalUsedDb} total={totalCapacityDb} color="blue" />
        <StorageBar label="Stockage Media" used={totalUsedMedia} total={totalCapacityMedia} color="purple" />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: any) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    orange: 'bg-orange-500/10 text-orange-400',
  };
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="pt-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
          <i className={`bi bi-${icon}`} />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label} <span className="opacity-60">— {sub}</span></div>
      </CardContent>
    </Card>
  );
}

function StorageBar({ label, used, total, color }: { label: string; used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const barColor = color === 'blue' ? 'bg-blue-500' : 'bg-purple-500';
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="pt-4">
        <div className="flex justify-between text-sm mb-2">
          <span>{label}</span>
          <span className="text-muted-foreground">{used.toFixed(1)} / {total.toFixed(1)} Go</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(1)}% utilisé</p>
      </CardContent>
    </Card>
  );
}

// ── Nœuds DB ─────────────────────────────────────────────────────────────────

function DbNodesTab({ nodes, onRefresh }: { nodes: StorageNodeDb[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    label: '', host: '', port: '3306', db_name: '', db_user: '', db_password: '',
    region: '', country_code: 'FR', capacity_gb: '10', max_servers: '50',
    latitude: '', longitude: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await hostingApi.addDbNode({
        label: form.label, host: form.host, port: parseInt(form.port),
        db_name: form.db_name, db_user: form.db_user, db_password: form.db_password,
        region: form.region || undefined,
        country_code: form.country_code || undefined,
        capacity_gb: parseFloat(form.capacity_gb),
        max_servers: parseInt(form.max_servers),
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      });
      toast.success('Nœud DB ajouté');
      setShowAdd(false);
      setForm({ label: '', host: '', port: '3306', db_name: '', db_user: '', db_password: '', region: '', country_code: 'FR', capacity_gb: '10', max_servers: '50', latitude: '', longitude: '' });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur ajout nœud');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Nœuds MySQL de stockage</h2>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
          <i className="bi bi-plus-lg mr-2" />Ajouter un nœud
        </Button>
      </div>

      {showAdd && (
        <Card className="bg-white/5 border-indigo-500/30">
          <CardHeader className="pb-2"><p className="font-medium text-sm">Nouveau nœud MySQL</p></CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Label" value={form.label} onChange={v => setForm(f => ({ ...f, label: v }))} required />
              <FormField label="Hôte MySQL" value={form.host} onChange={v => setForm(f => ({ ...f, host: v }))} required />
              <FormField label="Port" value={form.port} onChange={v => setForm(f => ({ ...f, port: v }))} type="number" />
              <FormField label="Nom de la base" value={form.db_name} onChange={v => setForm(f => ({ ...f, db_name: v }))} required />
              <FormField label="Utilisateur" value={form.db_user} onChange={v => setForm(f => ({ ...f, db_user: v }))} required />
              <FormField label="Mot de passe" value={form.db_password} onChange={v => setForm(f => ({ ...f, db_password: v }))} type="password" required />
              <FormField label="Région (ex: EU-West)" value={form.region} onChange={v => setForm(f => ({ ...f, region: v }))} />
              <FormField label="Code pays" value={form.country_code} onChange={v => setForm(f => ({ ...f, country_code: v }))} />
              <FormField label="Capacité (Go)" value={form.capacity_gb} onChange={v => setForm(f => ({ ...f, capacity_gb: v }))} type="number" />
              <FormField label="Max serveurs" value={form.max_servers} onChange={v => setForm(f => ({ ...f, max_servers: v }))} type="number" />
              <FormField label="Latitude" value={form.latitude} onChange={v => setForm(f => ({ ...f, latitude: v }))} placeholder="48.8566" />
              <FormField label="Longitude" value={form.longitude} onChange={v => setForm(f => ({ ...f, longitude: v }))} placeholder="2.3522" />
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Annuler</Button>
                <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                  {saving ? 'Ajout...' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {nodes.length === 0 ? (
        <EmptyState icon="database" text="Aucun nœud DB configuré" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {nodes.map(node => (
            <NodeCard key={node.id} node={node} type="db" />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Nœuds Media ───────────────────────────────────────────────────────────────

function MediaNodesTab({ nodes, onRefresh }: { nodes: StorageNodeMedia[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    label: '', endpoint_url: '', region: '', country_code: 'FR',
    capacity_gb: '50', latitude: '', longitude: '',
  });
  const [saving, setSaving] = useState(false);
  const [newToken, setNewToken] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res: any = await hostingApi.addMediaNode({
        label: form.label,
        endpoint_url: form.endpoint_url,
        region: form.region || undefined,
        country_code: form.country_code || undefined,
        capacity_gb: parseFloat(form.capacity_gb),
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      });
      const data = res?.data ?? res;
      if (data?.node_token) setNewToken(data.node_token);
      toast.success('Nœud media ajouté');
      setShowAdd(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur ajout nœud');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Nœuds de stockage media</h2>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
          <i className="bi bi-plus-lg mr-2" />Ajouter un nœud
        </Button>
      </div>

      {newToken && (
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4">
          <p className="text-sm font-medium text-yellow-300 mb-2"><i className="bi bi-key-fill mr-2" />Token du nœud media (à sauvegarder)</p>
          <code className="block bg-black/40 rounded p-2 text-xs font-mono break-all">{newToken}</code>
          <p className="text-xs text-muted-foreground mt-1">Ajoutez <code className="bg-white/10 px-1 rounded">ALFYCHAT_NODE_TOKEN={newToken.slice(0, 20)}...</code> dans le .env de votre pod media.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { navigator.clipboard.writeText(newToken); toast.success('Token copié !'); }}>
            <i className="bi bi-clipboard mr-1" />Copier
          </Button>
        </div>
      )}

      {showAdd && (
        <Card className="bg-white/5 border-indigo-500/30">
          <CardHeader className="pb-2"><p className="font-medium text-sm">Nouveau nœud media</p></CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Label" value={form.label} onChange={v => setForm(f => ({ ...f, label: v }))} required />
              <FormField label="URL du pod (https://...)" value={form.endpoint_url} onChange={v => setForm(f => ({ ...f, endpoint_url: v }))} required />
              <FormField label="Région" value={form.region} onChange={v => setForm(f => ({ ...f, region: v }))} />
              <FormField label="Code pays" value={form.country_code} onChange={v => setForm(f => ({ ...f, country_code: v }))} />
              <FormField label="Capacité (Go)" value={form.capacity_gb} onChange={v => setForm(f => ({ ...f, capacity_gb: v }))} type="number" />
              <FormField label="Latitude" value={form.latitude} onChange={v => setForm(f => ({ ...f, latitude: v }))} />
              <FormField label="Longitude" value={form.longitude} onChange={v => setForm(f => ({ ...f, longitude: v }))} />
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Annuler</Button>
                <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                  {saving ? 'Ajout...' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {nodes.length === 0 ? (
        <EmptyState icon="hdd-fill" text="Aucun nœud media configuré" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {nodes.map(node => <NodeCard key={node.id} node={node} type="media" onDelete={async (id) => {
            try {
              await hostingApi.deleteMediaNode(id);
              toast.success('N\u0153ud media supprim\u00e9');
              onRefresh();
            } catch { toast.error('Erreur suppression'); }
          }} />)}
        </div>
      )}
    </div>
  );
}

function NodeCard({ node, type, onDelete }: { node: any; type: 'db' | 'media'; onDelete?: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const used = node.used_gb || 0;
  const cap = node.capacity_gb || 1;
  const pct = Math.min((used / cap) * 100, 100);
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="pt-4 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium text-sm">{node.label}</p>
            <p className="text-xs text-muted-foreground">{type === 'db' ? node.host : node.endpoint_url}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[node.status] || STATUS_COLOR.pending}`}>
              {node.status}
            </span>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                disabled={deleting}
                onClick={async () => {
                  if (!confirm('Supprimer ce n\u0153ud ? Cette action est irr\u00e9versible.')) return;
                  setDeleting(true);
                  await onDelete(node.id);
                  setDeleting(false);
                }}
                className="text-red-400 hover:text-red-300 h-7 w-7 p-0"
              >
                <i className={`bi ${deleting ? 'bi-hourglass-split' : 'bi-trash'}`} />
              </Button>
            )}
          </div>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground">
          {node.region && <span><i className="bi bi-geo-alt mr-1" />{node.region}</span>}
          {node.country_code && <span><i className="bi bi-flag mr-1" />{node.country_code}</span>}
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Stockage</span>
            <span>{used.toFixed(1)} / {cap.toFixed(0)} Go</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {type === 'db' && <p className="text-xs text-muted-foreground">{node.current_servers}/{node.max_servers} serveurs</p>}
        {node.last_heartbeat && (
          <p className="text-xs text-muted-foreground">
            Dernier heartbeat : {new Date(node.last_heartbeat).toLocaleString('fr-FR')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Offres ─────────────────────────────────────────────────────────────────

const TIER_OPTIONS = ['free', 'starter', 'standard', 'premium', 'enterprise'];

function OffersTab({ offers, onRefresh }: { offers: HostingOffer[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', slug: '', tier: 'starter', price_monthly: '4.99', price_yearly: '',
    currency: 'EUR', description: '', boost_type: 'mixed',
    members: '500', channels: '50', roles: '25', storage_mb: '2048',
    uploads_per_day: '500', file_size_mb: '25',
  });

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 60);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await hostingApi.createOffer({
        name: form.name,
        slug: form.slug,
        tier: form.tier as any,
        price_monthly: parseFloat(form.price_monthly),
        price_yearly: form.price_yearly ? parseFloat(form.price_yearly) : undefined,
        currency: form.currency,
        description: form.description || undefined,
        boost_enabled: true,
        boost_type: form.boost_type as any,
        limits: {
          members: parseInt(form.members),
          channels: parseInt(form.channels),
          roles: parseInt(form.roles),
          storage_mb: parseInt(form.storage_mb),
          uploads_per_day: parseInt(form.uploads_per_day),
          file_size_mb: parseInt(form.file_size_mb),
        },
        features: ['basic_text', 'basic_voice', 'custom_icon'],
      });
      toast.success('Offre créée');
      setShowAdd(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur création offre');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Offres d'hébergement</h2>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
          <i className="bi bi-plus-lg mr-2" />Créer une offre
        </Button>
      </div>

      {showAdd && (
        <Card className="bg-white/5 border-indigo-500/30">
          <CardHeader className="pb-2"><p className="font-medium text-sm">Nouvelle offre</p></CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Nom" value={form.name} onChange={v => setForm(f => ({ ...f, name: v, slug: autoSlug(v) }))} required />
              <FormField label="Slug" value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))} required />
              <div>
                <Label className="text-xs mb-1 block">Tier</Label>
                <select value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))} className="w-full h-9 px-3 rounded-md bg-background border border-input text-sm">
                  {TIER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Type de boost</Label>
                <select value={form.boost_type} onChange={e => setForm(f => ({ ...f, boost_type: e.target.value }))} className="w-full h-9 px-3 rounded-md bg-background border border-input text-sm">
                  <option value="mixed">Admins + utilisateurs</option>
                  <option value="admin_only">Admins uniquement</option>
                  <option value="users">Tous les membres</option>
                </select>
              </div>
              <FormField label="Prix mensuel (€)" value={form.price_monthly} onChange={v => setForm(f => ({ ...f, price_monthly: v }))} type="number" />
              <FormField label="Prix annuel (€, optionnel)" value={form.price_yearly} onChange={v => setForm(f => ({ ...f, price_yearly: v }))} type="number" />
              <div className="sm:col-span-2 border-t border-white/10 pt-3">
                <p className="text-xs font-medium mb-2 text-muted-foreground">Limites de l'offre</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <FormField label="Membres max" value={form.members} onChange={v => setForm(f => ({ ...f, members: v }))} type="number" />
                  <FormField label="Salons max" value={form.channels} onChange={v => setForm(f => ({ ...f, channels: v }))} type="number" />
                  <FormField label="Rôles max" value={form.roles} onChange={v => setForm(f => ({ ...f, roles: v }))} type="number" />
                  <FormField label="Stockage (Mo)" value={form.storage_mb} onChange={v => setForm(f => ({ ...f, storage_mb: v }))} type="number" />
                  <FormField label="Uploads/jour" value={form.uploads_per_day} onChange={v => setForm(f => ({ ...f, uploads_per_day: v }))} type="number" />
                  <FormField label="Taille max fichier (Mo)" value={form.file_size_mb} onChange={v => setForm(f => ({ ...f, file_size_mb: v }))} type="number" />
                </div>
              </div>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Annuler</Button>
                <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                  {saving ? 'Création...' : 'Créer l\'offre'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {offers.length === 0 ? (
        <EmptyState icon="box" text="Aucune offre créée" />
      ) : (
        <div className="space-y-2">
          {offers.map(offer => (
            <Card key={offer.id} className="bg-white/5 border-white/10">
              <CardContent className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{offer.name}</span>
                  <Badge variant="outline" className="text-xs">{offer.tier}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm">{offer.price_monthly}\u20ac/mois</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!confirm('Supprimer cette offre ?')) return;
                      try {
                        await hostingApi.deleteOffer(offer.id);
                        toast.success('Offre supprim\u00e9e');
                        onRefresh();
                      } catch { toast.error('Erreur suppression'); }
                    }}
                    className="text-red-400 hover:text-red-300 h-7 w-7 p-0"
                  >
                    <i className="bi bi-trash" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Clés API ──────────────────────────────────────────────────────────────────

const ALL_PERMS = ['nodes:read', 'nodes:write', 'nodes:delete', 'offers:read', 'offers:write', 'stats:read', 'servers:read'];

function ApiKeysTab({ keys, onRefresh }: { keys: ApiKey[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [form, setForm] = useState({ name: '', permissions: ['nodes:read', 'nodes:write', 'offers:read', 'offers:write', 'stats:read'], expires_in_days: '' });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res: any = await hostingApi.createApiKey({
        name: form.name,
        permissions: form.permissions,
        expires_in_days: form.expires_in_days ? parseInt(form.expires_in_days) : undefined,
      });
      const data = res?.data ?? res;
      if (data?.key) setNewKey(data.key);
      toast.success('Clé API créée');
      setShowAdd(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur création clé');
    } finally {
      setSaving(false);
    }
  }

  async function revokeKey(keyId: string) {
    try {
      await hostingApi.revokeApiKey(keyId);
      toast.success('Clé révoquée');
      onRefresh();
    } catch {
      toast.error('Erreur révocation');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Clés API</h2>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
          <i className="bi bi-plus-lg mr-2" />Créer une clé
        </Button>
      </div>

      {newKey && (
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4">
          <p className="text-sm font-medium text-yellow-300 mb-2"><i className="bi bi-key-fill mr-2" />Votre nouvelle clé API (une seule fois !)</p>
          <code className="block bg-black/40 rounded p-2 text-xs font-mono break-all select-all">{newKey}</code>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { navigator.clipboard.writeText(newKey); toast.success('Clé copiée !'); }}>
            <i className="bi bi-clipboard mr-1" />Copier
          </Button>
        </div>
      )}

      {showAdd && (
        <Card className="bg-white/5 border-indigo-500/30">
          <CardHeader className="pb-2"><p className="font-medium text-sm">Nouvelle clé API</p></CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-3">
              <FormField label="Nom de la clé" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
              <div>
                <Label className="text-xs mb-2 block">Permissions</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_PERMS.map(perm => (
                    <label key={perm} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(perm)}
                        onChange={e => {
                          setForm(f => ({
                            ...f,
                            permissions: e.target.checked
                              ? [...f.permissions, perm]
                              : f.permissions.filter(p => p !== perm),
                          }));
                        }}
                        className="rounded"
                      />
                      <span className="text-xs">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
              <FormField label="Expiration (jours, vide = jamais)" value={form.expires_in_days} onChange={v => setForm(f => ({ ...f, expires_in_days: v }))} type="number" />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Annuler</Button>
                <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                  {saving ? 'Création...' : 'Créer'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {keys.length === 0 ? (
        <EmptyState icon="key" text="Aucune clé API" />
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <Card key={k.id} className="bg-white/5 border-white/10">
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{k.name}</p>
                  <p className="text-xs text-muted-foreground">{k.permissions?.join(', ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {k.usage_count} utilisations
                    {k.last_used_at && ` · Dernière utilisation ${new Date(k.last_used_at).toLocaleDateString('fr-FR')}`}
                    {k.expires_at && ` · Expire le ${new Date(k.expires_at).toLocaleDateString('fr-FR')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${k.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                    {k.is_active ? 'Active' : 'Révoquée'}
                  </span>
                  {k.is_active && (
                    <Button variant="ghost" size="sm" onClick={() => revokeKey(k.id)} className="text-red-400 hover:text-red-300 h-7 px-2">
                      <i className="bi bi-x-circle" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function FormField({ label, value, onChange, type = 'text', required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs mb-1 block">{label}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder} className="h-8 text-sm" />
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <i className={`bi bi-${icon} text-4xl block mb-2 opacity-30`} />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      </div>
    </div>
  );
}
