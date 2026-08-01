'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Chip } from '@heroui/react';
import {
  Activity, Ban, Gavel, LifeBuoy, RotateCcw, Server, ShieldAlert, UserCog,
  Users, Wifi,
} from 'lucide-react';

import { api, type ModerationStats } from '@/lib/api';
import {
  EmptyState, LoadBar, PageHeader, SectionCard, StatCard, StatusDot, TableShell,
  Td, Th, Tr,
} from '@/components/alfy/admin/primitives';

interface AdminStats {
  totalUsers: number;
  onlineUsers: number;
  admins: number;
  moderators: number;
}

interface ServiceInstance {
  id: string;
  serviceType: string;
  endpoint: string;
  location: string;
  healthy: boolean;
  enabled: boolean;
  degraded?: boolean;
  lastHeartbeat: string;
  metrics?: { ramUsage: number; ramMax: number; cpuUsage: number; cpuMax: number };
}

/** Raccourcis vers les sections où l'on agit le plus souvent. */
const SHORTCUTS = [
  { href: '/admin/users',      label: 'Utilisateurs',   hint: 'Rôles et badges',        icon: UserCog },
  { href: '/admin/moderation', label: 'Modération',     hint: 'Sanctions et filtres',   icon: Gavel },
  { href: '/admin/monitoring', label: 'Monitoring',     hint: 'Charge et disponibilité', icon: Activity },
  { href: '/admin/helpdesk',   label: 'Helpdesk',       hint: 'Tickets en attente',     icon: LifeBuoy },
];

function healthTone(s: ServiceInstance): 'success' | 'warning' | 'danger' | 'muted' {
  if (!s.enabled) return 'muted';
  if (s.degraded || !s.healthy) return 'danger';
  const elapsed = Date.now() - new Date(s.lastHeartbeat).getTime();
  if (elapsed > 600_000) return 'danger';
  if (elapsed > 90_000) return 'warning';
  return 'success';
}

function healthLabel(tone: ReturnType<typeof healthTone>): string {
  return { success: 'En ligne', warning: 'Inactif', danger: 'Hors ligne', muted: 'Désactivé' }[tone];
}

export default function AdminOverviewPage() {
  const [stats, setStats]       = useState<AdminStats | null>(null);
  const [moderation, setModeration] = useState<ModerationStats | null>(null);
  const [services, setServices] = useState<ServiceInstance[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [statsRes, modRes, svcRes] = await Promise.all([
      api.getAdminStats(),
      api.getModerationStats(),
      api.getAdminServices(),
    ]);

    if (statsRes.success && statsRes.data) setStats(statsRes.data as AdminStats);
    else setError(statsRes.error ?? 'Impossible de charger les statistiques.');

    if (modRes.success && modRes.data) setModeration(modRes.data);
    if (svcRes.success && svcRes.data) {
      setServices(((svcRes.data as { instances?: ServiceInstance[] }).instances ?? []));
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const unhealthy = services.filter((s) => s.enabled && healthTone(s) !== 'success');

  return (
    <>
      <PageHeader
        title="Vue d'ensemble"
        description="L'état de la plateforme en un écran : population, modération, infrastructure."
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

      {/* Alerte remontée quand une instance décroche */}
      {!loading && unhealthy.length > 0 && (
        <Alert status="warning" className="mb-5">
          <Alert.Content>
            <Alert.Title>
              {unhealthy.length} instance{unhealthy.length > 1 ? 's' : ''} en difficulté
            </Alert.Title>
            <Alert.Description>
              {unhealthy.map((s) => s.id).join(', ')} — voir la section Services pour
              restaurer ou désactiver.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* ── Population ── */}
      <div className="admin-stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Comptes"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          loading={loading && !stats}
        />
        <StatCard
          label="En ligne"
          value={stats?.onlineUsers ?? 0}
          hint={
            stats && stats.totalUsers > 0
              ? `${Math.round((stats.onlineUsers / stats.totalUsers) * 100)} % de la population`
              : undefined
          }
          icon={Wifi}
          tone="success"
          loading={loading && !stats}
        />
        <StatCard
          label="Administrateurs"
          value={stats?.admins ?? 0}
          icon={ShieldAlert}
          tone="accent"
          loading={loading && !stats}
        />
        <StatCard
          label="Modérateurs"
          value={stats?.moderators ?? 0}
          icon={Gavel}
          tone="warning"
          loading={loading && !stats}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Modération ── */}
        <SectionCard
          title="Modération"
          description="Sanctions en vigueur"
          className="lg:col-span-1"
          actions={
            <Link
              href="/admin/moderation"
              className="rounded-md px-2 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
            >
              Ouvrir
            </Link>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted">
                <Ban className="size-4 text-danger" aria-hidden />
                Bannissements actifs
              </span>
              <span className="font-heading text-lg tabular-nums text-foreground">
                {moderation?.activeBans ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted">
                <Gavel className="size-4 text-accent" aria-hidden />
                Comptes réduits au silence
              </span>
              <span className="font-heading text-lg tabular-nums text-foreground">
                {moderation?.activeMutes ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-separator pt-3">
              <span className="text-sm text-muted">Avertissements (30 j)</span>
              <span className="text-sm tabular-nums text-foreground">
                {moderation?.warnings30d ?? 0}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* ── Infrastructure ── */}
        <SectionCard
          flush
          title="Instances de service"
          description={`${services.length} enregistrée${services.length > 1 ? 's' : ''}`}
          className="lg:col-span-2"
        >
          {services.length === 0 ? (
            <EmptyState
              icon={Server}
              title="Aucune instance enregistrée"
              description="Ajoutez une instance depuis la section Services."
            />
          ) : (
            <TableShell
              minWidth={560}
              head={
                <>
                  <Th>Instance</Th>
                  <Th>Type</Th>
                  <Th>État</Th>
                  <Th>RAM</Th>
                  <Th>CPU</Th>
                </>
              }
            >
              {services.slice(0, 8).map((s) => {
                const tone = healthTone(s);
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
                      <StatusDot tone={tone} label={healthLabel(tone)} pulse={tone === 'success'} />
                    </Td>
                    <Td>
                      {s.metrics ? (
                        <LoadBar value={s.metrics.ramUsage} max={s.metrics.ramMax} />
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </Td>
                    <Td>
                      {s.metrics ? (
                        <LoadBar value={s.metrics.cpuUsage} max={s.metrics.cpuMax} />
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </TableShell>
          )}
        </SectionCard>
      </div>

      {/* ── Raccourcis ── */}
      <div className="admin-stagger mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SHORTCUTS.map(({ href, label, hint, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-surface-secondary"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent transition-transform duration-200 group-hover:scale-105">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{label}</span>
              <span className="block truncate text-xs text-muted">{hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
