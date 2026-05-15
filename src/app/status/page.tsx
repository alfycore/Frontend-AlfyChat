'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
  XIcon,
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
  state: string;
  status: string;          // human-readable current status message from Kener
  incident_type: string;
  incident_source: string;
  monitors: IncidentMonitor[];
}

interface IncidentComment {
  id: number;
  incident_id: number;
  comment: string;
  created_at: number; // unix seconds
  state?: string;
}

interface SummaryPayload {
  generatedAt: string;
  windowDays: number;
  overall: 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  monitors: MonitorSummary[];
  incidents: Incident[];
  maintenanceEvents?: any[];
}

interface MinutePoint {
  timestamp: number;
  status: 'UP' | 'DEGRADED' | 'DOWN';
  latency: number;
}

// ── Gradient bar style ───────────────────────────────────────────────────────

function getBarStyle(d: DayBucket): React.CSSProperties {
  const total = d.up + d.degraded + d.down;
  const maintFrac = Math.min(1, d.maintenanceMinutes / 1440);

  if (total === 0 && d.maintenanceMinutes === 0) return { background: 'rgba(100,116,139,0.25)' };
  if (total === 0 && d.maintenanceMinutes > 0)   return { background: 'rgba(59,130,246,0.6)' };

  const dataFrac = 1 - maintFrac;
  const upFrac   = (d.up      / total) * dataFrac;
  const degFrac  = (d.degraded / total) * dataFrac;
  const downFrac = (d.down    / total) * dataFrac;

  if (downFrac === 0 && degFrac === 0 && maintFrac === 0) return { background: 'rgba(34,197,94,0.72)' };
  if (upFrac   === 0 && degFrac === 0 && maintFrac === 0) return { background: 'rgba(239,68,68,0.8)' };

  const stops: string[] = [];
  let pos = 0;
  const push = (color: string, frac: number) => {
    if (frac <= 0) return;
    const end = +(pos + frac * 100).toFixed(2);
    stops.push(`${color} ${pos.toFixed(2)}% ${end}%`);
    pos = end;
  };
  push('rgba(59,130,246,0.65)', maintFrac);
  push('rgba(34,197,94,0.75)',  upFrac);
  push('rgba(245,158,11,0.82)', degFrac);
  push('rgba(239,68,68,0.85)',  downFrac);

  if (stops.length === 1) return { background: stops[0].split(' ')[0] };
  return { background: `linear-gradient(to top, ${stops.join(', ')})` };
}

// ── Monitor tag → icon ───────────────────────────────────────────────────────

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

interface SelectedDay { monitorTag: string; monitorName: string; date: string }

