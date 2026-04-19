'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SiteNavbar } from '@/components/site-navbar';
import { SiteFooter } from '@/components/site-footer';
import {
  ArrowLeftIcon,
  ZapIcon,
  GlobeIcon,
  UserIcon,
  MessageCircleIcon,
  UsersIcon,
  PhoneIcon,
  BotIcon,
  ServerIcon,
  WifiIcon,
  ImageIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
  HelpCircleIcon,
  ClockIcon,
  RefreshCwIcon,
} from '@/components/icons';

// ── Types ────────────────────────────────────────────────────────────────────

interface Monitor {
  tag: string;
  name: string;
  status: string;         // 'ACTIVE' | 'INACTIVE'
  default_status: string; // 'UP' | 'DOWN' | 'DEGRADED'
  category_name: string;
}

interface IncidentMonitor { monitor_tag: string; impact: string }
interface Incident {
  id: number;
  title: string;
  start_date_time: number;
  end_date_time: number | null;
  state: string;
  incident_type: string;
  monitors: IncidentMonitor[];
}

interface MaintenanceEvent {
  id: number;
  maintenance_id: number;
  start_date_time: number;
  end_date_time: number;
  event_status: string; // SCHEDULED | ONGOING | COMPLETED | CANCELLED
  maintenance?: {
    id: number;
    title: string;
    description?: string;
    monitors: Array<{ monitor_tag: string; impact: string }>;
  };
}

interface NetworkPayload {
  generatedAt: string;
  monitors: Monitor[];
  activeIncidents: Incident[];
  pastIncidents: Incident[];
  maintenances: any[];
  upcomingEvents: MaintenanceEvent[];
  pastEvents: MaintenanceEvent[];
}

// ── Icon map ─────────────────────────────────────────────────────────────────

