'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, LineChart,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { MiniBar, StatusDot, SERVICE_TYPES, ServiceInstance } from '../_shared';
import { api } from '@/lib/api';

type Period = '30min' | '10min' | 'hour' | 'day' | 'month';
const PERIODS: { value: Period; label: string }[] = [
  { value: '30min', label: '30 min' },
  { value: '10min', label: '10 min' },
  { value: 'hour',  label: 'Heure'  },
  { value: 'day',   label: 'Jour'   },
  { value: 'month', label: 'Mois'   },
];

const SERVICE_COLORS: Record<string, string> = {
  users:    'bg-purple-500/10 border-purple-500/20 text-purple-500',
  messages: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
  friends:  'bg-green-500/10 border-green-500/20 text-green-500',
  calls:    'bg-amber-500/10 border-amber-500/20 text-amber-500',
  servers:  'bg-indigo-500/10 border-indigo-500/20 text-indigo-500',
  bots:     'bg-pink-500/10 border-pink-500/20 text-pink-500',
  media:    'bg-teal-500/10 border-teal-500/20 text-teal-500',
};

export default function AdminMonitoringPage() {
  const [monData, setMonData]         = useState<any>(null);
  const [instances, setInstances]     = useState<ServiceInstance[]>([]);
  const [period, setPeriod]           = useState<Period>('hour');
  const [chartData, setChartData]     = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [loading, setLoading]         = useState(true);

  const loadChart = useCallback(async (p: Period) => {
    setChartLoading(true);
    try {
      const r = await api.getMonitoringUsersChart(p);
      if (r.success && r.data?.data) setChartData(r.data.data);
    } finally { setChartLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      const [mr, sr] = await Promise.all([api.getMonitoringStats(), api.getAdminServices()]);
      if (mr.success && mr.data) setMonData(mr.data);
      if (sr.success && sr.data) setInstances((sr.data as any).instances ?? []);
      setLoading(false);
    })();
    loadChart('hour');
  }, [loadChart]);

  if (loading) return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-muted" />
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Monitoring</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Connexions et santé des microservices.</p>
      </div>

      {/* Stats */}
      {monData && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Connectés</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-green-500">
              {monData.connectedUsers?.current ?? 0}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-green-500" />
              </span>
              <span className="text-xs text-muted-foreground">En temps réel</span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pic 24h</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{monData.connectedUsers?.peak24h ?? 0}</p>
            <p className="mt-2 text-xs text-muted-foreground">Maximum atteint aujourd&apos;hui</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dernière vérif.</p>
            <p className="mt-2 text-xl font-bold">
              {monData.checkedAt ? new Date(monData.checkedAt).toLocaleTimeString('fr-FR') : '—'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{instances.length} instance{instances.length !== 1 ? 's' : ''} enregistrée{instances.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <p className="text-sm font-semibold">Historique des connexions</p>
          <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
            {PERIODS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setPeriod(value); loadChart(value); }}
                className={[
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-100',
                  period === value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          {chartLoading ? (
            <div className="flex h-52 items-center justify-center">
              <div className="size-6 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
              Pas de données pour cette période.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label" tickLine={false} axisLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: string) =>
                    ['30min', '10min', 'hour'].includes(period) ? v.slice(11, 16)
                    : period === 'day' ? v.slice(5) : v}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 10, fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2}
                  fill="url(#grad)" dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="max" stroke="#22c55e" strokeWidth={1.5}
                  strokeDasharray="4 2" dot={false} />
                <Line type="monotone" dataKey="min" stroke="#f97316" strokeWidth={1.5}
                  strokeDasharray="4 2" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="mt-2 flex items-center gap-4 justify-end">
            {[{ color: 'bg-primary', label: 'Moyenne' }, { color: 'bg-green-500', label: 'Max', dash: true }, { color: 'bg-orange-500', label: 'Min', dash: true }].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`h-px w-5 ${l.color}`} style={l.dash ? { backgroundImage: 'repeating-linear-gradient(90deg,currentColor 0,currentColor 4px,transparent 4px,transparent 8px)', background: 'none', borderTop: `2px dashed currentColor` } : {}} />
                <span className="text-xs text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instances per service */}
      {SERVICE_TYPES
        .map(type => ({ type, list: instances.filter(i => i.serviceType === type) }))
        .filter(g => g.list.length > 0)
        .map(({ type, list }) => {
          const healthy = list.filter(i => i.healthy).length;
          const typeColor = SERVICE_COLORS[type] ?? 'bg-muted border-border text-muted-foreground';
          return (
            <div key={type} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3 border-b border-border px-5 py-3">
                <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold capitalize ${typeColor}`}>{type}</span>
                <span className="text-xs text-muted-foreground">{healthy}/{list.length} saine{list.length !== 1 ? 's' : ''}</span>
                <div className="ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(healthy / list.length) * 100}%`,
                      background: healthy === list.length ? '#22c55e' : healthy === 0 ? '#ef4444' : '#f59e0b',
                    }}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {['#ID', 'Domaine', 'Lieu', 'Statut', 'CPU', 'RAM', 'BW', 'Req/20m', 'Score', 'Heartbeat'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {list.map(inst => {
                      const bwMB = (inst.metrics?.bandwidthUsage ?? 0) / 1_048_576;
                      return (
                        <tr key={inst.id} className="transition-colors hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground" title={inst.id}>{inst.id.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-xs">{inst.domain}</td>
                          <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{inst.location}</Badge></td>
                          <td className="px-4 py-3"><StatusDot healthy={inst.healthy} lastHeartbeat={inst.lastHeartbeat} /></td>
                          <td className="px-4 py-3">{inst.metrics ? <MiniBar value={inst.metrics.cpuUsage} max={inst.metrics.cpuMax} unit="" /> : <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-4 py-3">{inst.metrics ? <MiniBar value={inst.metrics.ramUsage} max={inst.metrics.ramMax} unit="MB" /> : <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-4 py-3 text-xs tabular-nums">{bwMB >= 1024 ? `${(bwMB/1024).toFixed(1)}G` : `${bwMB.toFixed(1)}M`}</td>
                          <td className="px-4 py-3 tabular-nums text-xs">{inst.metrics?.requestCount20min?.toLocaleString('fr-FR') ?? '—'}</td>
                          <td className={`px-4 py-3 text-xs font-bold ${inst.score >= 80 ? 'text-green-500' : inst.score >= 50 ? 'text-amber-500' : 'text-destructive'}`}>{inst.score?.toFixed(1)}</td>
                          <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{new Date(inst.lastHeartbeat).toLocaleTimeString('fr-FR')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
    </div>
  );
}
