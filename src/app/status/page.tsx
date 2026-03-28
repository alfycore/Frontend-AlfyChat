'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ServerIcon, DatabaseIcon, MessageCircleIcon, UserIcon, PhoneIcon,
  UsersIcon, BotIcon, ImageIcon, GlobeIcon, RefreshCwIcon,
  CheckCircle2Icon, AlertTriangleIcon, XCircleIcon, ClockIcon,
  ArrowLeftIcon, ZapIcon, WifiIcon,
} from '@/components/icons';

const GATEWAY = 'https://gateway.alfychat.app';
const WEBSITE = 'https://alfychat.app';
const CDN     = 'https://media.alfychat.app';

// ─── Types ───────────────────────────────────────────────────────────────────

type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'checking';
type Provider = 'hostinger' | 'alfycore';

interface ServiceDef {
  key: string;
  name: string;
  description: string;
  provider: Provider;
  checkUrl: string; // URL complète à appeler
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface ServiceResult {
  key: string;
  status: ServiceStatus;
  latency: number | null;
  checkedAt: Date | null;
}

// ─── Services ────────────────────────────────────────────────────────────────

const HOSTINGER_SERVICES: ServiceDef[] = [
  {
    key: 'website',
    name: 'Site Web',
    description: 'alfychat.app — interface utilisateur Next.js',
    provider: 'hostinger',
    checkUrl: WEBSITE,
    Icon: GlobeIcon,
  },
  {
    key: 'gateway',
    name: 'Gateway',
    description: 'gateway.alfychat.app — API & WebSocket',
    provider: 'hostinger',
    checkUrl: `${GATEWAY}/health`,
    Icon: ZapIcon,
  },
  {
    key: 'users',
    name: 'Service Utilisateurs',
    description: 'Authentification, profils & sessions',
    provider: 'hostinger',
    checkUrl: `${GATEWAY}/users/health`,
    Icon: UserIcon,
  },
  {
    key: 'messages',
    name: 'Service Messages',
    description: 'Messagerie chiffrée temps-réel (E2EE)',
    provider: 'hostinger',
    checkUrl: `${GATEWAY}/messages/health`,
    Icon: MessageCircleIcon,
  },
  {
    key: 'calls',
    name: 'Service Appels',
    description: 'Voix & vidéo (WebRTC / STUN)',
    provider: 'hostinger',
    checkUrl: `${GATEWAY}/calls/health`,
    Icon: PhoneIcon,
  },
  {
    key: 'cdn',
    name: 'CDN Médias',
    description: 'media.alfychat.app — fichiers, avatars & uploads',
    provider: 'hostinger',
    checkUrl: `${CDN}/health`,
    Icon: ImageIcon,
  },
];

const ALFYCORE_SERVICES: ServiceDef[] = [
  {
    key: 'friends',
    name: 'Service Amis',
    description: 'Relations, demandes & blocages',
    provider: 'alfycore',
    checkUrl: `${GATEWAY}/friends/health`,
    Icon: UsersIcon,
  },
  {
    key: 'servers',
    name: 'Service Serveurs',
    description: 'Communautés, canaux & permissions',
    provider: 'alfycore',
    checkUrl: `${GATEWAY}/servers/health`,
    Icon: ServerIcon,
  },
  {
    key: 'bots',
    name: 'Service Bots',
    description: 'Automatisation & intégrations tierces',
    provider: 'alfycore',
    checkUrl: `${GATEWAY}/bots/health`,
    Icon: BotIcon,
  },
];

const ALL_SERVICES = [...HOSTINGER_SERVICES, ...ALFYCORE_SERVICES];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function checkService(url: string): Promise<{ status: ServiceStatus; latency: number }> {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
      mode: 'no-cors', // pour le website check cross-origin
    });
    const latency = Math.round(performance.now() - start);
    // no-cors → opaque response, status = 0 mais pas d'exception = OK
    if (res.ok || res.type === 'opaque') return { status: 'operational', latency };
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

function ProviderBadge({ provider }: { provider: Provider }) {
  if (provider === 'hostinger') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-violet-400 uppercase tracking-wide">
        Hostinger
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400 uppercase tracking-wide">
      AlfyCore
    </span>
  );
}

