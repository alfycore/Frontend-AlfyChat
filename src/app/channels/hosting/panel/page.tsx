'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { hostingApi, StorageNodeDb, StorageNodeMedia, HostingOffer, ApiKey } from '@/lib/hosting-api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';

type Tab = 'overview' | 'nodes-db' | 'nodes-media' | 'offers' | 'apikeys' | 'payment' | 'technicians' | 'servers';

const STATUS_COLOR: Record<string, string> = {
  online: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  offline: 'bg-red-500/20 text-red-400 border-red-500/30',
  maintenance: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  pending: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  suspended: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export default function HosterPanelPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dbNodes, setDbNodes] = useState<StorageNodeDb[]>([]);
  const [mediaNodes, setMediaNodes] = useState<StorageNodeMedia[]>([]);
  const [offers, setOffers] = useState<HostingOffer[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

  const loadPanel = useCallback(async () => {
    setLoading(true);
    try {
      const provRes = await hostingApi.getMe().catch(() => null);
      const prov = (provRes as any)?.data ?? provRes;
      if (!prov || (provRes as any)?.error === 'no_provider') {
        router.replace('/channels/hosting/panel/register');
        return;
      }
      setProvider(prov);
      const [dbn, medn, offr, keys] = await Promise.all([
        hostingApi.listDbNodes().catch(() => ({ data: [] })),
        hostingApi.listMediaNodes().catch(() => ({ data: [] })),
        hostingApi.listOffers(prov.id).catch(() => ({ data: [] })),
        hostingApi.listApiKeys().catch(() => ({ data: [] })),
      ]);
      const toArr = (r: any) => Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
      setDbNodes(toArr(dbn));
      setMediaNodes(toArr(medn));
      setOffers(toArr(offr));
      setApiKeys(toArr(keys));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadPanel(); }, [loadPanel]);

  if (loading) return <PanelSkeleton />;
  if (!provider) return null;

  const TABS: { id: Tab; label: string; icon: string; count?: number }[] = [
    { id: 'overview', label: "Vue d'ensemble", icon: 'grid' },
    { id: 'nodes-db', label: 'Noeuds DB', icon: 'database', count: dbNodes.length },
    { id: 'nodes-media', label: 'Noeuds Media', icon: 'hdd-fill', count: mediaNodes.length },
    { id: 'offers', label: 'Offres', icon: 'box', count: offers.length },
    { id: 'apikeys', label: 'Cles API', icon: 'key', count: apiKeys.length },
    { id: 'payment', label: 'Paiement', icon: 'credit-card' },
    { id: 'technicians', label: 'Techniciens', icon: 'people' },
    { id: 'servers', label: 'Serveurs', icon: 'layers' },
  ];

  return (
    <div className="bg-background text-foreground">
      <div className="border-b border-white/10 bg-white/2 px-6 py-4 sticky top-0 z-10 backdrop-blur-sm">
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
          <Link href="/channels/hosting">
            <Button variant="outline" size="sm">
              <i className="bi bi-shop mr-2" />Marketplace
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {provider.status === 'pending' && (
          <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4 flex items-start gap-3 mb-6">
            <i className="bi bi-clock text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-yellow-300">Validation en attente</p>
              <p className="text-sm text-yellow-400/80 mt-0.5">
                Votre compte est en cours d&apos;examen par les admins AlfyChat.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-1 bg-white/5 p-1 rounded-xl mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
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

        {tab === 'overview' && <OverviewTab provider={provider} dbNodes={dbNodes} mediaNodes={mediaNodes} offers={offers} />}
        {tab === 'nodes-db' && <DbNodesTab nodes={dbNodes} onRefresh={loadPanel} />}
        {tab === 'nodes-media' && <MediaNodesTab nodes={mediaNodes} onRefresh={loadPanel} />}
        {tab === 'offers' && <OffersTab offers={offers} onRefresh={loadPanel} />}
        {tab === 'apikeys' && <ApiKeysTab keys={apiKeys} onRefresh={loadPanel} />}
        {tab === 'payment' && <PaymentTab provider={provider} />}
        {tab === 'technicians' && <TechniciansTab />}
        {tab === 'servers' && <ServersTab />}
      </div>
    </div>
  );
}

function OverviewTab({ provider, dbNodes, mediaNodes, offers }: any) {
  const onlineDb = dbNodes.filter((n: any) => n.status === 'online').length;
  const onlineMedia = mediaNodes.filter((n: any) => n.status === 'online').length;
  const totalCapDb = dbNodes.reduce((s: number, n: any) => s + (n.capacity_gb || 0), 0);
  const totalUsedDb = dbNodes.reduce((s: number, n: any) => s + (n.used_gb || 0), 0);
  const totalCapMedia = mediaNodes.reduce((s: number, n: any) => s + (n.capacity_gb || 0), 0);
  const totalUsedMedia = mediaNodes.reduce((s: number, n: any) => s + (n.used_gb || 0), 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="database" label="Noeuds DB" value={`${onlineDb}/${dbNodes.length}`} sub="en ligne" color="blue" />
        <StatCard icon="hdd-fill" label="Noeuds Media" value={`${onlineMedia}/${mediaNodes.length}`} sub="en ligne" color="purple" />
        <StatCard icon="box" label="Offres actives" value={offers.filter((o: any) => o.is_active !== false).length} sub="publiees" color="emerald" />
        <StatCard icon="hdd-stack" label="Capacite DB" value={`${totalUsedDb.toFixed(0)}/${totalCapDb.toFixed(0)} Go`} sub="utilise" color="orange" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StorageBar label="Stockage DB" used={totalUsedDb} total={totalCapDb} color="blue" />
        <StorageBar label="Stockage Media" used={totalUsedMedia} total={totalCapMedia} color="purple" />
      </div>
      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <h3 className="font-medium mb-3 text-sm">Informations du compte</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <InfoRow label="Slug" value={provider.slug} />
          <InfoRow label="Email" value={provider.email} />
          <InfoRow label="Pays" value={provider.country_code || 'Non defini'} />
          <InfoRow label="Site web" value={provider.website_url || 'Non defini'} />
          <InfoRow label="Inscrit le" value={new Date(provider.created_at).toLocaleDateString('fr-FR')} />
          {provider.verified_at && <InfoRow label="Verifie le" value={new Date(provider.verified_at).toLocaleDateString('fr-FR')} />}
        </dl>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground shrink-0 w-24">{label}</dt>
      <dd className="font-medium truncate">{value}</dd>
    </div>
  );
}

function DbNodesTab({ nodes, onRefresh }: { nodes: StorageNodeDb[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ label: '', host: '', port: '3306', db_name: '', db_user: '', db_password: '', region: '', country_code: 'FR', capacity_gb: '10', max_servers: '50', latitude: '', longitude: '' });
  const [saving, setSaving] = useState(false);
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await hostingApi.addDbNode({ label: form.label, host: form.host, port: parseInt(form.port), db_name: form.db_name, db_user: form.db_user, db_password: form.db_password, region: form.region || undefined, country_code: form.country_code || undefined, capacity_gb: parseFloat(form.capacity_gb), max_servers: parseInt(form.max_servers), latitude: form.latitude ? parseFloat(form.latitude) : undefined, longitude: form.longitude ? parseFloat(form.longitude) : undefined });
      toast.success('Noeud DB ajoute'); setShowAdd(false);
      setForm({ label: '', host: '', port: '3306', db_name: '', db_user: '', db_password: '', region: '', country_code: 'FR', capacity_gb: '10', max_servers: '50', latitude: '', longitude: '' });
      onRefresh();
    } catch (err: any) { toast.error(err?.message || 'Erreur ajout noeud'); } finally { setSaving(false); }
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Noeuds MySQL de stockage</h2>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="bg-indigo-600 hover:bg-indigo-700"><i className="bi bi-plus-lg mr-2" />Ajouter</Button>
      </div>
      {showAdd && (
        <Card className="bg-white/5 border-indigo-500/30"><CardContent className="pt-4">
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FF label="Label" value={form.label} onChange={v => setForm(f => ({ ...f, label: v }))} required />
            <FF label="Hote MySQL" value={form.host} onChange={v => setForm(f => ({ ...f, host: v }))} required />
            <FF label="Port" value={form.port} onChange={v => setForm(f => ({ ...f, port: v }))} type="number" />
            <FF label="Nom de la base" value={form.db_name} onChange={v => setForm(f => ({ ...f, db_name: v }))} required />
            <FF label="Utilisateur" value={form.db_user} onChange={v => setForm(f => ({ ...f, db_user: v }))} required />
            <FF label="Mot de passe" value={form.db_password} onChange={v => setForm(f => ({ ...f, db_password: v }))} type="password" required />
            <FF label="Region" value={form.region} onChange={v => setForm(f => ({ ...f, region: v }))} />
            <FF label="Code pays" value={form.country_code} onChange={v => setForm(f => ({ ...f, country_code: v }))} />
            <FF label="Capacite (Go)" value={form.capacity_gb} onChange={v => setForm(f => ({ ...f, capacity_gb: v }))} type="number" />
            <FF label="Max serveurs" value={form.max_servers} onChange={v => setForm(f => ({ ...f, max_servers: v }))} type="number" />
            <FF label="Latitude" value={form.latitude} onChange={v => setForm(f => ({ ...f, latitude: v }))} />
            <FF label="Longitude" value={form.longitude} onChange={v => setForm(f => ({ ...f, longitude: v }))} />
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving ? 'Ajout...' : 'Ajouter'}</Button>
            </div>
          </form>
        </CardContent></Card>
      )}
      {nodes.length === 0 ? <EmptyState icon="database" text="Aucun noeud DB configure" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{nodes.map(n => <NodeCard key={n.id} node={n} type="db" />)}</div>
      )}
    </div>
  );
}

