'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Card,
  Chip,
  Alert,
  Tabs,
  Modal,
  Skeleton,
  Separator,
  ProgressBar,
  Button,
} from '@heroui/react';
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
} from '@/components/icons';
import { useTranslation } from '@/components/locale-provider';

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
  status: string;
  incident_type: string;
  incident_source: string;
  monitors: IncidentMonitor[];
}

interface IncidentComment {
  id: number;
  incident_id: number;
  comment: string;
  created_at: number;
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

// ── HeroUI semantic colors (themed via CSS variables) ─────────────────────────

const COLOR = {
  up:    'color-mix(in oklab, var(--success) 78%, transparent)',
  deg:   'color-mix(in oklab, var(--warning) 82%, transparent)',
  down:  'color-mix(in oklab, var(--danger) 85%, transparent)',
  maint: 'color-mix(in oklab, var(--accent) 62%, transparent)',
  none:  'color-mix(in oklab, var(--muted) 28%, transparent)',
};

// ── Gradient bar style ────────────────────────────────────────────────────────

function getBarStyle(d: DayBucket): React.CSSProperties {
  const total = d.up + d.degraded + d.down;
  const maintFrac = Math.min(1, d.maintenanceMinutes / 1440);

  if (total === 0 && d.maintenanceMinutes === 0) return { background: COLOR.none };
  if (total === 0 && d.maintenanceMinutes > 0)   return { background: COLOR.maint };

  const dataFrac = 1 - maintFrac;
  const upFrac   = (d.up      / total) * dataFrac;
  const degFrac  = (d.degraded / total) * dataFrac;
  const downFrac = (d.down    / total) * dataFrac;

  if (downFrac === 0 && degFrac === 0 && maintFrac === 0) return { background: COLOR.up };
  if (upFrac   === 0 && degFrac === 0 && maintFrac === 0) return { background: COLOR.down };

  const stops: string[] = [];
  let pos = 0;
  const push = (color: string, frac: number) => {
    if (frac <= 0) return;
    const end = +(pos + frac * 100).toFixed(2);
    stops.push(`${color} ${pos.toFixed(2)}% ${end}%`);
    pos = end;
  };
  push(COLOR.maint, maintFrac);
  push(COLOR.up,    upFrac);
  push(COLOR.deg,   degFrac);
  push(COLOR.down,  downFrac);

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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-6 py-12">

        <div className="space-y-3 text-center">
          <h1 className="font-heading text-4xl tracking-tight">{s.heading}</h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted">{s.subtitle}</p>
        </div>

        <OverallBanner overall={data?.overall ?? null} error={error} s={s} />

        <section className="space-y-3">
          <SectionHeader title={s.sectionIncidents} />
          {!data && !error && <Skeleton className="h-20 rounded-2xl" />}
          {data &&
            activeIncidents.length === 0 &&
            pastIncidents.length === 0 &&
            activeMaintenances.length === 0 &&
            pastMaintenances.length === 0 && (
              <p className="px-1 text-sm italic text-muted">{s.noIncidents}</p>
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
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted">
            <LegendDot color={COLOR.up} label="Opérationnel" />
            <LegendDot color={COLOR.deg} label="Dégradé" />
            <LegendDot color={COLOR.down} label="En panne" />
            <LegendDot color={COLOR.maint} label="Maintenance" />
            <LegendDot color={COLOR.none} label="Pas de données" />
          </div>
          <p className="pt-1 text-center text-[11px] text-muted/70">{s.attribution}</p>
        </section>

      </main>

      <SiteFooter />

      <DayDetailModal
        open={!!selectedDay}
        monitorTag={selectedDay?.monitorTag ?? ''}
        monitorName={selectedDay?.monitorName ?? ''}
        date={selectedDay?.date ?? ''}
        incidents={data?.incidents ?? []}
        maintenanceEvents={data?.maintenanceEvents ?? []}
        monitors={data?.monitors ?? []}
        s={s}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  );
}

// ── Site chrome (HeroUI only) ─────────────────────────────────────────────────

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-separator bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
        <a href="/" className="flex items-center gap-2.5" aria-label="AlfyChat — accueil">
          <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={28} height={28} priority />
          <span className="font-heading text-base tracking-tight">AlfyChat</span>
        </a>
        <Button
          size="sm"
          variant="tertiary"
          render={(props) => <a {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)} href="/" />}
        >
          Retour au site
        </Button>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-separator">
      <div className="mx-auto w-full max-w-5xl px-6 py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} AlfyChat · AlfyCore
      </div>
    </footer>
  );
}