const TAG_TO_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  eu:       GlobeIcon,
  ws:       WifiIcon,
  su1:      UserIcon,
  sm1:      MessageCircleIcon,
  sf1:      UsersIcon,
  sc1:      PhoneIcon,
  sb1:      BotIcon,
  ss1:      ServerIcon,
  media3to: ImageIcon,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTs(ts: number) {
  return new Date(ts * 1000).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDuration(startTs: number, endTs: number | null) {
  if (!endTs) return null;
  const mins = Math.round((endTs - startTs) / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const STATE_LABELS: Record<string, string> = {
  INVESTIGATING: 'Investigation',
  IDENTIFIED:    'Identifié',
  MONITORING:    'Surveillance',
  RESOLVED:      'Résolu',
};

const EVT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Planifiée',
  ONGOING:   'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NetworkStatusPage() {
  const [data, setData]   = useState<NetworkPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch('/api/status/network', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const activeMonitors = data?.monitors.filter(m => m.status === 'ACTIVE') ?? [];
  const hasIncident    = (data?.activeIncidents.length ?? 0) > 0;
  const hasOngoing     = data?.upcomingEvents.some(e => e.event_status === 'ONGOING') ?? false;
  const overall        = error ? 'error' : loading ? 'loading' : hasIncident ? 'incident' : hasOngoing ? 'maintenance' : 'ok';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* ── Header ── */}
      <SiteNavbar />

      <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-10 space-y-10">

        {/* ── Hero ── */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">État du réseau AlfyChat</h1>
          <p className="text-muted-foreground text-sm">Vue détaillée — incidents, pannes & maintenances</p>
          {data?.generatedAt && (
            <p className="text-[10px] text-muted-foreground/40">
              Mis à jour {new Date(data.generatedAt).toLocaleTimeString('fr-FR')}
            </p>
          )}
        </div>

        {/* ── Global status banner ── */}
        <GlobalBanner state={overall} />

        {/* ── Services grid ── */}
        <section className="space-y-4">
          <SectionHeader title="Services" />
          {loading && <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Array.from({length: 9}).map((_,i) => <SkeletonService key={i} />)}</div>}
          {!loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activeMonitors.map(m => <ServiceCard key={m.tag} m={m} incidents={data?.activeIncidents ?? []} />)}
            </div>
          )}
        </section>

        {/* ── Active incidents ── */}
        <section className="space-y-3">
          <SectionHeader title="Incidents actifs" count={data?.activeIncidents.length} />
          {!loading && (data?.activeIncidents.length ?? 0) === 0 && (
            <EmptyState icon={<CheckCircleIcon size={18} className="text-emerald-500" />} label="Aucun incident actif en ce moment." />
          )}
          {data?.activeIncidents.map(inc => (
            <IncidentRow key={inc.id} incident={inc} monitors={data.monitors} active />
          ))}
        </section>

        {/* ── Upcoming / ongoing maintenances ── */}
        <section className="space-y-3">
          <SectionHeader title="Maintenances planifiées & en cours" count={data?.upcomingEvents.length} />
          {!loading && (data?.upcomingEvents.length ?? 0) === 0 && (
            <EmptyState icon={<ClockIcon size={18} className="text-blue-500" />} label="Aucune maintenance planifiée." />
          )}
          {data?.upcomingEvents.map(evt => (
            <MaintenanceRow key={evt.id} evt={evt} monitors={data.monitors} />
          ))}
        </section>

        {/* ── Past incidents ── */}
        <section className="space-y-3">
          <SectionHeader title="Historique des incidents (90 jours)" count={data?.pastIncidents.length} />
          {!loading && (data?.pastIncidents.length ?? 0) === 0 && (
            <EmptyState icon={<CheckCircleIcon size={18} className="text-emerald-500" />} label="Aucun incident sur les 90 derniers jours." />
          )}
          {data?.pastIncidents.slice(0, 20).map(inc => (
            <IncidentRow key={inc.id} incident={inc} monitors={data.monitors} />
          ))}
          {(data?.pastIncidents.length ?? 0) > 20 && (
            <p className="text-xs text-muted-foreground/50 text-center">
              + {data!.pastIncidents.length - 20} incident(s) plus anciens —{' '}
              <a href="https://status.alfychat.app" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-muted-foreground">
                voir sur status.alfychat.app
              </a>
            </p>
          )}
        </section>

        {/* ── Past maintenances ── */}
        {(data?.pastEvents.length ?? 0) > 0 && (
          <section className="space-y-3">
            <SectionHeader title="Historique maintenances" count={data?.pastEvents.length} />
            {data?.pastEvents.slice(0, 10).map(evt => (
              <MaintenanceRow key={evt.id} evt={evt} monitors={data.monitors} past />
            ))}
          </section>
        )}

      </main>

      {/* ── Footer ── */}
      <SiteFooter />
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
        {title}
        {count !== undefined && count > 0 && (
          <span className="ml-2 px-1.5 py-0.5 rounded-full bg-muted/60 text-[10px] font-bold">{count}</span>
        )}
      </h2>
      <div className="h-px flex-1 bg-border/30" />
    </div>
  );
}