function MediaNodesTab({ nodes, onRefresh }: { nodes: StorageNodeMedia[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ label: '', endpoint_url: '', region: '', country_code: 'FR', capacity_gb: '50', latitude: '', longitude: '' });
  const [saving, setSaving] = useState(false);
  const [newToken, setNewToken] = useState('');
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const res: any = await hostingApi.addMediaNode({ label: form.label, endpoint_url: form.endpoint_url, region: form.region || undefined, country_code: form.country_code || undefined, capacity_gb: parseFloat(form.capacity_gb), latitude: form.latitude ? parseFloat(form.latitude) : undefined, longitude: form.longitude ? parseFloat(form.longitude) : undefined });
      const data = res?.data ?? res;
      if (data?.node_token) setNewToken(data.node_token);
      toast.success('Noeud media ajoute'); setShowAdd(false); onRefresh();
    } catch (err: any) { toast.error(err?.message || 'Erreur ajout noeud'); } finally { setSaving(false); }
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Noeuds de stockage media</h2>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="bg-indigo-600 hover:bg-indigo-700"><i className="bi bi-plus-lg mr-2" />Ajouter</Button>
      </div>
      {newToken && (
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4">
          <p className="text-sm font-medium text-yellow-300 mb-2"><i className="bi bi-key-fill mr-2" />Token du noeud (a sauvegarder)</p>
          <code className="block bg-black/40 rounded p-2 text-xs font-mono break-all">{newToken}</code>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { navigator.clipboard.writeText(newToken); toast.success('Token copie !'); }}><i className="bi bi-clipboard mr-1" />Copier</Button>
        </div>
      )}
      {showAdd && (
        <Card className="bg-white/5 border-indigo-500/30"><CardContent className="pt-4">
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FF label="Label" value={form.label} onChange={v => setForm(f => ({ ...f, label: v }))} required />
            <FF label="URL du pod (https://...)" value={form.endpoint_url} onChange={v => setForm(f => ({ ...f, endpoint_url: v }))} required />
            <FF label="Region" value={form.region} onChange={v => setForm(f => ({ ...f, region: v }))} />
            <FF label="Code pays" value={form.country_code} onChange={v => setForm(f => ({ ...f, country_code: v }))} />
            <FF label="Capacite (Go)" value={form.capacity_gb} onChange={v => setForm(f => ({ ...f, capacity_gb: v }))} type="number" />
            <FF label="Latitude" value={form.latitude} onChange={v => setForm(f => ({ ...f, latitude: v }))} />
            <FF label="Longitude" value={form.longitude} onChange={v => setForm(f => ({ ...f, longitude: v }))} />
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving ? 'Ajout...' : 'Ajouter'}</Button>
            </div>
          </form>
        </CardContent></Card>
      )}
      {nodes.length === 0 ? <EmptyState icon="hdd-fill" text="Aucun noeud media configure" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{nodes.map(n => (
          <NodeCard key={n.id} node={n} type="media" onDelete={async (id) => {
            try { await hostingApi.deleteMediaNode(id); toast.success('Noeud supprime'); onRefresh(); } catch { toast.error('Erreur suppression'); }
          }} />
        ))}</div>
      )}
    </div>
  );
}