// ── Subcomponents ───────────────────────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block size-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="whitespace-nowrap text-xs font-semibold uppercase tracking-widest text-muted">
        {title}
      </h2>
      <Separator className="flex-1" />
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
  if (error)                  return <Banner status="danger"  title={s.loadError} subtitle={error} />;
  if (!overall)               return <Banner status="default" title={s.loading} />;
  if (overall === 'UP')       return <Banner status="success" title={s.overallUp} />;
  if (overall === 'DEGRADED') return <Banner status="warning" title={s.overallDegraded} />;
  if (overall === 'DOWN')     return <Banner status="danger"  title={s.overallDown} />;
  return <Banner status="default" title={s.overallUnknown} />;
}

function Banner({
  status, title, subtitle,
}: {
  status: 'success' | 'warning' | 'danger' | 'default';
  title: string;
  subtitle?: string;
}) {
  return (
    <Alert status={status}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        {subtitle && <Alert.Description>{subtitle}</Alert.Description>}
      </Alert.Content>
    </Alert>
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
    <Card className="gap-0 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3 pb-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon size={14} className="text-muted" />
          <span className="truncate text-[13px] font-semibold tracking-tight">{m.name}</span>
          <StatusDot tone={currentTone} />
        </div>
        <div className="flex shrink-0 items-center gap-4 text-[11px] text-muted">
          {m.uptime !== null && (
            <span>{s.uptimeLabel}: <span className="font-medium text-foreground">{(m.uptime * 100).toFixed(2)}%</span></span>
          )}
          {m.avgLatency !== null && (
            <span className="hidden sm:inline">{s.latencyLabel}: <span className="font-medium text-foreground">{m.avgLatency}ms</span></span>
          )}
        </div>
      </div>
      <UptimeBars days={m.days} monitorTag={m.tag} monitorName={m.name} onDayClick={onDayClick} />
      {m.days.length > 0 && (
        <div className="mt-1.5 flex justify-between px-0.5 font-mono text-[9px] text-muted/60">
          <span>{m.days[0].date}</span>
          <span>{m.days[m.days.length - 1].date}</span>
        </div>
      )}
    </Card>
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
    <div className="flex h-9 w-full items-end gap-0.5">
      {days.map((d) => (
        <button
          key={d.date}
          type="button"
          title={d.date}
          onClick={() => onDayClick(d.date, monitorTag, monitorName)}
          className="h-full flex-1 origin-bottom cursor-pointer rounded-sm outline-none transition-all hover:scale-y-110 hover:brightness-125 focus-visible:ring-2 focus-visible:ring-focus"
          style={getBarStyle(d)}
        />
      ))}
    </div>
  );
}

// ── Day Detail Modal ─────────────────────────────────────────────────────────