function GlobalBanner({ state }: { state: string }) {
  const config: Record<string, { Icon: any; label: string; cls: string }> = {
    ok:          { Icon: CheckCircleIcon,  label: 'Tous les systèmes opérationnels',    cls: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' },
    incident:    { Icon: XCircleIcon,      label: 'Incident en cours',                  cls: 'border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400' },
    maintenance: { Icon: ClockIcon,        label: 'Maintenance en cours',               cls: 'border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400' },
    loading:     { Icon: HelpCircleIcon,   label: 'Chargement…',                        cls: 'border-border/40 bg-muted/20 text-muted-foreground' },
    error:       { Icon: AlertTriangleIcon,label: 'Impossible de charger les données',  cls: 'border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400' },
  };
  const { Icon, label, cls } = config[state] ?? config.loading;
  return (
    <div className={`rounded-2xl border ${cls} px-5 py-4 flex items-center gap-3 shadow-sm`}>
      <Icon size={18} />
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
}

function ServiceCard({ m, incidents }: { m: Monitor; incidents: Incident[] }) {
  const Icon = TAG_TO_ICON[m.tag] ?? ServerIcon;
  const hasIncident = incidents.some(i => i.monitors.some(im => im.monitor_tag === m.tag));
  const dotCls = hasIncident ? 'bg-rose-500' : 'bg-emerald-500';
  const ringCls = hasIncident ? 'border-rose-500/30' : 'border-border/40';
  return (
    <div className={`rounded-2xl border ${ringCls} bg-card shadow-sm p-4 flex items-center gap-3`}>
      <Icon size={16} className="text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold truncate">{m.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`size-1.5 rounded-full ${dotCls}`} />
          <span className="text-[10px] text-muted-foreground">
            {hasIncident ? 'Incident' : 'Opérationnel'}
          </span>
        </div>
      </div>
    </div>
  );
}

function IncidentRow({ incident, monitors, active }: { incident: Incident; monitors: Monitor[]; active?: boolean }) {
  const impacted = incident.monitors
    .map(im => monitors.find(m => m.tag === im.monitor_tag)?.name ?? im.monitor_tag)
    .join(', ');
  const duration = fmtDuration(incident.start_date_time, incident.end_date_time);
  const border = active ? 'border-rose-500/30' : 'border-border/40';
  const badge  = active
    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
    : 'bg-muted/40 text-muted-foreground';

  return (
    <div className={`rounded-2xl border ${border} bg-card shadow-sm p-4 space-y-1.5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{incident.title}</p>
          {impacted && <p className="text-[11px] text-muted-foreground/80 mt-0.5">{impacted}</p>}
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${badge} shrink-0`}>
          {STATE_LABELS[incident.state] ?? incident.state}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground/60 flex flex-wrap gap-x-3 gap-y-0.5">
        <span>{fmtTs(incident.start_date_time)}</span>
        {incident.end_date_time && <span>→ {fmtTs(incident.end_date_time)}</span>}
        {duration && <span className="font-medium text-muted-foreground">({duration})</span>}
      </div>
    </div>
  );
}

function MaintenanceRow({ evt, monitors, past }: { evt: MaintenanceEvent; monitors: Monitor[]; past?: boolean }) {
  const impacted = (evt.maintenance?.monitors ?? [])
    .map(im => monitors.find(m => m.tag === im.monitor_tag)?.name ?? im.monitor_tag)
    .join(', ');
  const duration = fmtDuration(evt.start_date_time, evt.end_date_time);
  const isOngoing = evt.event_status === 'ONGOING';
  const border = isOngoing ? 'border-blue-500/30' : 'border-border/40';
  const badge  = isOngoing
    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    : past
    ? 'bg-muted/40 text-muted-foreground'
    : 'bg-blue-500/8 text-blue-500/80';

  return (
    <div className={`rounded-2xl border ${border} bg-card shadow-sm p-4 space-y-1.5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{evt.maintenance?.title ?? `Maintenance #${evt.maintenance_id}`}</p>
          {impacted && <p className="text-[11px] text-muted-foreground/80 mt-0.5">{impacted}</p>}
          {evt.maintenance?.description && (
            <p className="text-[11px] text-muted-foreground/60 mt-0.5 line-clamp-2">{evt.maintenance.description}</p>
          )}
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${badge} shrink-0`}>
          {EVT_STATUS_LABELS[evt.event_status] ?? evt.event_status}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground/60 flex flex-wrap gap-x-3 gap-y-0.5">
        <span>{fmtTs(evt.start_date_time)}</span>
        {evt.end_date_time && <span>→ {fmtTs(evt.end_date_time)}</span>}
        {duration && <span className="font-medium text-muted-foreground">({duration})</span>}
      </div>
    </div>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 px-1 py-2 text-sm text-muted-foreground/60 italic">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function SkeletonService() {
  return <div className="rounded-2xl border border-border/40 bg-card shadow-sm h-16 animate-pulse" />;
}