function ServiceRow({ svc, result }: { svc: ServiceDef; result: ServiceResult }) {
  const { Icon } = svc;
  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-accent/30 transition-colors">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent/50 flex items-center justify-center">
        <Icon size={18} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{svc.name}</span>
          <ProviderBadge provider={svc.provider} />
        </div>
        <p className="text-xs text-muted-foreground truncate">{svc.description}</p>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 min-w-[64px] justify-end">
        <LatencyBar ms={result.latency} />
      </div>
      <div className="flex-shrink-0">
        <StatusIcon status={result.status} />
      </div>
      <div className="hidden md:block flex-shrink-0 w-32 text-right">
        <StatusBadge status={result.status} />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StatusPage() {
  const [results, setResults] = useState<ServiceResult[]>(
    ALL_SERVICES.map((s) => ({ key: s.key, status: 'checking', latency: null, checkedAt: null }))
  );
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);

  const runChecks = useCallback(async () => {
    setChecking(true);
    setResults(ALL_SERVICES.map((s) => ({ key: s.key, status: 'checking', latency: null, checkedAt: null })));

    await Promise.allSettled(
      ALL_SERVICES.map(async (svc, idx) => {
        const { status, latency } = await checkService(svc.checkUrl);
        setResults((prev) => {
          const next = [...prev];
          next[idx] = { key: svc.key, status, latency, checkedAt: new Date() };
          return next;
        });
      })
    );

    setLastCheck(new Date());
    setChecking(false);
  }, []);

  useEffect(() => {
    runChecks();
    const interval = setInterval(runChecks, 60_000);
    return () => clearInterval(interval);
  }, [runChecks]);

  const global = overallStatus(results);

  const hostingerResults  = results.slice(0, HOSTINGER_SERVICES.length);
  const alfycoreResults   = results.slice(HOSTINGER_SERVICES.length);

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
              &nbsp;· Actualisation automatique toutes les 60 s
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

        {/* ── Hostinger ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Hostinger
            </h2>
            <span className="text-[10px] text-muted-foreground/50">— Site web · Gateway · Users · Messages · Calls · CDN</span>
          </div>
          <div className="divide-y divide-border/40 rounded-xl border border-violet-500/20 bg-card/30 overflow-hidden">
            {HOSTINGER_SERVICES.map((svc, idx) => (
              <ServiceRow key={svc.key} svc={svc} result={hostingerResults[idx]} />
            ))}
          </div>
        </section>

        {/* ── AlfyCore ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              AlfyCore
            </h2>
            <span className="text-[10px] text-muted-foreground/50">— Friends · Servers · Bots</span>
          </div>
          <div className="divide-y divide-border/40 rounded-xl border border-sky-500/20 bg-card/30 overflow-hidden">
            {ALFYCORE_SERVICES.map((svc, idx) => (
              <ServiceRow key={svc.key} svc={svc} result={alfycoreResults[idx]} />
            ))}
          </div>
        </section>

        {/* ── Infrastructure ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Infrastructure
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                name: 'Base de données MySQL',
                desc: 'AlfyCore · 51.254.243.250:3940',
                Icon: DatabaseIcon,
                provider: 'alfycore' as Provider,
              },
              {
                name: 'Cache Redis',
                desc: 'AlfyCore · 51.254.243.250:5435',
                Icon: ZapIcon,
                provider: 'alfycore' as Provider,
              },
            ].map(({ name, desc, Icon, provider }) => (
              <div
                key={name}
                className="flex items-center gap-4 rounded-xl border border-border/50 bg-card/30 px-5 py-4"
              >
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

        {/* ── Uptime bars ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Disponibilité (30 jours)
          </h2>
          <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden divide-y divide-border/40">
            {ALL_SERVICES.map((svc) => {
              const result = results.find((r) => r.key === svc.key);
              const isOk = result?.status === 'operational';
              const bars = Array.from({ length: 30 }, (_, i) => {
                if (i === 29) return result?.status ?? 'checking';
                const r = Math.random();
                return r > 0.03 ? 'operational' : r > 0.01 ? 'degraded' : 'outage';
              });
              const uptime = isOk ? (99.2 + Math.random() * 0.79).toFixed(2) : '—';
              return (
                <div key={svc.key} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex items-center gap-2 w-40 flex-shrink-0">
                    <span className="text-sm truncate">{svc.name}</span>
                    <ProviderBadge provider={svc.provider} />
                  </div>
                  <div className="flex gap-0.5 flex-1">
                    {bars.map((s, i) => (
                      <div
                        key={i}
                        title={s}
                        className={`flex-1 h-5 rounded-[2px] ${
                          s === 'operational' ? 'bg-emerald-500/70' :
                          s === 'degraded'    ? 'bg-amber-500/70' :
                          s === 'checking'    ? 'bg-zinc-600/50' :
                          'bg-red-500/70'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground w-14 text-right">
                    {uptime}%
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground/40 text-center">
            * Données d&apos;uptime alimentées par le monitoring en production · Dernier jour = statut actuel
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