function DayDetailModal({
  open, monitorTag, monitorName, date, incidents, maintenanceEvents, monitors, s, onClose,
}: {
  open: boolean;
  monitorTag: string;
  monitorName: string;
  date: string;
  incidents: Incident[];
  maintenanceEvents: any[];
  monitors: MonitorSummary[];
  s: any;
  onClose: () => void;
}) {
  const [minutes, setMinutes]       = useState<MinutePoint[] | null>(null);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !date) return;
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
  }, [monitorTag, date, open]);

  const dayStart = date ? Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000) : 0;
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

  const dateFormatted = date
    ? new Date(date + 'T12:00:00Z').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <Modal.Backdrop variant="blur" isOpen={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Container size="lg">
        <Modal.Dialog className="max-h-[90vh]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <p className="mb-0.5 text-xs font-medium text-muted">{monitorName}</p>
            <Modal.Heading>{dateFormatted}</Modal.Heading>
            <p className="mt-0.5 text-xs text-muted/70">{s.dayDetailSubtitle}</p>
          </Modal.Header>
          <Modal.Body>
            <Tabs defaultSelectedKey="status" className="w-full">
              <Tabs.ListContainer>
                <Tabs.List aria-label={s.dayDetailSubtitle}>
                  <Tabs.Tab id="status">{s.tabStatus}<Tabs.Indicator /></Tabs.Tab>
                  <Tabs.Tab id="latency">{s.tabLatency}<Tabs.Indicator /></Tabs.Tab>
                  <Tabs.Tab id="incidents">{s.tabIncidents}<Tabs.Indicator /></Tabs.Tab>
                  <Tabs.Tab id="maintenances">{s.tabMaintenances}<Tabs.Indicator /></Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>

              <Tabs.Panel id="status" className="pt-4">
                <StatusTab minutes={minutes} loading={loading} error={fetchError} uptime={uptime} s={s} />
              </Tabs.Panel>
              <Tabs.Panel id="latency" className="pt-4">
                <LatencyTab minutes={minutes} loading={loading} error={fetchError} s={s} />
              </Tabs.Panel>
              <Tabs.Panel id="incidents" className="pt-4">
                <IncidentsDayTab incidents={dayIncidents} s={s} />
              </Tabs.Panel>
              <Tabs.Panel id="maintenances" className="pt-4">
                <MaintenancesDayTab events={dayMaintenances} monitors={monitors} now={Math.floor(Date.now() / 1000)} s={s} />
              </Tabs.Panel>
            </Tabs>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
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
  if (loading) return <Skeleton className="h-48 rounded-xl" />;
  if (error)   return <p className="text-sm text-danger">{error}</p>;
  if (!minutes || minutes.length === 0) {
    return <p className="text-sm italic text-muted">{s.noDataForDay}</p>;
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

  const cellColor = (status: 'UP' | 'DEGRADED' | 'DOWN' | undefined) => {
    if (status === 'UP')       return COLOR.up;
    if (status === 'DEGRADED') return COLOR.deg;
    if (status === 'DOWN')     return COLOR.down;
    return COLOR.none;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted">
          {s.perMinuteStatus}
        </span>
        {uptime !== null && (
          <span className="text-sm font-bold">↗ {uptime.toFixed(4)}%</span>
        )}
      </div>

      {rows.map(({ label, start }) => (
        <div key={label} className="space-y-1.5">
          <p className="font-mono text-[10px] text-muted/70">{label}</p>
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
                  className="size-1.75 rounded-xs"
                  style={{ background: cellColor(status) }}
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
  if (loading) return <Skeleton className="h-48 rounded-xl" />;
  if (error)   return <p className="text-sm text-danger">{error}</p>;

  const withLatency = minutes?.filter(p => p.latency > 0) ?? [];
  if (withLatency.length === 0) {
    return <p className="text-sm italic text-muted">{s.noDataForDay}</p>;
  }

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

  const yMin   = Math.max(0, Math.floor(minVal * 0.82));
  const yMax   = Math.ceil(maxVal * 1.08);
  const yRange = yMax - yMin || 1;

  const W = 560, H = 115, PAD_L = 40, PAD_B = 20;
  const chartW = W - PAD_L;
  const chartH = H - PAD_B;
  const barW   = chartW / 24;
  const barGap = 2.5;

  const fmtMs = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`;
  const yTicks = [yMin, yMin + yRange * 0.33, yMin + yRange * 0.66, yMax].map(Math.round);

  const barFill = (worst: string | null) => {
    if (worst === 'DOWN')     return COLOR.down;
    if (worst === 'DEGRADED') return COLOR.deg;
    return 'color-mix(in oklab, var(--accent) 55%, transparent)';
  };

  const yPx = (val: number) => chartH - ((val - yMin) / yRange) * chartH;
  const avgY = yPx(globalAvg);
  const p95Y = yPx(Math.min(p95, yMax));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted">
          {s.latencyChart}
        </span>
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <span>moy: <span className="font-medium text-foreground">{globalAvg} ms</span></span>
          <span>p95: <span className="font-medium text-foreground">{p95} ms</span></span>
          <span>max: <span className="font-medium text-foreground">{maxVal} ms</span></span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-foreground" style={{ height: 150 }}>
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

        {hourly.map(({ hour, avg, worst }) => {
          if (avg === null) return null;
          const x      = PAD_L + hour * barW + barGap / 2;
          const barH   = Math.max(2, ((avg - yMin) / yRange) * chartH);
          const y      = chartH - barH;
          return (
            <g key={hour}>
              <rect x={x} y={y} width={barW - barGap} height={barH} rx="2" fill={barFill(worst)} />
              <title>{`${hour.toString().padStart(2, '0')}:00 — ${avg} ms`}</title>
            </g>
          );
        })}

        {globalAvg >= yMin && globalAvg <= yMax && (
          <line x1={PAD_L} y1={avgY} x2={W} y2={avgY}
            stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="4 3" />
        )}

        {p95 !== globalAvg && p95 >= yMin && p95 <= yMax && (
          <line x1={PAD_L} y1={p95Y} x2={W} y2={p95Y}
            stroke={COLOR.deg} strokeWidth="0.8" strokeDasharray="3 3" />
        )}

        <line x1={PAD_L} y1={chartH} x2={W} y2={chartH}
          stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.6" />

        {[0, 3, 6, 9, 12, 15, 18, 21, 23].map(h => (
          <text key={h}
            x={PAD_L + h * barW + barW / 2} y={H - 4}
            textAnchor="middle" fontSize="8" fill="currentColor" fillOpacity="0.32" fontFamily="monospace">
            {h.toString().padStart(2, '0')}h
          </text>
        ))}
      </svg>

      <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted">
        <LegendDot color="color-mix(in oklab, var(--accent) 55%, transparent)" label="Opérationnel" />
        <LegendDot color={COLOR.deg} label="Dégradé" />
        <LegendDot color={COLOR.down} label="En panne" />
        <span className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 border-t border-dashed border-foreground/40" /> moy.
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 border-t border-dashed border-warning/50" /> p95
          </span>
        </span>
      </div>
    </div>
  );
}

// ── Incidents Day Tab ────────────────────────────────────────────────────────

function IncidentsDayTab({ incidents, s }: { incidents: Incident[]; s: any }) {
  if (incidents.length === 0) {
    return <p className="text-sm italic text-muted">{s.noIncidentsForDay}</p>;
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
        const sorted = ((d.comments ?? []) as IncidentComment[]).sort((a, b) => b.created_at - a.created_at);
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
    <Card variant="secondary" className="gap-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{inc.title}</p>
        <Chip size="sm" color={active ? 'warning' : 'default'} variant="soft">
          <Chip.Label>{stateLabel(inc.state)}</Chip.Label>
        </Chip>
      </div>

      {inc.status && (
        <p className="rounded-lg bg-surface-secondary px-3 py-2 text-[12px] leading-relaxed text-foreground/80">
          {inc.status}
        </p>
      )}

      <p className="text-[11px] text-muted">
        {started.toLocaleString()}{ended ? ` → ${ended.toLocaleString()}` : ''}
      </p>

      {comments !== null && comments.length > 0 && (
        <div className="space-y-2 border-t border-separator pt-2.5">
          {comments.map((c, i) => (
            <div key={c.id} className="flex gap-2.5">
              <div className="flex shrink-0 flex-col items-center pt-1">
                <div className="size-1.5 rounded-full bg-muted/50" />
                {i < comments.length - 1 && <div className="mt-1 min-h-3 w-px flex-1 bg-separator" />}
              </div>
              <div className="pb-1">
                <p className="mb-0.5 text-[10px] text-muted/70">
                  {new Date(c.created_at * 1000).toLocaleString()}
                  {c.state && ` · ${stateLabel(c.state)}`}
                </p>
                <p className="text-[12px] leading-relaxed text-foreground/80">{c.comment}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {comments === null && <Skeleton className="h-3 w-24 rounded" />}
    </Card>
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
    return <p className="text-sm italic text-muted">{s.noMaintenanceForDay}</p>;
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

        const badgeLabel = isOngoing ? 'En cours' : isScheduled ? 'Planifiée' : 'Terminée';

        return (
          <Card key={e.id} variant="secondary" className="gap-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-bold">{title}</p>
                {description && (
                  <p className="text-[11px] leading-relaxed text-muted">{description}</p>
                )}
                {impacted.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {impacted.map(name => (
                      <Chip key={name} size="sm" color="accent" variant="soft"><Chip.Label>{name}</Chip.Label></Chip>
                    ))}
                  </div>
                )}
              </div>
              <Chip size="sm" color={isOngoing ? 'accent' : isScheduled ? 'accent' : 'default'} variant="soft">
                <Chip.Label>{badgeLabel}</Chip.Label>
              </Chip>
            </div>

            {progressPct !== null && (
              <ProgressBar aria-label={badgeLabel} color="accent" value={progressPct} className="w-full">
                <ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track>
              </ProgressBar>
            )}

            <div className="flex items-center justify-between text-[10px] text-muted">
              <span>{started.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              {durationH !== null && (
                <span className="text-muted/60">{durationH < 24 ? `${durationH}h` : `${Math.round(durationH / 24)}j`}</span>
              )}
              {ended && (
                <span>{ended.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              )}
            </div>
          </Card>
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

  const statusRaw = (event.event_status as string | undefined)?.toUpperCase();
  const isOngoing  = statusRaw === 'ONGOING'  || (!statusRaw && event.start_date_time <= now && event.end_date_time >= now);
  const isScheduled = statusRaw === 'SCHEDULED' || (!statusRaw && event.start_date_time > now);

  const progressPct = isOngoing && event.end_date_time
    ? Math.min(100, Math.round(((now - event.start_date_time) / (event.end_date_time - event.start_date_time)) * 100))
    : null;

  const durationH = event.end_date_time
    ? Math.round((event.end_date_time - event.start_date_time) / 3600)
    : null;

  const badgeLabel = isOngoing ? 'En cours' : isScheduled ? 'Planifiée' : 'Terminée';

  return (
    <Card className="gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-bold">{title}</p>
          {description && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted">{description}</p>
          )}
          {impacted.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {impacted.map(name => (
                <Chip key={name} size="sm" color="accent" variant="soft"><Chip.Label>{name}</Chip.Label></Chip>
              ))}
            </div>
          )}
        </div>
        <Chip size="sm" color={isOngoing || isScheduled ? 'accent' : 'default'} variant="soft">
          <Chip.Label>{badgeLabel}</Chip.Label>
        </Chip>
      </div>

      <div className="space-y-1">
        {progressPct !== null && (
          <ProgressBar aria-label={badgeLabel} color="accent" value={progressPct} className="w-full">
            <ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track>
          </ProgressBar>
        )}
        <div className="flex items-center justify-between text-[10px] text-muted">
          <span>{started.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
          {durationH !== null && (
            <span className="text-muted/60">{durationH < 24 ? `${durationH}h` : `${Math.round(durationH / 24)}j`}</span>
          )}
          {ended && (
            <span>{ended.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
          )}
        </div>
      </div>
    </Card>
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

  return (
    <Card className="gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{incident.title}</p>
          {incident.status && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">{incident.status}</p>
          )}
          {impacted && <p className="mt-0.5 text-[11px] text-muted/70">{impacted}</p>}
        </div>
        <Chip size="sm" color={active ? 'warning' : 'default'} variant="soft">
          <Chip.Label>{stateLabel}</Chip.Label>
        </Chip>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
        <span>{started.toLocaleString()}</span>
        {ended && <span>&rarr; {ended.toLocaleString()}</span>}
      </div>
    </Card>
  );
}

// ── Misc ─────────────────────────────────────────────────────────────────────

function StatusDot({ tone }: { tone: 'up' | 'degraded' | 'down' | 'nodata' }) {
  const cls = {
    up: 'bg-success', degraded: 'bg-warning', down: 'bg-danger', nodata: 'bg-muted/50',
  }[tone];
  return <span className={`size-1.5 rounded-full ${cls}`} />;
}

function statusTone(s: PointStatus): 'up' | 'degraded' | 'down' | 'nodata' {
  if (s === 'UP')       return 'up';
  if (s === 'DEGRADED') return 'degraded';
  if (s === 'DOWN')     return 'down';
  return 'nodata';
}

function SkeletonRow() {
  return (
    <Card className="gap-3">
      <Skeleton className="h-3 w-32 rounded" />
      <Skeleton className="h-9 w-full rounded" />
    </Card>
  );
}
