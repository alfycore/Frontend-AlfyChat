'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
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
} from '@/components/icons';
import { useTranslation } from '@/components/locale-provider';
import { SiteNavbar } from '@/components/site-navbar';
import { SiteFooter } from '@/components/site-footer';

// ── Types ───────────────────────────────────────────────────────────────────

type PointStatus = 'UP' | 'DEGRADED' | 'DOWN' | 'NO_DATA';

interface DayBucket {
  date: string;
  status: PointStatus;
  up: number;
  degraded: number;
  down: number;
  avgLatency: number | null;
  maintenanceMinutes: number;
}

interface MonitorSummary {
  tag: string;
  name: string;
  current: PointStatus;
  uptime: number | null;
  avgLatency: number | null;
  days: DayBucket[];
}

interface IncidentMonitor { monitor_tag: string; impact: 'UP' | 'DEGRADED' | 'DOWN' }
interface Incident {
  id: number;
  title: string;
  start_date_time: number;
  end_date_time: number | null;
  state: string; // INVESTIGATING | IDENTIFIED | MONITORING | RESOLVED
  status?: string;
  incident_type: string;
  monitors: IncidentMonitor[];
}

interface SummaryPayload {
  generatedAt: string;
  windowDays: number;
  overall: 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  monitors: MonitorSummary[];
  incidents: Incident[];
  maintenanceEvents?: any[];
}

// ── Gradient bar style based on proportional UP/DEGRADED/DOWN/MAINTENANCE ──
function getBarStyle(d: DayBucket): React.CSSProperties {
  const total = d.up + d.degraded + d.down;
  const maintFrac = Math.min(1, d.maintenanceMinutes / 1440);

  if (total === 0 && d.maintenanceMinutes === 0) return { background: 'rgba(100,116,139,0.25)' };
  if (total === 0 && d.maintenanceMinutes > 0)   return { background: 'rgba(59,130,246,0.6)' };

  // Proportions of data points, scaled to the non-maintenance fraction of the day
  const dataFrac = 1 - maintFrac;
  const upFrac   = (d.up      / total) * dataFrac;
  const degFrac  = (d.degraded / total) * dataFrac;
  const downFrac = (d.down    / total) * dataFrac;

  // Single-color fast paths
  if (downFrac === 0 && degFrac === 0 && maintFrac === 0) return { background: 'rgba(34,197,94,0.72)' };
  if (upFrac   === 0 && degFrac === 0 && maintFrac === 0) return { background: 'rgba(239,68,68,0.8)' };

  // Build gradient bottom-to-top: maintenance → up → degraded → down
  const stops: string[] = [];
  let pos = 0;
  const push = (color: string, frac: number) => {
    if (frac <= 0) return;
    const end = +(pos + frac * 100).toFixed(2);
    stops.push(`${color} ${pos.toFixed(2)}% ${end}%`);
    pos = end;
  };
  push('rgba(59,130,246,0.65)', maintFrac); // blue — maintenance
  push('rgba(34,197,94,0.75)',  upFrac);    // green — up
  push('rgba(245,158,11,0.82)', degFrac);   // amber — degraded
  push('rgba(239,68,68,0.85)',  downFrac);  // red   — down

  if (stops.length === 1) return { background: stops[0].split(' ')[0] };
  return { background: `linear-gradient(to top, ${stops.join(', ')})` };
}

// ── Static mapping: monitor tag → display icon ──────────────────────────────
// We rely on Kener's "name" field for the label; only the icon comes from here.

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

// ── Page ────────────────────────────────────────────────────────────────────

export default function StatusPage() {
  const { t } = useTranslation();
  const s = t.static.statusPage;

  const [data, setData] = useState<SummaryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/status/summary?days=60', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as SummaryPayload;
        if (!cancelled) { setData(json); setError(null); }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'error');
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const activeIncidents  = useMemo(() => (data?.incidents ?? []).filter(i => i.state !== 'RESOLVED' && !i.end_date_time), [data]);
  const pastIncidents    = useMemo(() => (data?.incidents ?? []).filter(i => i.state === 'RESOLVED' || !!i.end_date_time)
    .sort((a, b) => b.start_date_time - a.start_date_time).slice(0, 5), [data]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* ── Header ── */}
      <SiteNavbar />

      <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-12 space-y-10">

        {/* ── Hero ── */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight bg-linear-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            {s.heading}
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            {s.subtitle}
          </p>
        </div>

        {/* ── Overall banner ── */}
        <OverallBanner overall={data?.overall ?? null} error={error} s={s} />

        {/* ── Incidents ── */}
        <section className="space-y-3">
          <SectionHeader title={s.sectionIncidents} />
          {!data && !error && <SkeletonCard />}
          {data && activeIncidents.length === 0 && pastIncidents.length === 0 && (
            <p className="text-sm text-muted-foreground/70 italic px-1">{s.noIncidents}</p>
          )}
          {activeIncidents.map(inc => (
            <IncidentCard key={inc.id} incident={inc} monitors={data!.monitors} s={s} active />
          ))}
          {pastIncidents.map(inc => (
            <IncidentCard key={inc.id} incident={inc} monitors={data?.monitors ?? []} s={s} />
          ))}
        </section>

        {/* ── Monitors ── */}
        <section className="space-y-4">
          <SectionHeader title={s.sectionMonitors} />
          <div className="grid gap-3">
            {!data && !error && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
            {data?.monitors.map(m => <MonitorRow key={m.tag} m={m} s={s} />)}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50 mt-2 flex-wrap">
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-emerald-500/70 inline-block" /> Opérationnel</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-amber-500/80 inline-block" /> Dégradé</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-rose-500/80 inline-block" /> En panne</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-blue-500/65 inline-block" /> Maintenance</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-muted/50 inline-block" /> Pas de données</span>
          </div>
          <p className="text-[11px] text-muted-foreground/40 text-center pt-1">
            {s.attribution}
          </p>
        </section>

      </main>

      {/* ── Footer ── */}
      <SiteFooter />
    </div>
  );
}

