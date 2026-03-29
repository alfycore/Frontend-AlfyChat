'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ServerIcon, DatabaseIcon, MessageCircleIcon, UserIcon, PhoneIcon,
  UsersIcon, BotIcon, ImageIcon, GlobeIcon, RefreshCwIcon,
  CheckCircle2Icon, AlertTriangleIcon, XCircleIcon, ClockIcon,
  ArrowLeftIcon, ZapIcon, WifiIcon, ChevronDownIcon, ChevronRightIcon,
} from '@/components/icons';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://gateway.alfychat.app';

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'checking';
type Provider = 'hostinger' | 'alfycore';
type IncidentSeverity = 'info' | 'warning' | 'critical';
type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

interface Incident {
  id: number;
  title: string;
  message: string | null;
  severity: IncidentSeverity;
  services: string | null;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface ServiceHistory {
  service: string;
  status: string;
  response_time_ms: number | null;
}

interface PublicInstance {
  serviceType: string;
  domain: string;
  location: string;
  healthy: boolean;
  lastHeartbeat: string;
  score: number;
}

interface UptimeDay {
  date: string;
  uptime_pct: number;
}

interface ServiceDef {
  key: string;
  name: string;
  description: string;
  provider: Provider;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

// ─── Service definitions ──────────────────────────────────────────────────────

const SERVICE_DEFS: ServiceDef[] = [
  { key: 'website',  name: 'Site Web',              description: 'alfychat.app — interface utilisateur Next.js',       provider: 'hostinger', Icon: GlobeIcon },
  { key: 'gateway',  name: 'Gateway',                description: 'gateway.alfychat.app — API & WebSocket',            provider: 'hostinger', Icon: ZapIcon },
  { key: 'users',    name: 'Service Utilisateurs',   description: 'Authentification, profils & sessions',              provider: 'hostinger', Icon: UserIcon },
  { key: 'messages', name: 'Service Messages',       description: 'Messagerie chiffrée temps-réel (E2EE)',             provider: 'hostinger', Icon: MessageCircleIcon },
  { key: 'calls',    name: 'Service Appels',         description: 'Voix & vidéo (WebRTC / STUN)',                      provider: 'hostinger', Icon: PhoneIcon },
  { key: 'friends',  name: 'Service Amis',           description: 'Relations, demandes & blocages',                   provider: 'alfycore',  Icon: UsersIcon },
  { key: 'servers',  name: 'Service Serveurs',       description: 'Communautés, canaux & permissions',                provider: 'alfycore',  Icon: ServerIcon },
  { key: 'bots',     name: 'Service Bots',           description: 'Automatisation & intégrations tierces',            provider: 'alfycore',  Icon: BotIcon },
  { key: 'media',    name: 'Service Médias',         description: 'media.alfychat.app — fichiers, avatars & uploads',  provider: 'alfycore',  Icon: ImageIcon },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dbStatusToUi(status: string): ServiceStatus {
  if (status === 'up') return 'operational';
  if (status === 'degraded') return 'degraded';
  return 'outage';
}

function overallFromStatuses(statuses: ServiceStatus[]): ServiceStatus {
  if (statuses.some((s) => s === 'checking')) return 'checking';
  if (statuses.every((s) => s === 'operational')) return 'operational';
  if (statuses.some((s) => s === 'outage')) return 'outage';
  return 'degraded';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ServiceStatus }) {
  const map: Record<ServiceStatus, { label: string; cls: string }> = {
    operational: { label: 'Opérationnel', cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
    degraded:    { label: 'Dégradé',      cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
    outage:      { label: 'Panne',         cls: 'bg-red-500/15 text-red-400 border border-red-500/30' },
    checking:    { label: 'Vérification…', cls: 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/30' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${
        status === 'operational' ? 'bg-emerald-400 animate-pulse' :
        status === 'degraded'    ? 'bg-amber-400 animate-pulse' :
        status === 'outage'      ? 'bg-red-400' : 'bg-zinc-500'
      }`} />
      {label}
    </span>
  );
}

function StatusIcon({ status }: { status: ServiceStatus }) {
  if (status === 'operational') return <CheckCircle2Icon size={18} className="text-emerald-400" />;
  if (status === 'degraded')    return <AlertTriangleIcon size={18} className="text-amber-400" />;
  if (status === 'outage')      return <XCircleIcon size={18} className="text-red-400" />;
  return <RefreshCwIcon size={15} className="animate-spin text-zinc-400" />;
}

function LatencyBar({ ms }: { ms: number | null }) {
  if (ms === null) return <span className="text-zinc-600 text-xs">—</span>;
  const color = ms < 150 ? 'text-emerald-400' : ms < 400 ? 'text-amber-400' : 'text-red-400';
  return <span className={`text-xs font-mono tabular-nums ${color}`}>{ms} ms</span>;
}

function GlobalBanner({ status }: { status: ServiceStatus }) {
  const map: Record<ServiceStatus, { msg: string; bg: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
    operational: { msg: 'Tous les systèmes sont opérationnels', bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', Icon: CheckCircle2Icon },
    degraded:    { msg: 'Certains services sont dégradés',     bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',     Icon: AlertTriangleIcon },
    outage:      { msg: 'Une panne est en cours',               bg: 'bg-red-500/10 border-red-500/30 text-red-300',           Icon: XCircleIcon },
    checking:    { msg: 'Chargement des données de monitoring…', bg: 'bg-zinc-800 border-zinc-700 text-zinc-400',             Icon: WifiIcon },
  };
  const { msg, bg, Icon } = map[status];
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-5 py-4 ${bg}`}>
      <Icon size={22} />
      <span className="font-semibold text-sm">{msg}</span>
    </div>
  );
}

function ProviderBadge({ provider }: { provider: Provider }) {
  if (provider === 'hostinger') {
    return (
      <span className="inline-flex items-center rounded-md bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-violet-400 uppercase tracking-wide">
        Hostinger
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400 uppercase tracking-wide">
      AlfyCore
    </span>
  );
}

function IncidentBadge({ severity, status }: { severity: IncidentSeverity; status: IncidentStatus }) {
  const sevCls: Record<IncidentSeverity, string> = {
    info:     'bg-sky-500/10 text-sky-400 border-sky-500/25',
    warning:  'bg-amber-500/10 text-amber-400 border-amber-500/25',
    critical: 'bg-red-500/10 text-red-400 border-red-500/25',
  };
  const statusLabel: Record<IncidentStatus, string> = {
    investigating: 'Investigation',
    identified:    'Identifié',
    monitoring:    'Surveillance',
    resolved:      'Résolu',
  };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${sevCls[severity]}`}>
        {severity === 'critical' ? 'Critique' : severity === 'warning' ? 'Avertissement' : 'Info'}
      </span>
      <span className="inline-flex items-center rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-xs text-zinc-400">
        {statusLabel[status]}
      </span>
    </div>
  );
}

function UptimeBars({ days }: { days: UptimeDay[] }) {
  // Fill to 90 days with placeholders if not enough data
  const padded: (UptimeDay | null)[] = Array.from({ length: 90 }, (_, i) => {
    // last = most recent
    const dIdx = days.length - 90 + i;
    return dIdx >= 0 ? days[dIdx] : null;
  });

  const avgUptime = days.length > 0
    ? (days.reduce((s, d) => s + d.uptime_pct, 0) / days.length).toFixed(2)
    : null;

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-3">
        <div className="flex gap-0.5 flex-1">
          {padded.map((d, i) => (
            <div
              key={i}
              title={d ? `${d.date}: ${d.uptime_pct}%` : 'Aucune donnée'}
              className={`flex-1 h-5 rounded-[2px] ${
                !d                 ? 'bg-zinc-700/30' :
                d.uptime_pct >= 99 ? 'bg-emerald-500/70' :
                d.uptime_pct >= 90 ? 'bg-amber-500/70' :
                'bg-red-500/70'
              }`}
            />
          ))}
        </div>
        <span className="text-xs tabular-nums text-muted-foreground w-14 text-right flex-shrink-0">
          {avgUptime != null ? `${avgUptime}%` : '—'}
        </span>
      </div>
      <div className="flex justify-between mt-0.5 pr-[3.75rem]">
        <span className="text-[10px] text-muted-foreground/40">Il y a 90 jours</span>
        <span className="text-[10px] text-muted-foreground/40">Aujourd&apos;hui</span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StatusPage() {
  const [services, setServices] = useState<ServiceHistory[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [uptime, setUptime] = useState<Record<string, UptimeDay[]>>({});
  const [instances, setInstances] = useState<PublicInstance[]>([]);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [error, setError] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${GATEWAY_URL}/api/status`, { cache: 'no-store' });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setServices(data.services ?? []);
      setIncidents(data.incidents ?? []);
      setUptime(data.uptime ?? {});
      setInstances(data.instances ?? []);
      setLastFetch(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleService = (key: string) => {
    setExpandedServices(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 60_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  // Build per-service status map from DB data
  const statusMap: Record<string, ServiceStatus> = {};
  const latencyMap: Record<string, number | null> = {};
  for (const s of services) {
    statusMap[s.service] = dbStatusToUi(s.status);
    latencyMap[s.service] = s.response_time_ms;
  }

  const allStatuses: ServiceStatus[] = loading
    ? SERVICE_DEFS.map(() => 'checking')
    : SERVICE_DEFS.map((d) => statusMap[d.key] ?? 'checking');

  const global = overallFromStatuses(allStatuses);

  const operationalCount = allStatuses.filter((s) => s === 'operational').length;
  const degradedCount    = allStatuses.filter((s) => s === 'degraded').length;
  const outageCount      = allStatuses.filter((s) => s === 'outage').length;

  const hostingerDefs = SERVICE_DEFS.filter((d) => d.provider === 'hostinger');
  const alfycoreDefs  = SERVICE_DEFS.filter((d) => d.provider === 'alfycore');

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Header ── */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeftIcon size={16} />
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <ZapIcon size={18} className="text-primary" />
              <span className="font-semibold text-sm">AlfyChat Status</span>
            </div>
          </div>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCwIcon size={13} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 space-y-8">

        {/* ── Hero ── */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">État des services</h1>
          <p className="text-muted-foreground text-sm">
            Surveillance en temps réel de l&apos;infrastructure AlfyChat
          </p>
          {lastFetch && (
            <p className="text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
              <ClockIcon size={11} />
              Dernière mise à jour à {lastFetch.toLocaleTimeString('fr-FR')}
              &nbsp;· Actualisation automatique toutes les 60 s
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-400">
            <XCircleIcon size={18} />
            <span className="text-sm">Impossible de charger les données de monitoring.</span>
          </div>
        )}

        {/* ── Global banner ── */}
        <GlobalBanner status={global} />

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Opérationnels', count: operationalCount, color: 'text-emerald-400' },
            { label: 'Dégradés',      count: degradedCount,    color: 'text-amber-400' },
            { label: 'En panne',      count: outageCount,      color: 'text-red-400' },
          ].map(({ label, count, color }) => (
            <div key={label} className="rounded-xl border border-border/50 bg-card/50 p-4 text-center">
              <div className={`text-2xl font-bold tabular-nums ${color}`}>{count}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Active incidents ── */}
        {incidents.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Incidents en cours
            </h2>
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className={`rounded-xl border px-5 py-4 space-y-2 ${
                    inc.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' :
                    inc.severity === 'warning'  ? 'border-amber-500/30 bg-amber-500/5' :
                    'border-sky-500/30 bg-sky-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <p className="font-semibold text-sm">{inc.title}</p>
                    <IncidentBadge severity={inc.severity} status={inc.status} />
                  </div>
                  {inc.message && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{inc.message}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground/50 flex items-center gap-1">
                    <ClockIcon size={10} />
                    Signalé le {fmtDate(inc.created_at)}
                    {inc.updated_at !== inc.created_at && ` · Mis à jour le ${fmtDate(inc.updated_at)}`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Hostinger ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hostinger</h2>
            <span className="text-[10px] text-muted-foreground/50">— Site web · Gateway · Users · Messages · Calls</span>
          </div>
          <div className="divide-y divide-border/40 rounded-xl border border-violet-500/20 bg-card/30 overflow-hidden">
            {hostingerDefs.map((svc) => {
              const st = allStatuses[SERVICE_DEFS.indexOf(svc)];
              const { Icon } = svc;
              const svcInstances = instances.filter(i => i.serviceType === svc.key);
              const isExpanded = expandedServices.has(svc.key);
              return (
                <div key={svc.key}>
                  <button
                    onClick={() => svcInstances.length > 0 && toggleService(svc.key)}
                    className={`w-full flex items-center gap-4 px-5 py-4 transition-colors text-left ${
                      svcInstances.length > 0 ? 'hover:bg-accent/30 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent/50 flex items-center justify-center">
                      <Icon size={18} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{svc.name}</span>
                        <ProviderBadge provider={svc.provider} />
                        {svcInstances.length > 0 && (
                          <span className="text-[10px] text-muted-foreground/50">{svcInstances.length} instance{svcInstances.length > 1 ? 's' : ''}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{svc.description}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 min-w-[64px] justify-end">
                      <LatencyBar ms={latencyMap[svc.key] ?? null} />
                    </div>
                    <div className="flex-shrink-0"><StatusIcon status={st} /></div>
                    <div className="hidden md:block flex-shrink-0 w-32 text-right">
                      <StatusBadge status={st} />
                    </div>
                    {svcInstances.length > 0 && (
                      <div className="flex-shrink-0 text-muted-foreground/50">
                        {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
                      </div>
                    )}
                  </button>
                  {isExpanded && svcInstances.length > 0 && (
                    <div className="border-t border-border/40 bg-accent/10 divide-y divide-border/30">
                      {svcInstances.map((inst, idx) => {
                        const stale = Date.now() - new Date(inst.lastHeartbeat).getTime() > 90_000;
                        const dotColor = !inst.healthy ? 'bg-red-400' : stale ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse';
                        const label = !inst.healthy ? 'Hors ligne' : stale ? 'Inactif' : 'En ligne';
                        const labelColor = !inst.healthy ? 'text-red-400' : stale ? 'text-amber-400' : 'text-emerald-400';
                        return (
                          <div key={idx} className="flex items-center gap-3 px-6 py-2.5">
                            <span className={`size-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                            <span className="text-sm font-medium text-foreground flex-1 truncate">{inst.domain}</span>
                            <span className="text-[10px] font-semibold rounded-md bg-accent/60 border border-border/40 px-1.5 py-0.5 text-muted-foreground uppercase tracking-wide">{inst.location}</span>
                            <span className={`text-xs font-medium ${labelColor}`}>{label}</span>
                            <span className="hidden sm:block text-[10px] text-muted-foreground/40 tabular-nums">
                              {new Date(inst.lastHeartbeat).toLocaleTimeString('fr-FR')}
                            </span>
                            <span className={`hidden sm:block text-xs tabular-nums font-semibold ${
                              inst.score >= 80 ? 'text-emerald-400' : inst.score >= 50 ? 'text-amber-400' : 'text-red-400'
                            }`}>score {inst.score}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── AlfyCore ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">AlfyCore</h2>
            <span className="text-[10px] text-muted-foreground/50">— Friends · Servers · Bots · Médias</span>
          </div>
          <div className="divide-y divide-border/40 rounded-xl border border-sky-500/20 bg-card/30 overflow-hidden">
            {alfycoreDefs.map((svc) => {
              const st = allStatuses[SERVICE_DEFS.indexOf(svc)];
              const { Icon } = svc;
              const svcInstances = instances.filter(i => i.serviceType === svc.key);
              const isExpanded = expandedServices.has(svc.key);
              return (
                <div key={svc.key}>
                  <button
                    onClick={() => svcInstances.length > 0 && toggleService(svc.key)}
                    className={`w-full flex items-center gap-4 px-5 py-4 transition-colors text-left ${
                      svcInstances.length > 0 ? 'hover:bg-accent/30 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent/50 flex items-center justify-center">
                      <Icon size={18} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{svc.name}</span>
                        <ProviderBadge provider={svc.provider} />
                        {svcInstances.length > 0 && (
                          <span className="text-[10px] text-muted-foreground/50">{svcInstances.length} instance{svcInstances.length > 1 ? 's' : ''}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{svc.description}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 min-w-[64px] justify-end">
                      <LatencyBar ms={latencyMap[svc.key] ?? null} />
                    </div>
                    <div className="flex-shrink-0"><StatusIcon status={st} /></div>
                    <div className="hidden md:block flex-shrink-0 w-32 text-right">
                      <StatusBadge status={st} />
                    </div>
                    {svcInstances.length > 0 && (
                      <div className="flex-shrink-0 text-muted-foreground/50">
                        {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
                      </div>
                    )}
                  </button>
                  {isExpanded && svcInstances.length > 0 && (
                    <div className="border-t border-border/40 bg-accent/10 divide-y divide-border/30">
                      {svcInstances.map((inst, idx) => {
                        const stale = Date.now() - new Date(inst.lastHeartbeat).getTime() > 90_000;
                        const dotColor = !inst.healthy ? 'bg-red-400' : stale ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse';
                        const label = !inst.healthy ? 'Hors ligne' : stale ? 'Inactif' : 'En ligne';
                        const labelColor = !inst.healthy ? 'text-red-400' : stale ? 'text-amber-400' : 'text-emerald-400';
                        return (
                          <div key={idx} className="flex items-center gap-3 px-6 py-2.5">
                            <span className={`size-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                            <span className="text-sm font-medium text-foreground flex-1 truncate">{inst.domain}</span>
                            <span className="text-[10px] font-semibold rounded-md bg-accent/60 border border-border/40 px-1.5 py-0.5 text-muted-foreground uppercase tracking-wide">{inst.location}</span>
                            <span className={`text-xs font-medium ${labelColor}`}>{label}</span>
                            <span className="hidden sm:block text-[10px] text-muted-foreground/40 tabular-nums">
                              {new Date(inst.lastHeartbeat).toLocaleTimeString('fr-FR')}
                            </span>
                            <span className={`hidden sm:block text-xs tabular-nums font-semibold ${
                              inst.score >= 80 ? 'text-emerald-400' : inst.score >= 50 ? 'text-amber-400' : 'text-red-400'
                            }`}>score {inst.score}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Infrastructure ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Infrastructure
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { name: 'Base de données MySQL', desc: 'AlfyCore · 51.254.243.250:3940', Icon: DatabaseIcon, provider: 'alfycore' as Provider },
              { name: 'Cache Redis',            desc: 'AlfyCore · 51.254.243.250:5435', Icon: ZapIcon,      provider: 'alfycore' as Provider },
              { name: 'CDN Hostinger',          desc: 'Hostinger · Distribution statique & médias', Icon: GlobeIcon, provider: 'hostinger' as Provider },
            ].map(({ name, desc, Icon, provider }) => (
              <div key={name} className="flex items-center gap-4 rounded-xl border border-border/50 bg-card/30 px-5 py-4">
                <div className="w-9 h-9 rounded-lg bg-accent/50 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{name}</p>
                    <ProviderBadge provider={provider} />
                  </div>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <StatusIcon status={global === 'checking' ? 'checking' : global === 'outage' ? 'outage' : 'operational'} />
              </div>
            ))}
          </div>
        </section>

        {/* ── Uptime bars (90 days from DB) ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Disponibilité (90 jours)
          </h2>
          <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden divide-y divide-border/40">
            {SERVICE_DEFS.map((svc) => (
              <div key={svc.key} className="px-5 py-3 flex items-center gap-4">
                <div className="flex items-center gap-2 w-40 flex-shrink-0">
                  <span className="text-sm truncate">{svc.name}</span>
                  <ProviderBadge provider={svc.provider} />
                </div>
                <UptimeBars days={uptime[svc.key] ?? []} />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/40 text-center">
            Données issues du monitoring automatique · 1 barre = 1 jour · 90 derniers jours
          </p>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/30 mt-16">
        <div className="mx-auto max-w-4xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground/50">
          <div className="flex items-center gap-3">
            <span>AlfyChat — Messagerie sécurisée</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-500/70 inline-block" /> Hostinger
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500/70 inline-block" /> AlfyCore
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-muted-foreground transition-colors">Accueil</Link>
            <Link href="/app" className="hover:text-muted-foreground transition-colors">Application</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
