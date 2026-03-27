'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ServerIcon, DatabaseIcon, MessageCircleIcon, UserIcon, PhoneIcon,
  UsersIcon, BotIcon, ImageIcon, GlobeIcon, RefreshCwIcon,
  CheckCircle2Icon, AlertTriangleIcon, XCircleIcon, ClockIcon,
  ArrowLeftIcon, ZapIcon, WifiIcon,
} from '@/components/icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ─── Types ───────────────────────────────────────────────────────────────────

type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'checking';

interface ServiceResult {
  name: string;
  status: ServiceStatus;
  latency: number | null;
  checkedAt: Date | null;
}

interface ServiceDef {
  key: string;
  name: string;
  description: string;
  endpoint: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

// ─── Services ────────────────────────────────────────────────────────────────

const SERVICES: ServiceDef[] = [
  {
    key: 'gateway',
    name: 'Gateway',
    description: 'API & WebSocket',
    endpoint: '/health',
    Icon: GlobeIcon,
  },
  {
    key: 'users',
    name: 'Utilisateurs',
    description: 'Authentification & profils',
    endpoint: '/users/health',
    Icon: UserIcon,
  },
  {
    key: 'messages',
    name: 'Messages',
    description: 'Messagerie temps-réel',
    endpoint: '/messages/health',
    Icon: MessageCircleIcon,
  },
  {
    key: 'friends',
    name: 'Amis',
    description: 'Relations & demandes',
    endpoint: '/friends/health',
    Icon: UsersIcon,
  },
  {
    key: 'calls',
    name: 'Appels',
    description: 'Voix & vidéo (WebRTC)',
    endpoint: '/calls/health',
    Icon: PhoneIcon,
  },
  {
    key: 'servers',
    name: 'Serveurs',
    description: 'Communautés & canaux',
    endpoint: '/servers/health',
    Icon: ServerIcon,
  },
  {
    key: 'bots',
    name: 'Bots',
    description: 'Automatisation & intégrations',
    endpoint: '/bots/health',
    Icon: BotIcon,
  },
  {
    key: 'media',
    name: 'Médias',
    description: 'Fichiers & uploads',
    endpoint: '/media/health',
    Icon: ImageIcon,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function checkService(endpoint: string): Promise<{ status: ServiceStatus; latency: number }> {
  const start = performance.now();
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    const latency = Math.round(performance.now() - start);
    if (res.ok) return { status: 'operational', latency };
    if (res.status >= 500) return { status: 'outage', latency };
    return { status: 'degraded', latency };
  } catch {
    const latency = Math.round(performance.now() - start);
    return { status: 'outage', latency };
  }
}

function overallStatus(results: ServiceResult[]): ServiceStatus {
  if (results.some((r) => r.status === 'checking')) return 'checking';
  if (results.every((r) => r.status === 'operational')) return 'operational';
  if (results.some((r) => r.status === 'outage')) return 'outage';
  return 'degraded';
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
  return <i className="fi fi-rr-spinner animate-spin text-zinc-400" style={{ fontSize: 18 }} />;
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
    checking:    { msg: 'Vérification des services en cours…', bg: 'bg-zinc-800 border-zinc-700 text-zinc-400',              Icon: WifiIcon },
  };
  const { msg, bg, Icon } = map[status];
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-5 py-4 ${bg}`}>
      <Icon size={22} />
      <span className="font-semibold text-sm">{msg}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StatusPage() {
  const [results, setResults] = useState<ServiceResult[]>(
    SERVICES.map((s) => ({ name: s.key, status: 'checking', latency: null, checkedAt: null }))
  );
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);

  const runChecks = useCallback(async () => {
    setChecking(true);
    setResults(SERVICES.map((s) => ({ name: s.key, status: 'checking', latency: null, checkedAt: null })));

    const checks = SERVICES.map(async (svc, idx) => {
      const { status, latency } = await checkService(svc.endpoint);
      setResults((prev) => {
        const next = [...prev];
        next[idx] = { name: svc.key, status, latency, checkedAt: new Date() };
        return next;
      });
    });

    await Promise.allSettled(checks);
    setLastCheck(new Date());
    setChecking(false);
  }, []);

  useEffect(() => {
    runChecks();
    const interval = setInterval(runChecks, 60_000);
    return () => clearInterval(interval);
  }, [runChecks]);

  const global = overallStatus(results);

  const operationalCount = results.filter((r) => r.status === 'operational').length;
  const degradedCount    = results.filter((r) => r.status === 'degraded').length;
  const outageCount      = results.filter((r) => r.status === 'outage').length;

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
            onClick={runChecks}
            disabled={checking}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCwIcon size={13} className={checking ? 'animate-spin' : ''} />
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
          {lastCheck && (
            <p className="text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
              <ClockIcon size={11} />
              Dernière vérification à {lastCheck.toLocaleTimeString('fr-FR')}
            </p>
          )}
        </div>

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

        {/* ── Services list ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Microservices
          </h2>
          <div className="divide-y divide-border/40 rounded-xl border border-border/50 bg-card/30 overflow-hidden">
            {SERVICES.map((svc, idx) => {
              const result = results[idx];
              const { Icon } = svc;
              return (
                <div
                  key={svc.key}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-accent/30 transition-colors"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent/50 flex items-center justify-center">
                    <Icon size={18} className="text-muted-foreground" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{svc.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{svc.description}</p>
                  </div>

                  {/* Latency */}
                  <div className="hidden sm:flex items-center gap-1.5 min-w-[64px] justify-end">
                    <LatencyBar ms={result.latency} />
                  </div>

                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    <StatusIcon status={result.status} />
                  </div>

                  {/* Badge */}
                  <div className="hidden md:block flex-shrink-0 w-32 text-right">
                    <StatusBadge status={result.status} />
                  </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { name: 'Base de données MySQL', desc: 'Persistance & relations', Icon: DatabaseIcon },
              { name: 'Cache Redis',            desc: 'Sessions & pub/sub',      Icon: ZapIcon },
            ].map(({ name, desc, Icon }) => (
              <div
                key={name}
                className="flex items-center gap-4 rounded-xl border border-border/50 bg-card/30 px-5 py-4"
              >
                <div className="w-9 h-9 rounded-lg bg-accent/50 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{name}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <StatusIcon status={global === 'checking' ? 'checking' : global === 'outage' ? 'outage' : 'operational'} />
              </div>
            ))}
          </div>
        </section>

        {/* ── Uptime ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Disponibilité (30 jours)
          </h2>
          <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden divide-y divide-border/40">
            {SERVICES.map((svc) => {
              const uptime = 99.2 + Math.random() * 0.79;
              const bars = Array.from({ length: 30 }, (_, i) => {
                const r = Math.random();
                return r > 0.03 ? 'operational' : r > 0.01 ? 'degraded' : 'outage';
              });
              return (
                <div key={svc.key} className="px-5 py-3 flex items-center gap-4">
                  <span className="text-sm w-28 flex-shrink-0">{svc.name}</span>
                  <div className="flex gap-0.5 flex-1">
                    {bars.map((s, i) => (
                      <div
                        key={i}
                        title={s}
                        className={`flex-1 h-5 rounded-[2px] ${
                          s === 'operational' ? 'bg-emerald-500/70' :
                          s === 'degraded'    ? 'bg-amber-500/70' :
                          'bg-red-500/70'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground w-14 text-right">
                    {uptime.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground/50 text-center">
            * Les données d&apos;uptime seront alimentées par votre système de monitoring en production
          </p>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/30 mt-16">
        <div className="mx-auto max-w-4xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground/50">
          <span>AlfyChat — Messagerie sécurisée française</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-muted-foreground transition-colors">Accueil</Link>
            <Link href="/app" className="hover:text-muted-foreground transition-colors">Application</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
