'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Badge }  from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { PlusIcon, Trash2Icon, KeyIcon, EyeIcon, EyeOffIcon, CheckCircle2Icon, CopyIcon } from '@/components/icons';
import { api } from '@/lib/api';
import { StatusDot, SERVICE_TYPES, ServiceInstance, ServiceType } from '../_shared';
import { ServicesPanel } from '../services-panel';

const DEFAULT_FORM = { id: '', serviceType: 'messages' as ServiceType, endpoint: '', domain: '', location: 'EU' };

const TYPE_COLORS: Record<string, string> = {
  users: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  messages: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  friends: 'bg-green-500/10 text-green-500 border-green-500/20',
  calls: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  servers: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  bots: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  media: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
};

export default function AdminServicesPage() {
  const [instances, setInstances]   = useState<ServiceInstance[]>([]);
  const [form, setForm]             = useState({ ...DEFAULT_FORM });
  const [formError, setFormError]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotatedKey, setRotatedKey] = useState<{ id: string; key: string } | null>(null);
  const [showKey, setShowKey]       = useState(false);
  const [keyCopied, setKeyCopied]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.getAdminServices();
    if (r.success && r.data) setInstances((r.data as any).instances ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    setSubmitting(true); setFormError('');
    try {
      const r = await api.addAdminService(form);
      if (r.success) { setForm({ ...DEFAULT_FORM }); load(); }
      else setFormError((r as any).error || 'Erreur.');
    } catch { setFormError('Erreur réseau.'); }
    setSubmitting(false);
  };

  const handleRotate = async (id: string) => {
    setRotatingId(id);
    try {
      const r = await api.rotateAdminServiceKey(id);
      if (r.success && r.data?.serviceKey) { setRotatedKey({ id, key: r.data.serviceKey }); setShowKey(false); setKeyCopied(false); }
    } finally { setRotatingId(null); }
  };

  if (loading) return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="h-8 w-36 animate-pulse rounded-lg bg-muted" />
      {[...Array(3)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />)}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Services</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{instances.length} instance{instances.length !== 1 ? 's' : ''} enregistrée{instances.length !== 1 ? 's' : ''}.</p>
      </div>

      {/* Add form */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <PlusIcon className="size-4 text-primary" />
            <p className="font-semibold">Ajouter une instance</p>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">ID</label><Input placeholder="users-eu-2" value={form.id} onChange={e => setForm(p => ({ ...p, id: e.target.value }))} /></div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <select className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm" value={form.serviceType} onChange={e => setForm(p => ({ ...p, serviceType: e.target.value as ServiceType }))}>
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Location</label><Input placeholder="EU" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
            <div className="col-span-2 space-y-1"><label className="text-xs font-medium text-muted-foreground">Endpoint</label><Input placeholder="https://2.users.alfychat.eu" value={form.endpoint} onChange={e => setForm(p => ({ ...p, endpoint: e.target.value }))} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Domaine</label><Input placeholder="2.users.alfychat.eu" value={form.domain} onChange={e => setForm(p => ({ ...p, domain: e.target.value }))} /></div>
          </div>
          {formError && <p className="mt-2 text-xs text-destructive">{formError}</p>}
          <div className="mt-3 flex justify-end">
            <Button size="sm" disabled={submitting || !form.id || !form.endpoint || !form.domain} onClick={handleAdd}>
              <PlusIcon className="size-4" /> Ajouter
            </Button>
          </div>
        </div>
      </div>

      {/* Instances grouped by type */}
      {SERVICE_TYPES
        .map(type => ({ type, list: instances.filter(i => i.serviceType === type) }))
        .filter(g => g.list.length > 0)
        .map(({ type, list }) => {
          const healthy = list.filter(i => i.healthy).length;
          const typeColor = TYPE_COLORS[type] ?? 'bg-muted text-muted-foreground border-border';
          return (
            <div key={type} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3 border-b border-border px-5 py-3">
                <span className={`rounded-md border px-2.5 py-0.5 text-xs font-semibold capitalize ${typeColor}`}>{type}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${healthy === list.length ? 'bg-green-500' : healthy === 0 ? 'bg-destructive' : 'bg-amber-400'}`} />
                  <span className="text-xs text-muted-foreground">{healthy}/{list.length} saine{list.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {['ID', 'Domaine', 'Lieu', 'Statut', 'Activé', 'Score', 'Heartbeat', ''].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {list.map(inst => (
                      <tr key={inst.id} className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{inst.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">{inst.domain}</span>
                            {/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(inst.domain) && (
                              <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px]">LOCAL</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{inst.location}</Badge></td>
                        <td className="px-4 py-3"><StatusDot healthy={inst.healthy} lastHeartbeat={inst.lastHeartbeat} /></td>
                        <td className="px-4 py-3"><Switch checked={inst.enabled !== false} onCheckedChange={v => { api.patchAdminService(inst.id, { enabled: v }); setInstances(p => p.map(s => s.id === inst.id ? { ...s, enabled: v } : s)); }} /></td>
                        <td className={`px-4 py-3 text-xs font-bold ${inst.score >= 80 ? 'text-green-500' : inst.score >= 50 ? 'text-amber-500' : 'text-destructive'}`}>{inst.score?.toFixed(1)}</td>
                        <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{new Date(inst.lastHeartbeat).toLocaleTimeString('fr-FR')}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button title="Régénérer clé" disabled={rotatingId === inst.id} onClick={() => handleRotate(inst.id)}
                              className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50">
                              {rotatingId === inst.id ? <div className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <KeyIcon className="size-3.5" />}
                            </button>
                            <button onClick={() => confirm(`Supprimer "${inst.id}" ?`) && api.deleteAdminService(inst.id).then(() => setInstances(p => p.filter(s => s.id !== inst.id)))}
                              className="flex size-7 items-center justify-center rounded-md border border-destructive/20 text-destructive transition-colors hover:bg-destructive/10">
                              <Trash2Icon className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

      <ServicesPanel />

      {/* Key dialog */}
      <Dialog open={!!rotatedKey} onOpenChange={o => { if (!o) setRotatedKey(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyIcon className="size-4 text-primary" /> Nouvelle clé générée</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
              Clé visible une seule fois. Ajoutez-la dans le <code className="rounded bg-black/10 px-1">.env</code> du service <strong>{rotatedKey?.id}</strong>.
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <code className="flex-1 break-all font-mono text-xs">{showKey ? rotatedKey?.key : '•'.repeat(48)}</code>
              <button onClick={() => setShowKey(v => !v)} className="text-muted-foreground hover:text-foreground">
                {showKey ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
            <Button className="w-full" variant={keyCopied ? 'secondary' : 'default'}
              onClick={async () => { if (rotatedKey) { await navigator.clipboard.writeText(`SERVICE_KEY=${rotatedKey.key}`); setKeyCopied(true); } }}>
              {keyCopied ? <><CheckCircle2Icon className="size-4" /> Copié !</> : <><CopyIcon className="size-4" /> Copier SERVICE_KEY=…</>}
            </Button>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline" onClick={() => setRotatedKey(null)}>Fermer</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
