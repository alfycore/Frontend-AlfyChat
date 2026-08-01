'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Chip, ToggleButton, ToggleButtonGroup } from '@heroui/react';
import {
  Activity, AlertTriangle, CheckCircle2, RotateCcw, Server, TrendingUp,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

import { api } from '@/lib/api';
import {
  EmptyState, LoadBar, PageHeader, SectionCard, StatCard, StatusDot, TableShell,
  TableSkeleton, Td, Th, Tr,
} from '@/components/alfy/admin/primitives';

type Period = '10min' | '30min' | 'hour' | 'day' | 'month';

const PERIODS: { key: Period; label: string }[] = [
  { key: '10min', label: '10 min' },
  { key: '30min', label: '30 min' },
  { key: 'hour',  label: '1 h' },
  { key: 'day',   label: '24 h' },
  { key: 'month', label: '30 j' },
];

interface ServiceInstance {
  id: string;
  serviceType: string;
  endpoint: string;
  location: string;
  healthy: boolean;
  enabled: boolean;
  degraded?: boolean;
  score?: number;
  lastHeartbeat: string;
  metrics?: {
    ramUsage: number; ramMax: number;
    cpuUsage: number; cpuMax: number;
    bandwidthUsage: number; requestCount20min: number;
  };
}

interface MonitoringData {
  services?: { name: string; healthy: boolean; responseTime?: number; uptime24h?: number }[];
  totalRequests24h?: number;
  avgResponseTime?: number;
}

const toMB = (bytes: number) => Math.round(bytes / 1_048_576);

function health(s: ServiceInstance): 'success' | 'warning' | 'danger' | 'muted' {
  if (!s.enabled) return 'muted';
  if (s.degraded || !s.healthy) return 'danger';
  const elapsed = Date.now() - new Date(s.lastHeartbeat).getTime();
  return elapsed > 600_000 ? 'danger' : elapsed > 90_000 ? 'warning' : 'success';
}

export default function AdminMonitoringPage() {
  const [data, setData]         = useState<MonitoringData | null>(null);
  const [instances, setInstances] = useState<ServiceInstance[]>([]);
  const [chart, setChart]       = useState<{ label: string; value: number }[]>([]);
  const [period, setPeriod]     = useState<Period>('hour');
  const [loading, setLoading]   = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const loadChart = useCallback(async (p: Period) => {
    setChartLoading(true);
    const res = await api.getMonitoringUsersChart(p);
    if (res.success && res.data) {
      const d = res.data as { data?: { label: string; value: number }[] };
      setChart(d.data ?? []);
    }
    setChartLoading(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [monRes, svcRes] = await Promise.all([
      api.getMonitoringStats(),
      api.getAdminServices(),
    ]);

    if (monRes.success && monRes.data) setData(monRes.data as MonitoringData);
    else setError(monRes.error ?? 'Impossible de charger les métriques.');

    if (svcRes.success && svcRes.data) {
      setInstances((svcRes.data as { instances?: ServiceInstance[] }).instances ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadChart(period); }, [period, loadChart]);

  const healthy = instances.filter((s) => health(s) === 'success').length;
  const enabled = instances.filter((s) => s.enabled).length;

  return (
    <>
      <PageHeader
        title="Monitoring"
        description="Charge, disponibilité et fréquentation en temps réel."
      >
        <Button
          size="sm"
          variant="secondary"
          onPress={() => { load(); loadChart(period); }}
          isPending={loading}
        >
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

      <div className="admin-stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Instances saines"
          value={`${healthy}/${enabled}`}
          icon={CheckCircle2}
          tone={healthy === enabled ? 'success' : 'warning'}
          loading={loading}
        />
        <StatCard
          label="Instances dégradées"
          value={instances.filter((s) => s.enabled && health(s) === 'danger').length}
          icon={AlertTriangle}
          tone="danger"
          loading={loading}
        />
        <StatCard
          label="Requêtes (24 h)"
          value={data?.totalRequests24h?.toLocaleString('fr-FR') ?? '—'}
          icon={TrendingUp}
          loading={loading}
        />
        <StatCard
          label="Latence moyenne"
          value={data?.avgResponseTime != null ? `${Math.round(data.avgResponseTime)} ms` : '—'}
          icon={Activity}
          tone="accent"
          loading={loading}
        />
      </div>

      {/* ── Fréquentation ── */}
      <SectionCard
        title="Utilisateurs connectés"
        description="Évolution sur la période choisie"
        className="mb-4"
        actions={
          <ToggleButtonGroup
            selectionMode="single"
            selectedKeys={[period]}
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (next) setPeriod(next as Period);
            }}
          >
            {PERIODS.map((p) => (
              <ToggleButton key={p.key} id={p.key} size="sm">
                {p.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        }
      >
        <div className="h-64">
          {chartLoading ? (
            <div className="flex h-full items-center justify-center text-xs text-muted">
              Chargement de la courbe…
            </div>
          ) : chart.length === 0 ? (
            <EmptyState icon={Activity} title="Pas encore de données" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--separator)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--muted)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted)' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--muted)' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Connectés"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#usersFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>

      {/* ── Instances ── */}
      <SectionCard
        flush
        title="Charge par instance"
        description={`${instances.length} instance${instances.length > 1 ? 's' : ''} enregistrée${instances.length > 1 ? 's' : ''}`}
      >
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : instances.length === 0 ? (
          <EmptyState
            icon={Server}
            title="Aucune instance"
            description="Ajoutez une instance depuis la section Services."
          />
        ) : (
          <TableShell
            minWidth={860}
            head={
              <>
                <Th>Instance</Th>
                <Th>Type</Th>
                <Th>État</Th>
                <Th>RAM</Th>
                <Th>CPU</Th>
                <Th>Requêtes (20 min)</Th>
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
                    <Chip size="sm" variant="soft">
                      <Chip.Label>{s.serviceType}</Chip.Label>
                    </Chip>
                  </Td>
                  <Td>
                    <StatusDot
                      tone={tone}
                      label={{ success: 'En ligne', warning: 'Inactif', danger: 'Hors ligne', muted: 'Désactivé' }[tone]}
                      pulse={tone === 'success'}
                    />
                  </Td>
                  <Td>
                    {s.metrics ? (
                      <LoadBar
                        value={s.metrics.ramUsage}
                        max={s.metrics.ramMax}
                        format={(v, m) => `${toMB(v)}/${toMB(m)} MB`}
                      />
                    ) : <span className="text-xs text-muted">—</span>}
                  </Td>
                  <Td>
                    {s.metrics
                      ? <LoadBar value={s.metrics.cpuUsage} max={s.metrics.cpuMax} />
                      : <span className="text-xs text-muted">—</span>}
                  </Td>
                  <Td>
                    <span className="text-sm tabular-nums text-muted">
                      {s.metrics?.requestCount20min?.toLocaleString('fr-FR') ?? '—'}
                    </span>
                  </Td>
                </Tr>
              );
            })}
          </TableShell>
        )}
      </SectionCard>
    </>
  );
}