// ── Subcomponents ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
        {title}
      </h2>
      <div className="h-px flex-1 bg-border/30" />
    </div>
  );
}

function OverallBanner({
  overall, error, s,
}: {
  overall: SummaryPayload['overall'] | null;
  error: string | null;
  s: any;
}) {
  if (error) {
    return (
      <Banner
        tone="red"
        Icon={XCircleIcon}
        title={s.loadError}
        subtitle={error}
      />
    );
  }
  if (!overall) {
    return <Banner tone="muted" Icon={HelpCircleIcon} title={s.loading} />;
  }
  if (overall === 'UP')       return <Banner tone="green" Icon={CheckCircleIcon}  title={s.overallUp} />;
  if (overall === 'DEGRADED') return <Banner tone="amber" Icon={AlertTriangleIcon} title={s.overallDegraded} />;
  if (overall === 'DOWN')     return <Banner tone="red"   Icon={XCircleIcon}       title={s.overallDown} />;
  return <Banner tone="muted" Icon={HelpCircleIcon} title={s.overallUnknown} />;
}

function Banner({
  tone, Icon, title, subtitle,
}: {
  tone: 'green' | 'amber' | 'red' | 'muted';
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle?: string;
}) {
  const palette = {
    green: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    amber: 'border-amber-500/30  bg-amber-500/5  text-amber-600  dark:text-amber-400',
    red:   'border-rose-500/30   bg-rose-500/5   text-rose-600   dark:text-rose-400',
    muted: 'border-border/40     bg-muted/20     text-muted-foreground',
  }[tone];
  return (
    <div className={`rounded-2xl border ${palette} px-5 py-4 flex items-center gap-3 shadow-sm`}>
      <Icon size={18} />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-xs opacity-70 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function MonitorRow({ m, s }: { m: MonitorSummary; s: any }) {
  const Icon = TAG_TO_ICON[m.tag] ?? ServerIcon;
  const currentTone = statusTone(m.current);
  return (
    <div className="group rounded-2xl border border-border/40 bg-card shadow-sm hover:shadow-md hover:border-border/70 transition-all relative">
      <div className="flex items-center justify-between gap-3 px-5 pt-3.5 pb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon size={14} className="text-muted-foreground" />
          <span className="text-[13px] font-semibold tracking-tight text-foreground/90 truncate">
            {m.name}
          </span>
          <StatusDot tone={currentTone} />
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground/80 shrink-0">
          {m.uptime !== null && (
            <span>{s.uptimeLabel}: <span className="font-medium text-foreground/80">{(m.uptime * 100).toFixed(2)}%</span></span>
          )}
          {m.avgLatency !== null && (
            <span className="hidden sm:inline">{s.latencyLabel}: <span className="font-medium text-foreground/80">{m.avgLatency}ms</span></span>
          )}
        </div>
      </div>
      <div className="px-5 pb-4">
        <UptimeBars days={m.days} />
      </div>
    </div>
  );
}

interface PopoverState { day: DayBucket; x: number; y: number }

function UptimeBars({ days }: { days: DayBucket[] }) {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!popover) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if ('key' in e && e.key !== 'Escape') return;
      if ('key' in e) { setPopover(null); return; }
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setPopover(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [popover]);

  const statusLabel: Record<string, string> = { UP: 'Opérationnel', DEGRADED: 'Dégradé', DOWN: 'En panne', NO_DATA: 'Pas de données' };

  return (
    <div ref={containerRef} className="relative flex items-end gap-0.5 h-9 w-full">
      {days.map((d) => {
        const isActive = popover?.day.date === d.date;
        return (
          <button
            key={d.date}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const parentRect = containerRef.current!.getBoundingClientRect();
              setPopover(isActive ? null : {
                day: d,
                x: rect.left - parentRect.left + rect.width / 2,
                y: parentRect.top - rect.top, // distance above bar
              });
            }}
            className={`flex-1 rounded-sm transition-all cursor-pointer outline-none ${isActive ? 'ring-2 ring-offset-1 ring-foreground/30 scale-y-105' : 'hover:brightness-110'}`}
            style={{ height: '100%', ...getBarStyle(d) }}
          />
        );
      })}

      {/* ── Popover ── */}
      {popover && (() => {
        const d = popover.day;
        const tone = statusTone(d.status);
        const dotCls = { up: 'bg-emerald-500', degraded: 'bg-amber-500', down: 'bg-rose-500', nodata: 'bg-muted-foreground/40' }[tone];
        const total = d.up + d.degraded + d.down;
        const uptimePct = total > 0 ? ((d.up / total) * 100).toFixed(1) : null;
        return (
          <div
            role="tooltip"
            className="absolute z-50 bottom-[calc(100%+10px)] min-w-40 max-w-55 rounded-xl border border-border/50 bg-popover text-popover-foreground shadow-xl p-3 text-[11px] space-y-1.5"
            style={{ left: Math.max(0, popover.x - 80), transform: 'none' }}
          >
            {/* arrow */}
            <div
              className="absolute -bottom-1.25 size-2.5 bg-popover border-b border-r border-border/50 rotate-45"
              style={{ left: Math.min(Math.max(8, popover.x - 80 - 5), 155) }}
            />
            <div className="flex items-center gap-1.5 font-semibold">
              <span className={`size-1.5 rounded-full ${dotCls}`} />
              <span>{d.date}</span>
            </div>
            <div className="text-muted-foreground space-y-0.5">
              <div className="flex justify-between gap-3">
                <span>Statut</span>
                <span className="font-medium text-foreground/80">{statusLabel[d.status] ?? d.status}</span>
              </div>
              {uptimePct !== null && (
                <div className="flex justify-between gap-3">
                  <span>Uptime</span>
                  <span className="font-medium text-foreground/80">{uptimePct}%</span>
                </div>
              )}
              {d.avgLatency !== null && (
                <div className="flex justify-between gap-3">
                  <span>Latence moy.</span>
                  <span className="font-medium text-foreground/80">{d.avgLatency} ms</span>
                </div>
              )}
              {d.maintenanceMinutes > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-blue-500 inline-block" /> Maintenance</span>
                  <span className="font-medium text-foreground/80">{d.maintenanceMinutes} min</span>
                </div>
              )}
              {total > 0 && (
                <div className="flex justify-between gap-3">
                  <span>Mesures</span>
                  <span className="font-medium text-foreground/80">{total}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function IncidentCard({
  incident, monitors, s, active,
}: {
  incident: Incident;
  monitors: MonitorSummary[];
  s: any;
  active?: boolean;
}) {
  const started = new Date(incident.start_date_time * 1000);
  const ended = incident.end_date_time ? new Date(incident.end_date_time * 1000) : null;
  const impacted = incident.monitors
    .map(m => monitors.find(x => x.tag === m.monitor_tag)?.name || m.monitor_tag)
    .join(', ');

  const stateLabel = {
    INVESTIGATING: s.stateInvestigating,
    IDENTIFIED:    s.stateIdentified,
    MONITORING:    s.stateMonitoring,
    RESOLVED:      s.stateResolved,
  }[incident.state] || incident.state;

  const tone = active ? 'amber' : 'muted';
  const border = active ? 'border-amber-500/30' : 'border-border/40';
  const badge = active
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    : 'bg-muted/40 text-muted-foreground';

  return (
    <div className={`rounded-2xl border ${border} bg-card shadow-sm p-4 space-y-2`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{incident.title}</p>
          {impacted && <p className="text-[11px] text-muted-foreground/80 mt-0.5">{impacted}</p>}
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${badge}`}>
          {stateLabel}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground/60 flex flex-wrap gap-x-3 gap-y-1">
        <span>{started.toLocaleString()}</span>
        {ended && <span>&rarr; {ended.toLocaleString()}</span>}
      </div>
    </div>
  );
}

function StatusDot({ tone }: { tone: 'up' | 'degraded' | 'down' | 'nodata' }) {
  const cls = {
    up:       'bg-emerald-500',
    degraded: 'bg-amber-500',
    down:     'bg-rose-500',
    nodata:   'bg-muted-foreground/40',
  }[tone];
  return <span className={`size-1.5 rounded-full ${cls}`} />;
}

function statusTone(s: PointStatus): 'up' | 'degraded' | 'down' | 'nodata' {
  if (s === 'UP')       return 'up';
  if (s === 'DEGRADED') return 'degraded';
  if (s === 'DOWN')     return 'down';
  return 'nodata';
}

function SkeletonCard() {
  return <div className="rounded-2xl border border-border/40 bg-card shadow-sm h-20 animate-pulse" />;
}

function SkeletonRow() {
  return (
    <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden">
      <div className="px-5 pt-3.5 pb-2">
        <div className="h-3 w-32 bg-muted/50 rounded animate-pulse" />
      </div>
      <div className="px-5 pb-4">
        <div className="h-9 bg-muted/30 rounded animate-pulse" />
      </div>
    </div>
  );
}