export default function StatusPage() {
  const { t } = useTranslation();
  const s = t.static.statusPage;

  const [data, setData]               = useState<SummaryPayload | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);

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

  const now = Math.floor(Date.now() / 1000);

  const activeIncidents = useMemo(
    () => (data?.incidents ?? []).filter(i => i.state !== 'RESOLVED' && !i.end_date_time),
    [data],
  );
  const pastIncidents = useMemo(
    () => (data?.incidents ?? [])
      .filter(i => i.state === 'RESOLVED' || !!i.end_date_time)
      .sort((a, b) => b.start_date_time - a.start_date_time)
      .slice(0, 5),
    [data],
  );

  const activeMaintenances = useMemo(
    () => (data?.maintenanceEvents ?? []).filter((e: any) =>
      e.event_status === 'ONGOING' ||
      e.event_status === 'SCHEDULED' ||
      (e.event_status == null && e.end_date_time >= now),
    ),
    [data, now],
  );
  const pastMaintenances = useMemo(
    () => (data?.maintenanceEvents ?? [])
      .filter((e: any) =>
        e.event_status === 'COMPLETED' ||
        (e.event_status == null && e.end_date_time < now),
      )
      .sort((a: any, b: any) => b.start_date_time - a.start_date_time)
      .slice(0, 3),
    [data, now],
  );

  const handleDayClick = useCallback((date: string, monitorTag: string, monitorName: string) => {
    setSelectedDay({ date, monitorTag, monitorName });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteNavbar />

      <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-12 space-y-10">

        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight bg-linear-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            {s.heading}
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            {s.subtitle}
          </p>
        </div>

        <OverallBanner overall={data?.overall ?? null} error={error} s={s} />

        <section className="space-y-3">
          <SectionHeader title={s.sectionIncidents} />
          {!data && !error && <SkeletonCard />}
          {data &&
            activeIncidents.length === 0 &&
            pastIncidents.length === 0 &&
            activeMaintenances.length === 0 &&
            pastMaintenances.length === 0 && (
              <p className="text-sm text-muted-foreground/70 italic px-1">{s.noIncidents}</p>
            )}
          {activeMaintenances.map((e: any) => (
            <MaintenanceCard key={e.id} event={e} monitors={data?.monitors ?? []} now={now} />
          ))}
          {activeIncidents.map(inc => (
            <IncidentCard key={inc.id} incident={inc} monitors={data!.monitors} s={s} active />
          ))}
          {pastIncidents.map(inc => (
            <IncidentCard key={inc.id} incident={inc} monitors={data?.monitors ?? []} s={s} />
          ))}
          {pastMaintenances.map((e: any) => (
            <MaintenanceCard key={e.id} event={e} monitors={data?.monitors ?? []} now={now} />
          ))}
        </section>

        <section className="space-y-4">
          <SectionHeader title={s.sectionMonitors} />
          <div className="grid gap-3">
            {!data && !error && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
            {data?.monitors.map(m => (
              <MonitorRow key={m.tag} m={m} s={s} onDayClick={handleDayClick} />
            ))}
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

      <SiteFooter />

      {selectedDay && (
        <DayDetailModal
          monitorTag={selectedDay.monitorTag}
          monitorName={selectedDay.monitorName}
          date={selectedDay.date}
          incidents={data?.incidents ?? []}
          maintenanceEvents={data?.maintenanceEvents ?? []}
          monitors={data?.monitors ?? []}
          s={s}
          onClose={() => setSelectedDay(null)}
        />
      )}
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
  if (error)              return <Banner tone="red"   Icon={XCircleIcon}       title={s.loadError} subtitle={error} />;
  if (!overall)           return <Banner tone="muted" Icon={HelpCircleIcon}    title={s.loading} />;
  if (overall === 'UP')   return <Banner tone="green" Icon={CheckCircleIcon}   title={s.overallUp} />;
  if (overall === 'DEGRADED') return <Banner tone="amber" Icon={AlertTriangleIcon} title={s.overallDegraded} />;
  if (overall === 'DOWN') return <Banner tone="red"   Icon={XCircleIcon}       title={s.overallDown} />;
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

function MonitorRow({
  m, s, onDayClick,
}: {
  m: MonitorSummary;
  s: any;
  onDayClick: (date: string, tag: string, name: string) => void;
}) {
  const Icon = TAG_TO_ICON[m.tag] ?? ServerIcon;
  const currentTone = statusTone(m.current);
  return (
    <div className="group rounded-2xl border border-border/40 bg-card shadow-sm hover:shadow-md hover:border-border/70 transition-all">
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
      <div className="px-5 pb-3">
        <UptimeBars days={m.days} monitorTag={m.tag} monitorName={m.name} onDayClick={onDayClick} />
        {m.days.length > 0 && (
          <div className="flex justify-between text-[9px] text-muted-foreground/35 font-mono mt-1.5 px-0.5">
            <span>{m.days[0].date}</span>
            <span>{m.days[m.days.length - 1].date}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function UptimeBars({
  days, monitorTag, monitorName, onDayClick,
}: {
  days: DayBucket[];
  monitorTag: string;
  monitorName: string;
  onDayClick: (date: string, tag: string, name: string) => void;
}) {
  return (
    <div className="flex items-end gap-0.5 h-9 w-full">
      {days.map((d) => (
        <button
          key={d.date}
          type="button"
          title={d.date}
          onClick={() => onDayClick(d.date, monitorTag, monitorName)}
          className="flex-1 rounded-sm transition-all cursor-pointer outline-none hover:brightness-125 hover:scale-y-110 origin-bottom"
          style={{ height: '100%', ...getBarStyle(d) }}
        />
      ))}
    </div>
  );
}

// ── Day Detail Modal ─────────────────────────────────────────────────────────

type ModalTab = 'status' | 'latency' | 'incidents' | 'maintenances';

function DayDetailModal({
  monitorTag, monitorName, date, incidents, maintenanceEvents, monitors, s, onClose,
}: {
  monitorTag: string;
  monitorName: string;
  date: string;
  incidents: Incident[];
  maintenanceEvents: any[];
  monitors: MonitorSummary[];
  s: any;
  onClose: () => void;
}) {
  const [tab, setTab]               = useState<ModalTab>('status');
  const [minutes, setMinutes]       = useState<MinutePoint[] | null>(null);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setFetchError(null); setMinutes(null);
    const dayStart = Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000);
    const dayEnd   = dayStart + 86400;
    fetch(`/api/status/monitors/${encodeURIComponent(monitorTag)}/data?start_ts=${dayStart}&end_ts=${dayEnd}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(({ data: pts }) => {
        setMinutes((pts as any[]).map(p => ({ timestamp: p.timestamp, status: p.status, latency: p.latency })));
        setLoading(false);
      })
      .catch(e => { setFetchError(e.message); setLoading(false); });
  }, [monitorTag, date]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dayStart = Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000);
  const dayEnd   = dayStart + 86400;

  const dayIncidents = useMemo(() =>
    incidents.filter(i =>
      i.start_date_time < dayEnd &&
      (i.end_date_time === null || i.end_date_time > dayStart) &&
      i.monitors.some(m => m.monitor_tag === monitorTag),
    ), [incidents, dayStart, dayEnd, monitorTag]);

  const dayMaintenances = useMemo(() =>
    maintenanceEvents.filter((e: any) =>
      e.start_date_time < dayEnd &&
      (e.end_date_time ?? 0) > dayStart &&
      e.maintenance?.monitors?.some((m: any) => m.monitor_tag === monitorTag),
    ), [maintenanceEvents, dayStart, dayEnd, monitorTag]);

  const uptime = useMemo(() => {
    if (!minutes || minutes.length === 0) return null;
    return (minutes.filter(p => p.status === 'UP').length / minutes.length) * 100;
  }, [minutes]);

  const dateFormatted = new Date(date + 'T12:00:00Z').toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const TABS: { id: ModalTab; label: string }[] = [
    { id: 'status',       label: s.tabStatus },
    { id: 'latency',      label: s.tabLatency },
    { id: 'incidents',    label: s.tabIncidents },
    { id: 'maintenances', label: s.tabMaintenances },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-popover rounded-2xl border border-border/50 shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border/30 shrink-0">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">{monitorName}</p>
            <h2 className="text-lg font-bold tracking-tight">{dateFormatted}</h2>
            <p className="text-xs text-muted-foreground/50 mt-0.5">{s.dayDetailSubtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors mt-0.5"
          >
            <XIcon size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/30 shrink-0 px-3">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                tab === id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {tab === 'status' && (
            <StatusTab minutes={minutes} loading={loading} error={fetchError} uptime={uptime} s={s} />
          )}
          {tab === 'latency' && (
            <LatencyTab minutes={minutes} loading={loading} error={fetchError} s={s} />
          )}
          {tab === 'incidents' && (
            <IncidentsDayTab incidents={dayIncidents} s={s} />
          )}
          {tab === 'maintenances' && (
            <MaintenancesDayTab events={dayMaintenances} monitors={monitors} now={Math.floor(Date.now() / 1000)} s={s} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Status Tab ───────────────────────────────────────────────────────────────

function StatusTab({
  minutes, loading, error, uptime, s,
}: {
  minutes: MinutePoint[] | null;
  loading: boolean;
  error: string | null;
  uptime: number | null;
  s: any;
}) {
  if (loading) return <div className="h-48 animate-pulse bg-muted/30 rounded-xl" />;
  if (error)   return <p className="text-sm text-rose-500">{error}</p>;
  if (!minutes || minutes.length === 0) {
    return <p className="text-sm text-muted-foreground/60 italic">{s.noDataForDay}</p>;
  }

  const minuteMap = new Map<number, 'UP' | 'DEGRADED' | 'DOWN'>();
  for (const p of minutes) {
    const dt = new Date(p.timestamp * 1000);
    minuteMap.set(dt.getUTCHours() * 60 + dt.getUTCMinutes(), p.status);
  }

  const rows = [
    { label: '00:00 – 05:59', start: 0 },
    { label: '06:00 – 11:59', start: 360 },
    { label: '12:00 – 17:59', start: 720 },
    { label: '18:00 – 23:59', start: 1080 },
  ];

  const cellCls = (status: 'UP' | 'DEGRADED' | 'DOWN' | undefined) => {
    if (status === 'UP')       return 'bg-emerald-500/75';
    if (status === 'DEGRADED') return 'bg-amber-500/80';
    if (status === 'DOWN')     return 'bg-rose-500/85';
    return 'bg-muted/25';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {s.perMinuteStatus}
        </span>
        {uptime !== null && (
          <span className="text-sm font-bold text-foreground/90">
            ↗ {uptime.toFixed(4)}%
          </span>
        )}
      </div>

      {rows.map(({ label, start }) => (
        <div key={label} className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground/50 font-mono">{label}</p>
          <div className="flex flex-wrap gap-[1.5px]">
            {Array.from({ length: 360 }, (_, i) => {
              const idx    = start + i;
              const status = minuteMap.get(idx);
              const h      = Math.floor(idx / 60).toString().padStart(2, '0');
              const m      = (idx % 60).toString().padStart(2, '0');
              return (
                <div
                  key={i}
                  title={`${h}:${m} — ${status ?? 'No data'}`}
                  className={`size-[7px] rounded-[1px] ${cellCls(status)}`}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Latency Tab ──────────────────────────────────────────────────────────────

function LatencyTab({
  minutes, loading, error, s,
}: {
  minutes: MinutePoint[] | null;
  loading: boolean;
  error: string | null;
  s: any;
}) {
  if (loading) return <div className="h-48 animate-pulse bg-muted/30 rounded-xl" />;
  if (error)   return <p className="text-sm text-rose-500">{error}</p>;

  const withLatency = minutes?.filter(p => p.latency > 0) ?? [];
  if (withLatency.length === 0) {
    return <p className="text-sm text-muted-foreground/60 italic">{s.noDataForDay}</p>;
  }

  // Hourly aggregates: avg latency + worst status for bar coloring
  const hourly = Array.from({ length: 24 }, (_, h) => {
    const pts = withLatency.filter(p => new Date(p.timestamp * 1000).getUTCHours() === h);
    if (!pts.length) return { hour: h, avg: null as number | null, worst: null as null | 'UP' | 'DEGRADED' | 'DOWN' };
    const avg   = Math.round(pts.reduce((a, p) => a + p.latency, 0) / pts.length);
    const worst = pts.some(p => p.status === 'DOWN') ? 'DOWN'
      : pts.some(p => p.status === 'DEGRADED') ? 'DEGRADED' : 'UP';
    return { hour: h, avg, worst };
  });

  const validAvgs = hourly.filter(h => h.avg !== null).map(h => h.avg!);
  const globalAvg = Math.round(withLatency.reduce((a, p) => a + p.latency, 0) / withLatency.length);
  const maxVal    = Math.max(...validAvgs);
  const minVal    = Math.min(...validAvgs);
  const p95       = (() => {
    const sorted = [...withLatency].sort((a, b) => a.latency - b.latency);
    return sorted[Math.floor(sorted.length * 0.95)]?.latency ?? maxVal;
  })();

  // Smart Y range starting near actual min
  const yMin   = Math.max(0, Math.floor(minVal * 0.82));
  const yMax   = Math.ceil(maxVal * 1.08);
  const yRange = yMax - yMin || 1;

  // SVG layout constants
  const W = 560, H = 115, PAD_L = 40, PAD_B = 20;
  const chartW = W - PAD_L;
  const chartH = H - PAD_B;
  const barW   = chartW / 24;
  const barGap = 2.5;

  const fmtMs = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`;

  // 4 Y-axis ticks evenly spaced
  const yTicks = [yMin, yMin + yRange * 0.33, yMin + yRange * 0.66, yMax].map(Math.round);

  const barFill = (worst: string | null) => {
    if (worst === 'DOWN')     return 'rgba(239,68,68,0.72)';
    if (worst === 'DEGRADED') return 'rgba(245,158,11,0.72)';
    return 'rgba(99,102,241,0.55)';
  };

  const yPx = (val: number) => chartH - ((val - yMin) / yRange) * chartH;
  const avgY = yPx(globalAvg);
  const p95Y = yPx(Math.min(p95, yMax));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {s.latencyChart}
        </span>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
          <span>moy: <span className="font-medium text-foreground/80">{globalAvg} ms</span></span>
          <span>p95: <span className="font-medium text-foreground/80">{p95} ms</span></span>
          <span>max: <span className="font-medium text-foreground/80">{maxVal} ms</span></span>
        </div>
      </div>

      {/* SVG chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 150 }}
      >
        {/* Horizontal grid lines + Y labels */}
        {yTicks.map((tick, i) => {
          const y = yPx(tick);
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={W} y2={y}
                stroke="currentColor" strokeOpacity={i === 0 ? 0.18 : 0.07} strokeWidth="0.6" />
              <text x={PAD_L - 5} y={y + 3.5}
                textAnchor="end" fontSize="8.5" fill="currentColor" fillOpacity="0.38" fontFamily="monospace">
                {fmtMs(tick)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {hourly.map(({ hour, avg, worst }) => {
          if (avg === null) return null;
          const x      = PAD_L + hour * barW + barGap / 2;
          const barH   = Math.max(2, ((avg - yMin) / yRange) * chartH);
          const y      = chartH - barH;
          return (
            <g key={hour}>
              <rect x={x} y={y} width={barW - barGap} height={barH} rx="2"
                fill={barFill(worst)} />
              <title>{`${hour.toString().padStart(2, '0')}:00 — ${avg} ms`}</title>
            </g>
          );
        })}

        {/* Average dashed line */}
        {globalAvg >= yMin && globalAvg <= yMax && (
          <line x1={PAD_L} y1={avgY} x2={W} y2={avgY}
            stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="4 3" />
        )}

        {/* p95 dashed line (only if distinct from avg) */}
        {p95 !== globalAvg && p95 >= yMin && p95 <= yMax && (
          <line x1={PAD_L} y1={p95Y} x2={W} y2={p95Y}
            stroke="rgba(245,158,11,0.35)" strokeWidth="0.8" strokeDasharray="3 3" />
        )}

        {/* Baseline */}
        <line x1={PAD_L} y1={chartH} x2={W} y2={chartH}
          stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.6" />

        {/* X-axis labels */}
        {[0, 3, 6, 9, 12, 15, 18, 21, 23].map(h => (
          <text key={h}
            x={PAD_L + h * barW + barW / 2} y={H - 4}
            textAnchor="middle" fontSize="8" fill="currentColor" fillOpacity="0.32" fontFamily="monospace">
            {h.toString().padStart(2, '0')}h
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground/45 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-indigo-500/55 inline-block" /> Opérationnel
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-amber-500/72 inline-block" /> Dégradé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-rose-500/72 inline-block" /> En panne
        </span>
        <span className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 border-t border-dashed border-white/30" /> moy.
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 border-t border-dashed border-amber-500/35" /> p95
          </span>
        </span>
      </div>
    </div>
  );
}

// ── Incidents Day Tab ────────────────────────────────────────────────────────

function IncidentsDayTab({ incidents, s }: { incidents: Incident[]; s: any }) {
  if (incidents.length === 0) {
    return <p className="text-sm text-muted-foreground/60 italic">{s.noIncidentsForDay}</p>;
  }
  return (
    <div className="space-y-3">
      {incidents.map(inc => <IncidentWithComments key={inc.id} inc={inc} s={s} />)}
    </div>
  );
}

function IncidentWithComments({ inc, s }: { inc: Incident; s: any }) {
  const [comments, setComments] = useState<IncidentComment[] | null>(null);

  useEffect(() => {
    fetch(`/api/status/incidents/${inc.id}/comments`)
      .then(r => r.json())
      .then(d => {
        const sorted = ((d.comments ?? []) as IncidentComment[])
          .sort((a, b) => b.created_at - a.created_at);
        setComments(sorted);
      })
      .catch(() => setComments([]));
  }, [inc.id]);

  const active   = inc.state !== 'RESOLVED' && !inc.end_date_time;
  const started  = new Date(inc.start_date_time * 1000);
  const ended    = inc.end_date_time ? new Date(inc.end_date_time * 1000) : null;
  const stateLabel = (state: string) =>
    (({ INVESTIGATING: s.stateInvestigating, IDENTIFIED: s.stateIdentified, MONITORING: s.stateMonitoring, RESOLVED: s.stateResolved } as Record<string, string>)[state] ?? state);

  return (
    <div className={`rounded-xl border ${active ? 'border-amber-500/30' : 'border-border/40'} bg-card/50 p-3.5 space-y-2`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{inc.title}</p>
        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0 ${
          active ? 'bg-amber-500/10 text-amber-500' : 'bg-muted/40 text-muted-foreground'
        }`}>
          {stateLabel(inc.state)}
        </span>
      </div>

      {/* Current status message */}
      {inc.status && (
        <p className="text-[12px] text-foreground/75 bg-muted/20 rounded-lg px-3 py-2 leading-relaxed">
          {inc.status}
        </p>
      )}

      {/* Timestamps */}
      <p className="text-[11px] text-muted-foreground/50">
        {started.toLocaleString()}{ended ? ` → ${ended.toLocaleString()}` : ''}
      </p>

      {/* Comments timeline */}
      {comments !== null && comments.length > 0 && (
        <div className="border-t border-border/20 pt-2.5 space-y-2">
          {comments.map((c, i) => (
            <div key={c.id} className="flex gap-2.5">
              <div className="flex flex-col items-center shrink-0 pt-1">
                <div className="size-1.5 rounded-full bg-muted-foreground/30" />
                {i < comments.length - 1 && <div className="w-px flex-1 min-h-3 bg-border/25 mt-1" />}
              </div>
              <div className="pb-1">
                <p className="text-[10px] text-muted-foreground/45 mb-0.5">
                  {new Date(c.created_at * 1000).toLocaleString()}
                  {c.state && ` · ${stateLabel(c.state)}`}
                </p>
                <p className="text-[12px] text-foreground/75 leading-relaxed">{c.comment}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {comments === null && (
        <div className="h-3 w-24 bg-muted/25 rounded animate-pulse" />
      )}
    </div>
  );
}

// ── Maintenances Day Tab ─────────────────────────────────────────────────────

function MaintenancesDayTab({
  events, monitors, now, s,
}: {
  events: any[];
  monitors: MonitorSummary[];
  now: number;
  s: any;
}) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground/60 italic">{s.noMaintenanceForDay}</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((e: any) => {
        const started     = new Date(e.start_date_time * 1000);
        const ended       = e.end_date_time ? new Date(e.end_date_time * 1000) : null;
        const title       = e.maintenance?.title ?? 'Maintenance';
        const description = e.maintenance?.description;
        const impacted: string[] = (e.maintenance?.monitors ?? [])
          .map((m: any) => monitors.find(x => x.tag === m.monitor_tag)?.name || m.monitor_tag);

        const statusRaw    = (e.event_status as string | undefined)?.toUpperCase();
        const isOngoing    = statusRaw === 'ONGOING';
        const isScheduled  = statusRaw === 'SCHEDULED';

        const progressPct = isOngoing && e.end_date_time
          ? Math.min(100, Math.round(((now - e.start_date_time) / (e.end_date_time - e.start_date_time)) * 100))
          : null;

        const durationH = e.end_date_time
          ? Math.round((e.end_date_time - e.start_date_time) / 3600)
          : null;

        const border     = isOngoing ? 'border-blue-500/30' : isScheduled ? 'border-indigo-500/25' : 'border-border/40';
        const labelColor = isOngoing ? 'text-blue-400' : isScheduled ? 'text-indigo-400' : 'text-muted-foreground/60';
        const badgeLabel = isOngoing ? 'En cours' : isScheduled ? 'Planifiée' : 'Terminée';
        const badgeCls   = isOngoing ? 'bg-blue-500/10 text-blue-400' : isScheduled ? 'bg-indigo-500/10 text-indigo-400' : 'bg-muted/40 text-muted-foreground';

        return (
          <div key={e.id} className={`rounded-xl border ${border} bg-card/50 p-3.5 space-y-2.5`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <span className={`text-[9px] uppercase tracking-widest font-bold ${labelColor}`}>{badgeLabel}</span>
                <p className="text-sm font-bold">{title}</p>
                {description && (
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{description}</p>
                )}
                {impacted.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {impacted.map(name => (
                      <span key={name} className="text-[10px] text-blue-400/80 underline decoration-blue-400/30 underline-offset-2">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeCls}`}>
                {badgeLabel}
              </span>
            </div>

            {/* Progress bar */}
            {progressPct !== null && (
              <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500/60 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            )}

            {/* Timeline */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
              <span>{started.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              {durationH !== null && (
                <span className="text-muted-foreground/35">
                  {durationH < 24 ? `${durationH}h` : `${Math.round(durationH / 24)}j`}
                </span>
              )}
              {ended && (
                <span>{ended.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Maintenance Card (summary page) ──────────────────────────────────────────

function MaintenanceCard({
  event, monitors, now,
}: {
  event: any;
  monitors: MonitorSummary[];
  now: number;
}) {
  const started     = new Date(event.start_date_time * 1000);
  const ended       = event.end_date_time ? new Date(event.end_date_time * 1000) : null;
  const title       = event.maintenance?.title ?? 'Maintenance';
  const description = event.maintenance?.description;
  const impacted: string[] = (event.maintenance?.monitors ?? [])
    .map((m: any) => monitors.find(x => x.tag === m.monitor_tag)?.name || m.monitor_tag);

  // Use Kener event_status first, fallback to timestamp comparison
  const statusRaw = (event.event_status as string | undefined)?.toUpperCase();
  const isOngoing  = statusRaw === 'ONGOING'  || (!statusRaw && event.start_date_time <= now && event.end_date_time >= now);
  const isScheduled = statusRaw === 'SCHEDULED' || (!statusRaw && event.start_date_time > now);
  const isCompleted = statusRaw === 'COMPLETED' || (!statusRaw && event.end_date_time < now);

  // Progress % for ongoing maintenance
  const progressPct = isOngoing && event.end_date_time
    ? Math.min(100, Math.round(((now - event.start_date_time) / (event.end_date_time - event.start_date_time)) * 100))
    : null;

  const durationH = event.end_date_time
    ? Math.round((event.end_date_time - event.start_date_time) / 3600)
    : null;

  const border     = isOngoing ? 'border-blue-500/30' : isScheduled ? 'border-indigo-500/25' : 'border-border/40';
  const badgeCls   = isOngoing  ? 'bg-blue-500/10 text-blue-400'
    : isScheduled ? 'bg-indigo-500/10 text-indigo-400'
    : 'bg-muted/40 text-muted-foreground';
  const badgeLabel = isOngoing ? 'En cours' : isScheduled ? 'Planifiée' : 'Terminée';

  return (
    <div className={`rounded-2xl border ${border} bg-card shadow-sm p-4 space-y-2.5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <span className={`text-[9px] uppercase tracking-widest font-bold ${isOngoing ? 'text-blue-400' : isScheduled ? 'text-indigo-400' : 'text-muted-foreground/60'}`}>
            {badgeLabel}
          </span>
          <p className="text-sm font-bold truncate">{title}</p>
          {description && (
            <p className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-2 leading-relaxed">{description}</p>
          )}
          {impacted.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {impacted.map(name => (
                <span key={name} className="text-[10px] text-blue-400/80 underline decoration-blue-400/30 underline-offset-2">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeCls}`}>
          {badgeLabel}
        </span>
      </div>

      {/* Timeline bar */}
      <div className="space-y-1">
        {progressPct !== null && (
          <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500/60 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        )}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
          <span>{started.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
          {durationH !== null && (
            <span className="text-muted-foreground/35">
              {durationH < 24 ? `${durationH}h` : `${Math.round(durationH / 24)}j`}
            </span>
          )}
          {ended && (
            <span>{ended.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Incident Card (summary page) ─────────────────────────────────────────────

function IncidentCard({
  incident, monitors, s, active,
}: {
  incident: Incident;
  monitors: MonitorSummary[];
  s: any;
  active?: boolean;
}) {
  const started  = new Date(incident.start_date_time * 1000);
  const ended    = incident.end_date_time ? new Date(incident.end_date_time * 1000) : null;
  const impacted = incident.monitors
    .map(m => monitors.find(x => x.tag === m.monitor_tag)?.name || m.monitor_tag)
    .join(', ');

  const stateLabel = (({
    INVESTIGATING: s.stateInvestigating,
    IDENTIFIED:    s.stateIdentified,
    MONITORING:    s.stateMonitoring,
    RESOLVED:      s.stateResolved,
  } as Record<string, string>)[incident.state]) ?? incident.state;

  const border = active ? 'border-amber-500/30' : 'border-border/40';
  const badge  = active
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    : 'bg-muted/40 text-muted-foreground';

  return (
    <div className={`rounded-2xl border ${border} bg-card shadow-sm p-4 space-y-2`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{incident.title}</p>
          {incident.status && (
            <p className="text-[11px] text-muted-foreground/75 mt-1 line-clamp-2 leading-relaxed">{incident.status}</p>
          )}
          {impacted && <p className="text-[11px] text-muted-foreground/50 mt-0.5">{impacted}</p>}
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge}`}>
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

// ── Misc ─────────────────────────────────────────────────────────────────────

function StatusDot({ tone }: { tone: 'up' | 'degraded' | 'down' | 'nodata' }) {
  const cls = { up: 'bg-emerald-500', degraded: 'bg-amber-500', down: 'bg-rose-500', nodata: 'bg-muted-foreground/40' }[tone];
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