function NodeCard({ node, type, onDelete }: { node: any; type: 'db' | 'media'; onDelete?: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const used = node.used_gb || 0; const cap = node.capacity_gb || 1;
  const pct = Math.min((used / cap) * 100, 100);
  return (
    <Card className="bg-white/5 border-white/10"><CardContent className="pt-4 space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-sm">{node.label}</p>
          <p className="text-xs text-muted-foreground">{type === 'db' ? node.host : node.endpoint_url}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[node.status] || STATUS_COLOR.pending}`}>{node.status}</span>
          {onDelete && <Button variant="ghost" size="sm" disabled={deleting} onClick={async () => { if (!confirm('Supprimer ce noeud ?')) return; setDeleting(true); await onDelete(node.id); setDeleting(false); }} className="text-red-400 hover:text-red-300 h-7 w-7 p-0"><i className={`bi ${deleting ? 'bi-hourglass-split' : 'bi-trash'}`} /></Button>}
        </div>
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        {node.region && <span><i className="bi bi-geo-alt mr-1" />{node.region}</span>}
        {node.country_code && <span><i className="bi bi-flag mr-1" />{node.country_code}</span>}
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1"><span>Stockage</span><span>{used.toFixed(1)} / {cap.toFixed(0)} Go</span></div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} /></div>
      </div>
      {type === 'db' && <p className="text-xs text-muted-foreground">{node.current_servers}/{node.max_servers} serveurs</p>}
    </CardContent></Card>
  );
}

const TIER_OPTIONS = ['free', 'starter', 'standard', 'premium', 'enterprise'] as const;

function OffersTab({ offers, onRefresh }: { offers: HostingOffer[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', tier: 'starter', price_monthly: '4.99', price_yearly: '', currency: 'EUR', description: '', boost_type: 'mixed', members: '500', channels: '50', roles: '25', storage_mb: '2048', uploads_per_day: '500', file_size_mb: '25' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  function autoSlug(name: string) { return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }
  function validate() {
    const e: Record<string, string> = {};
    if (!form.name || form.name.length < 2) e.name = 'Nom requis (min. 2 car.)';
    if (!form.slug || !/^[a-z0-9-]{2,60}$/.test(form.slug)) e.slug = 'Slug invalide';
    if (!form.price_monthly || isNaN(parseFloat(form.price_monthly))) e.price_monthly = 'Prix invalide';
    return e;
  }
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(); if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setSaving(true);
    try {
      await hostingApi.createOffer({ name: form.name, slug: form.slug, tier: form.tier as any, price_monthly: parseFloat(form.price_monthly), price_yearly: form.price_yearly ? parseFloat(form.price_yearly) : undefined, currency: form.currency, description: form.description || undefined, boost_enabled: true, boost_type: form.boost_type as any, limits: { members: parseInt(form.members), channels: parseInt(form.channels), roles: parseInt(form.roles), storage_mb: parseInt(form.storage_mb), uploads_per_day: parseInt(form.uploads_per_day), file_size_mb: parseInt(form.file_size_mb) }, features: ['basic_text', 'basic_voice'] });
      toast.success('Offre creee'); setShowAdd(false);
      setForm({ name: '', slug: '', tier: 'starter', price_monthly: '4.99', price_yearly: '', currency: 'EUR', description: '', boost_type: 'mixed', members: '500', channels: '50', roles: '25', storage_mb: '2048', uploads_per_day: '500', file_size_mb: '25' });
      onRefresh();
    } catch (err: any) { toast.error((err as any)?.error || err?.message || 'Erreur creation offre'); } finally { setSaving(false); }
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Offres d&apos;hebergement</h2>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="bg-indigo-600 hover:bg-indigo-700"><i className="bi bi-plus-lg mr-2" />Creer une offre</Button>
      </div>
      {showAdd && (
        <Card className="bg-white/5 border-indigo-500/30"><CardContent className="pt-4">
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Nom *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }))} className="h-8 text-sm" required />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label className="text-xs mb-1 block">Slug *</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: autoSlug(e.target.value) }))} className="h-8 text-sm" required />
              {errors.slug && <p className="text-xs text-red-400 mt-1">{errors.slug}</p>}
            </div>
            <div>
              <Label className="text-xs mb-1 block">Tier</Label>
              <select value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))} className="w-full h-8 px-3 rounded-md bg-background border border-input text-sm">
                {TIER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Type de boost</Label>
              <select value={form.boost_type} onChange={e => setForm(f => ({ ...f, boost_type: e.target.value }))} className="w-full h-8 px-3 rounded-md bg-background border border-input text-sm">
                <option value="mixed">Admins + membres</option>
                <option value="admin_only">Admins uniquement</option>
                <option value="users">Tous les membres</option>
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Prix mensuel (EUR) *</Label>
              <Input value={form.price_monthly} onChange={e => setForm(f => ({ ...f, price_monthly: e.target.value }))} type="number" step="0.01" min="0" className="h-8 text-sm" required />
              {errors.price_monthly && <p className="text-xs text-red-400 mt-1">{errors.price_monthly}</p>}
            </div>
            <FF label="Prix annuel (EUR, optionnel)" value={form.price_yearly} onChange={v => setForm(f => ({ ...f, price_yearly: v }))} type="number" />
            <div className="sm:col-span-2">
              <Label className="text-xs mb-1 block">Description</Label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full rounded-md bg-background border border-input px-3 py-2 text-sm min-h-[60px] resize-none" />
            </div>
            <div className="sm:col-span-2 border-t border-white/10 pt-3">
              <p className="text-xs font-medium mb-2 text-muted-foreground">Limites de l&apos;offre</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <FF label="Membres max" value={form.members} onChange={v => setForm(f => ({ ...f, members: v }))} type="number" />
                <FF label="Salons max" value={form.channels} onChange={v => setForm(f => ({ ...f, channels: v }))} type="number" />
                <FF label="Roles max" value={form.roles} onChange={v => setForm(f => ({ ...f, roles: v }))} type="number" />
                <FF label="Stockage (Mo)" value={form.storage_mb} onChange={v => setForm(f => ({ ...f, storage_mb: v }))} type="number" />
                <FF label="Uploads/jour" value={form.uploads_per_day} onChange={v => setForm(f => ({ ...f, uploads_per_day: v }))} type="number" />
                <FF label="Taille max fichier (Mo)" value={form.file_size_mb} onChange={v => setForm(f => ({ ...f, file_size_mb: v }))} type="number" />
              </div>
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving ? 'Creation...' : "Creer l'offre"}</Button>
            </div>
          </form>
        </CardContent></Card>
      )}
      {offers.length === 0 ? <EmptyState icon="box" text="Aucune offre creee" /> : (
        <div className="space-y-2">
          {offers.map(offer => (
            <Card key={offer.id} className="bg-white/5 border-white/10"><CardContent className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-medium text-sm truncate">{offer.name}</span>
                <Badge variant="outline" className="text-xs shrink-0">{offer.tier}</Badge>
                {offer.is_active === false && <Badge variant="outline" className="text-xs text-red-400 border-red-400/30 shrink-0">Inactive</Badge>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-sm">{offer.price_monthly}€/mois</span>
                <Button variant="ghost" size="sm" onClick={async () => {
                  if (!confirm('Supprimer cette offre ?')) return;
                  try { await hostingApi.deleteOffer(offer.id); toast.success('Offre supprimee'); onRefresh(); } catch { toast.error('Erreur suppression'); }
                }} className="text-red-400 hover:text-red-300 h-7 w-7 p-0"><i className="bi bi-trash" /></Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

const ALL_PERMS = ['nodes:read', 'nodes:write', 'nodes:delete', 'offers:read', 'offers:write', 'stats:read', 'servers:read'];

function ApiKeysTab({ keys, onRefresh }: { keys: ApiKey[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [form, setForm] = useState({ name: '', permissions: ['nodes:read', 'nodes:write', 'offers:read', 'offers:write', 'stats:read'], expires_in_days: '' });
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const res: any = await hostingApi.createApiKey({ name: form.name, permissions: form.permissions, expires_in_days: form.expires_in_days ? parseInt(form.expires_in_days) : undefined });
      const data = res?.data ?? res;
      if (data?.key) setNewKey(data.key);
      toast.success('Cle API creee'); setShowAdd(false); onRefresh();
    } catch { toast.error('Erreur creation cle'); } finally { setSaving(false); }
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Cles API</h2>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="bg-indigo-600 hover:bg-indigo-700"><i className="bi bi-plus-lg mr-2" />Creer</Button>
      </div>
      {newKey && (
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4">
          <p className="text-sm font-medium text-yellow-300 mb-2"><i className="bi bi-key-fill mr-2" />Votre cle API (visible une seule fois !)</p>
          <code className="block bg-black/40 rounded p-2 text-xs font-mono break-all select-all">{newKey}</code>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { navigator.clipboard.writeText(newKey); toast.success('Cle copiee !'); }}><i className="bi bi-clipboard mr-1" />Copier</Button>
        </div>
      )}
      {showAdd && (
        <Card className="bg-white/5 border-indigo-500/30"><CardContent className="pt-4">
          <form onSubmit={handleAdd} className="space-y-3">
            <FF label="Nom de la cle" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
            <div>
              <Label className="text-xs mb-2 block">Permissions</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_PERMS.map(perm => (
                  <label key={perm} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.permissions.includes(perm)} onChange={e => setForm(f => ({ ...f, permissions: e.target.checked ? [...f.permissions, perm] : f.permissions.filter(p => p !== perm) }))} className="rounded" />
                    <span className="text-xs">{perm}</span>
                  </label>
                ))}
              </div>
            </div>
            <FF label="Expiration (jours, vide = jamais)" value={form.expires_in_days} onChange={v => setForm(f => ({ ...f, expires_in_days: v }))} type="number" />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving ? 'Creation...' : 'Creer'}</Button>
            </div>
          </form>
        </CardContent></Card>
      )}
      {keys.length === 0 ? <EmptyState icon="key" text="Aucune cle API" /> : (
        <div className="space-y-2">
          {keys.map(k => (
            <Card key={k.id} className="bg-white/5 border-white/10"><CardContent className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm">{k.name}</p>
                <p className="text-xs text-muted-foreground">{k.permissions?.join(', ')}</p>
                <p className="text-xs text-muted-foreground">{k.usage_count} utilisations{k.expires_at && `  Expire le ${new Date(k.expires_at).toLocaleDateString('fr-FR')}`}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${k.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>{k.is_active ? 'Active' : 'Revoquee'}</span>
                {k.is_active && <Button variant="ghost" size="sm" onClick={async () => { try { await hostingApi.revokeApiKey(k.id); toast.success('Cle revoquee'); onRefresh(); } catch { toast.error('Erreur'); } }} className="text-red-400 hover:text-red-300 h-7 w-7 p-0"><i className="bi bi-x-circle" /></Button>}
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

const PAYMENT_PROVIDERS = [
  { id: 'stripe', label: 'Stripe', icon: 'credit-card', desc: 'Cartes bancaires (Visa, Mastercard, AMEX)' },
  { id: 'paypal', label: 'PayPal', icon: 'paypal', desc: 'Compte PayPal ou carte via PayPal' },
  { id: 'mollie', label: 'Mollie', icon: 'wallet2', desc: 'iDEAL, Bancontact, Klarna, SEPA...' },
  { id: 'tebex', label: 'Tebex', icon: 'bag-check', desc: 'Gaming marketplace, crypto, wallets' },
];

function PaymentTab({ provider }: { provider: any }) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [form, setForm] = useState<Record<string, { secret_key: string; public_key: string }>>({});
  const [newWebhook, setNewWebhook] = useState<{ provider: string; uri: string } | null>(null);
  useEffect(() => {
    hostingApi.listPaymentConfigs().then((res: any) => {
      const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setConfigs(data);
    }).catch(() => setConfigs([])).finally(() => setLoading(false));
  }, []);
  async function handleSave(providerId: string) {
    const f = form[providerId]; if (!f?.secret_key) { toast.error('Cle secrete requise'); return; }
    setSaving(providerId);
    try {
      const res: any = await hostingApi.setPaymentConfig({ provider: providerId, secret_key: f.secret_key, public_key: f.public_key || undefined });
      const data = res?.data ?? res;
      if (data?.webhook_uri) setNewWebhook({ provider: providerId, uri: data.webhook_uri });
      toast.success('Configuration sauvegardee');
      setConfigs(prev => { const ex = prev.find(c => c.provider === providerId); return ex ? prev.map(c => c.provider === providerId ? { ...c, is_active: true } : c) : [...prev, { provider: providerId, is_active: true }]; });
      setForm(f2 => ({ ...f2, [providerId]: { secret_key: '', public_key: '' } }));
    } catch { toast.error('Erreur sauvegarde'); } finally { setSaving(''); }
  }
  async function handleDelete(providerId: string) {
    if (!confirm(`Supprimer la config ${providerId} ?`)) return;
    try { await hostingApi.deletePaymentConfig(providerId); toast.success('Config supprimee'); setConfigs(prev => prev.filter(c => c.provider !== providerId)); } catch { toast.error('Erreur suppression'); }
  }
  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm">Chargement...</div>;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold">Configuration paiement</h2>
        <p className="text-sm text-muted-foreground mt-1">Ajoutez vos cles API pour chaque fournisseur. Une URI webhook sera generee.</p>
      </div>
      {newWebhook && (
        <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/30 p-4">
          <p className="text-sm font-medium text-indigo-300 mb-2"><i className="bi bi-link-45deg mr-2" />URI Webhook {newWebhook.provider}  a configurer dans votre dashboard</p>
          <code className="block bg-black/40 rounded-lg p-3 text-xs font-mono break-all select-all">{newWebhook.uri}</code>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { navigator.clipboard.writeText(newWebhook!.uri); toast.success('URI copiee !'); }}><i className="bi bi-clipboard mr-1" />Copier</Button>
        </div>
      )}
      <div className="space-y-3">
        {PAYMENT_PROVIDERS.map(p => {
          const existing = configs.find(c => c.provider === p.id);
          const f = form[p.id] || { secret_key: '', public_key: '' };
          return (
            <Card key={p.id} className="bg-white/5 border-white/10"><CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center"><i className={`bi bi-${p.icon} text-lg`} /></div>
                  <div><p className="font-medium text-sm">{p.label}</p><p className="text-xs text-muted-foreground">{p.desc}</p></div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {existing?.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Configure</span>}
                  {existing && <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 h-7 w-7 p-0"><i className="bi bi-trash" /></Button>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs mb-1 block">Cle secrete *</Label>
                  <Input type="password" placeholder={existing ? '' : `sk_live_...`} value={f.secret_key} onChange={e => setForm(prev => ({ ...prev, [p.id]: { ...f, secret_key: e.target.value } }))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Cle publique (optionnel)</Label>
                  <Input placeholder="pk_live_..." value={f.public_key} onChange={e => setForm(prev => ({ ...prev, [p.id]: { ...f, public_key: e.target.value } }))} className="h-8 text-sm" />
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <Button size="sm" disabled={saving === p.id || !f.secret_key} onClick={() => handleSave(p.id)} className="bg-indigo-600 hover:bg-indigo-700">{saving === p.id ? 'Sauvegarde...' : existing ? 'Mettre a jour' : 'Configurer'}</Button>
              </div>
            </CardContent></Card>
          );
        })}
      </div>
    </div>
  );
}

function TechniciansTab() {
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('editor');
  const [adding, setAdding] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    hostingApi.listTechnicians().then((res: any) => { const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []); setTechs(data); }).catch(() => setTechs([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); if (!username.trim()) return;
    setAdding(true);
    try { await hostingApi.addTechnician(username.trim(), role); toast.success('Technicien ajoute'); setUsername(''); load(); }
    catch (err: any) { toast.error((err as any)?.error || err?.message || 'Utilisateur introuvable'); } finally { setAdding(false); }
  }
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold">Techniciens</h2>
        <p className="text-sm text-muted-foreground mt-1">Ajoutez des utilisateurs AlfyChat pour gerer votre infrastructure.</p>
      </div>
      <Card className="bg-white/5 border-white/10"><CardContent className="pt-4">
        <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
          <Input placeholder="Nom d'utilisateur AlfyChat" value={username} onChange={e => setUsername(e.target.value)} className="flex-1 min-w-48 h-8 text-sm" />
          <select value={role} onChange={e => setRole(e.target.value)} className="h-8 px-3 rounded-md bg-background border border-input text-sm">
            <option value="viewer">Lecteur</option>
            <option value="editor">Editeur</option>
            <option value="admin">Admin</option>
          </select>
          <Button type="submit" disabled={adding || !username.trim()} size="sm" className="bg-indigo-600 hover:bg-indigo-700">{adding ? 'Ajout...' : 'Ajouter'}</Button>
        </form>
      </CardContent></Card>
      {loading ? <div className="text-center py-8 text-muted-foreground text-sm">Chargement...</div> : techs.length === 0 ? <EmptyState icon="people" text="Aucun technicien" /> : (
        <div className="space-y-2">
          {techs.map((t: any) => (
            <Card key={t.id} className="bg-white/5 border-white/10"><CardContent className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-xs font-bold text-indigo-400">{(t.display_name || t.username || '?')[0].toUpperCase()}</div>
                <div><p className="font-medium text-sm">{t.display_name || t.username}</p><p className="text-xs text-muted-foreground">@{t.username}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{t.role}</Badge>
                <Button variant="ghost" size="sm" onClick={async () => { if (!confirm('Retirer ce technicien ?')) return; try { await hostingApi.removeTechnician(t.user_id); toast.success('Technicien retire'); load(); } catch { toast.error('Erreur suppression'); } }} className="text-red-400 hover:text-red-300 h-7 w-7 p-0"><i className="bi bi-x-circle" /></Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ServersTab() {
  const [servers, setServers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    hostingApi.getHostedServers(page).then((res: any) => { const data = res?.data ?? res; setServers(Array.isArray(data?.servers) ? data.servers : []); setTotal(data?.total ?? 0); }).catch(() => setServers([])).finally(() => setLoading(false));
  }, [page]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Serveurs heberges</h2>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>
      {loading ? <div className="text-center py-12 text-muted-foreground text-sm">Chargement...</div> : servers.length === 0 ? <EmptyState icon="layers" text="Aucun serveur n'utilise encore votre infrastructure" /> : (
        <>
          <div className="space-y-2">
            {servers.map((s: any) => (
              <Card key={s.server_id} className="bg-white/5 border-white/10"><CardContent className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs text-muted-foreground font-mono truncate">{s.server_id}</code>
                      {s.offer_name && <Badge variant="outline" className="text-xs shrink-0">{s.offer_name} ({s.offer_tier})</Badge>}
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                      {s.db_node_label && <span><i className="bi bi-database mr-1" />{s.db_node_label}{s.db_region && ` (${s.db_region})`}</span>}
                      {s.media_node_label && <span><i className="bi bi-hdd-fill mr-1" />{s.media_node_label}{s.media_region && ` (${s.media_region})`}</span>}
                    </div>
                  </div>
                  <div className="text-right text-xs shrink-0">
                    <p className="text-muted-foreground">DB: {s.used_db_mb?.toFixed(1) ?? 0} Mo</p>
                    <p className="text-muted-foreground">Media: {s.used_media_mb?.toFixed(1) ?? 0} Mo</p>
                    <p className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              </CardContent></Card>
            ))}
          </div>
          {total > 20 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Precedent</Button>
              <span className="text-sm self-center text-muted-foreground">Page {page}</span>
              <Button variant="outline" size="sm" disabled={servers.length < 20} onClick={() => setPage(p => p + 1)}>Suivant</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FF({ label, value, onChange, type = 'text', required, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs mb-1 block">{label}{required && ' *'}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder} className="h-8 text-sm" />
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: any) {
  const colors: Record<string, string> = { blue: 'bg-blue-500/10 text-blue-400', purple: 'bg-purple-500/10 text-purple-400', emerald: 'bg-emerald-500/10 text-emerald-400', orange: 'bg-orange-500/10 text-orange-400' };
  return (
    <Card className="bg-white/5 border-white/10"><CardContent className="pt-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}><i className={`bi bi-${icon}`} /></div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label} <span className="opacity-60"> {sub}</span></div>
    </CardContent></Card>
  );
}

function StorageBar({ label, used, total, color }: { label: string; used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const barColor = color === 'blue' ? 'bg-blue-500' : 'bg-purple-500';
  return (
    <Card className="bg-white/5 border-white/10"><CardContent className="pt-4">
      <div className="flex justify-between text-sm mb-2"><span>{label}</span><span className="text-muted-foreground">{used.toFixed(1)} / {total.toFixed(1)} Go</span></div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} /></div>
      <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(1)}% utilise</p>
    </CardContent></Card>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return <div className="text-center py-12 text-muted-foreground"><i className={`bi bi-${icon} text-4xl block mb-2 opacity-30`} /><p className="text-sm">{text}</p></div>;
}

function PanelSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
      <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}</div>
    </div>
  );
}