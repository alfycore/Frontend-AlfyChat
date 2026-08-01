'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge }  from '@/components/ui/badge';
import { Input }  from '@/components/ui/input';
import { PlusIcon, Edit2Icon, Trash2Icon, CheckCircle2Icon, ServerIcon, ChevronDownIcon, ChevronRightIcon } from '@/components/icons';
import { api } from '@/lib/api';
import { SERVICE_TYPES, ServiceInstance } from '../_shared';

type Severity = 'info' | 'warning' | 'critical';
type IncStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

const SEV = {
  critical:  { label: 'Critique',       dot: 'bg-destructive',  badge: 'bg-destructive/10 text-destructive border-destructive/20',         ring: 'ring-1 ring-destructive/30' },
  warning:   { label: 'Avertissement',  dot: 'bg-amber-500',    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',               ring: 'ring-1 ring-amber-500/30' },
  info:      { label: 'Info',           dot: 'bg-sky-500',      badge: 'bg-sky-500/10 text-sky-500 border-sky-500/20',                     ring: 'ring-1 ring-sky-500/30' },
};
const STS = {
  investigating: 'Investigation',
  identified:    'Identifié',
  monitoring:    'Surveillance',
  resolved:      'Résolu',
};

const DEFAULT_FORM = { title: '', message: '', severity: 'warning' as Severity, status: 'investigating' as IncStatus, services: '' };

export default function AdminStatusPage() {
  const [instances, setInstances]     = useState<ServiceInstance[]>([]);
  const [incidents, setIncidents]     = useState<any[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [editing, setEditing]         = useState<any>(undefined);
  const [form, setForm]               = useState({ ...DEFAULT_FORM });
  const [submitting, setSubmitting]   = useState(false);
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());
  const [loading, setLoading]         = useState(true);

  const loadIncidents = useCallback(async (incl: boolean) => {
    const r = await api.getAdminIncidents(incl);
    if (r.success && r.data) setIncidents((r.data as any).incidents ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      const [ir, sr] = await Promise.all([api.getAdminIncidents(false), api.getAdminServices()]);
      if (ir.success && ir.data) setIncidents((ir.data as any).incidents ?? []);
      if (sr.success && sr.data) setInstances((sr.data as any).instances ?? []);
      setLoading(false);
    })();
  }, []);

  const toggle = (t: string) => setExpanded(p => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n; });

  const handleSubmit = async () => {
    setSubmitting(true);
    const services = form.services.split(',').map(s => s.trim()).filter(Boolean);
    const payload = { title: form.title, message: form.message || undefined, severity: form.severity, status: form.status, services: services.length ? services : undefined };
    try {
      if (editing) await api.updateIncident(editing.id, payload);
      else         await api.createIncident(payload);
      setEditing(undefined);
      await loadIncidents(showResolved);
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Status public</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Incidents et état de l&apos;infrastructure.</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setForm({ ...DEFAULT_FORM }); }}>
          <PlusIcon className="size-3.5" /> Nouvel incident
        </Button>
      </div>

      {/* Infrastructure health */}
      {instances.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-2">
              <ServerIcon className="size-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Infrastructure</p>
            </div>
            <span className="text-xs text-muted-foreground">{instances.length} instances</span>
          </div>
          {SERVICE_TYPES
            .map(type => ({ type, list: instances.filter(i => i.serviceType === type) }))
            .filter(g => g.list.length > 0)
            .map(({ type, list }) => {
              const healthy = list.filter(i => i.healthy).length;
              const allOk   = healthy === list.length;
              const noneOk  = healthy === 0;
              const isOpen  = expanded.has(type);
              return (
                <div key={type} className="border-b border-border last:border-0">
                  <button onClick={() => toggle(type)} className="flex w-full items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30">
                    {isOpen ? <ChevronDownIcon className="size-3.5 text-muted-foreground" /> : <ChevronRightIcon className="size-3.5 text-muted-foreground" />}
                    <span className={`size-2.5 rounded-full ${allOk ? 'bg-green-500' : noneOk ? 'bg-destructive' : 'bg-amber-400'}`} />
                    <span className="flex-1 text-sm font-medium capitalize">{type}</span>
                    <span className={`text-xs font-semibold ${allOk ? 'text-green-500' : noneOk ? 'text-destructive' : 'text-amber-500'}`}>
                      {allOk ? 'Opérationnel' : noneOk ? 'Hors ligne' : `${healthy}/${list.length}`}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="bg-muted/20">
                      {list.map(inst => {
                        const stale  = Date.now() - new Date(inst.lastHeartbeat).getTime() > 90_000;
                        const online = inst.healthy && !stale;
                        return (
                          <div key={inst.id} className="flex items-center gap-3 border-t border-border/50 px-10 py-2.5">
                            <span className={`size-1.5 rounded-full ${online ? 'bg-green-500' : stale ? 'bg-amber-400' : 'bg-destructive'}`} />
                            <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{inst.id}</span>
                            <span className="hidden text-xs text-muted-foreground sm:block max-w-45 truncate">{inst.domain}</span>
                            <Badge variant="outline" className="text-[10px]">{inst.location}</Badge>
                            <span className={`text-xs font-medium ${online ? 'text-green-500' : stale ? 'text-amber-500' : 'text-destructive'}`}>
                              {online ? 'En ligne' : stale ? 'Inactif' : 'Hors ligne'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted/40">
          <input type="checkbox" checked={showResolved} className="rounded" onChange={async e => { setShowResolved(e.target.checked); await loadIncidents(e.target.checked); }} />
          Afficher les incidents résolus
        </label>
      </div>

      {/* Incident form */}
      {editing !== undefined && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <p className="font-semibold">{editing ? "Modifier l'incident" : 'Créer un incident'}</p>
          </div>
          <div className="space-y-3 p-5">
            <Input placeholder="Titre *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            <textarea
              className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              rows={3} placeholder="Message (optionnel)" value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value as Severity }))}>
                <option value="info">Info</option>
                <option value="warning">Avertissement</option>
                <option value="critical">Critique</option>
              </select>
              <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as IncStatus }))}>
                <option value="investigating">Investigation</option>
                <option value="identified">Identifié</option>
                <option value="monitoring">Surveillance</option>
                <option value="resolved">Résolu</option>
              </select>
            </div>
            <Input placeholder="Services concernés (séparés par virgule)" value={form.services} onChange={e => setForm(p => ({ ...p, services: e.target.value }))} />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" disabled={submitting} onClick={() => setEditing(undefined)}>Annuler</Button>
              <Button size="sm" disabled={submitting || !form.title.trim()} onClick={handleSubmit}>
                {submitting ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Créer l\'incident'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Incidents list */}
      {incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <CheckCircle2Icon className="mb-3 size-10 text-green-500/40" />
          <p className="font-medium">Aucun incident{showResolved ? '' : ' actif'}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Tous les services fonctionnent normalement.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc: any) => {
            const sev = SEV[inc.severity as Severity] ?? SEV.info;
            return (
              <div key={inc.id} className={`overflow-hidden rounded-xl border border-border bg-card ${sev.ring}`}>
                <div className="flex items-start gap-4 p-5">
                  <div className={`mt-1 size-2.5 shrink-0 rounded-full ${sev.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{inc.title}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sev.badge}`}>{sev.label}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {STS[inc.status as IncStatus] ?? inc.status}
                      </span>
                    </div>
                    {inc.message && (
                      <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">{inc.message}</p>
                    )}
                    {inc.services && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {JSON.parse(inc.services).map((s: string) => (
                          <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Créé le {new Date(inc.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 border-t border-border/50 px-4 py-2">
                  <button
                    onClick={() => { setEditing(inc); setForm({ title: inc.title, message: inc.message ?? '', severity: inc.severity, status: inc.status, services: inc.services ? JSON.parse(inc.services).join(', ') : '' }); }}
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Edit2Icon className="size-3.5" /> Modifier
                  </button>
                  <button
                    onClick={() => confirm('Supprimer cet incident ?') && api.deleteIncident(inc.id).then(() => setIncidents(p => p.filter((i: any) => i.id !== inc.id)))}
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash2Icon className="size-3.5" /> Supprimer
                  </button>
                  {inc.status !== 'resolved' && (
                    <button
                      onClick={async () => { await api.updateIncident(inc.id, { status: 'resolved' }); await loadIncidents(showResolved); }}
                      className="ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-green-500 transition-colors hover:bg-green-500/10"
                    >
                      <CheckCircle2Icon className="size-3.5" /> Marquer résolu
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
