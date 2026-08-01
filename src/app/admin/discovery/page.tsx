'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge }  from '@/components/ui/badge';
import { CheckCircle2Icon, XCircleIcon, ClockIcon } from '@/components/icons';
import { api } from '@/lib/api';

type Status = 'pending' | 'approved' | 'rejected';

const TABS: { value: Status; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'pending',  label: 'En attente', icon: ClockIcon,         color: 'text-amber-500' },
  { value: 'approved', label: 'Approuvées', icon: CheckCircle2Icon,  color: 'text-green-500' },
  { value: 'rejected', label: 'Rejetées',   icon: XCircleIcon,       color: 'text-destructive' },
];

export default function AdminDiscoveryPage() {
  const [apps, setApps]       = useState<any[]>([]);
  const [status, setStatus]   = useState<Status>('pending');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s: Status) => {
    setLoading(true);
    const r = await api.getDiscoverApplications(s);
    if (r.success && r.data) {
      const d = r.data as any;
      setApps(Array.isArray(d) ? d : (d.applications ?? []));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(status); }, [status, load]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Découverte</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Candidatures de serveurs à la mise en découverte.</p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-border pb-4">
        {TABS.map(({ value, label, icon: Icon, color }) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={[
              'flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-100',
              status === value
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            <Icon className={`size-4 ${status === value ? color : ''}`} />
            {label}
            {status === value && apps.length > 0 && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
                {apps.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
          <CheckCircle2Icon className="mb-3 size-10 text-muted-foreground/30" />
          <p className="font-medium">Aucune candidature</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Aucune candidature avec ce statut.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map(app => (
            <div key={app.id} className="overflow-hidden rounded-xl border border-border bg-card transition-all duration-150 hover:shadow-sm">
              <div className="flex items-start gap-4 p-5">
                {/* Server icon */}
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-xl font-bold">
                  {app.serverIcon
                    ? <img src={app.serverIcon} alt="" className="size-full object-cover" />
                    : (app.serverName || '?')[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{app.serverName}</p>
                    <Badge variant="secondary">{app.memberCount ?? '?'} membres</Badge>
                  </div>
                  {app.serverDescription && (
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{app.serverDescription}</p>
                  )}
                  <div className="mt-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                    <span className="font-medium">Raison :</span> {app.reason}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Soumis par <span className="font-medium">{app.applicantName || app.applicantId}</span>
                    {' · '}{new Date(app.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                {/* Actions */}
                {status === 'pending' ? (
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      onClick={() => api.reviewApplication(app.id, 'approved').then(() => load(status))}
                      className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700"
                    >
                      <CheckCircle2Icon className="size-3.5" /> Approuver
                    </button>
                    <button
                      onClick={() => api.reviewApplication(app.id, 'rejected').then(() => load(status))}
                      className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-destructive/80"
                    >
                      <XCircleIcon className="size-3.5" /> Rejeter
                    </button>
                  </div>
                ) : (
                  <Badge className={status === 'approved' ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                    {status === 'approved' ? 'Approuvé' : 'Rejeté'}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
