// ==========================================
// ALFYCHAT — Aggregated status summary for the public status page.
// Hits Kener once, downsamples minute-level data into daily buckets,
// and caches for 30s. One HTTP round-trip for the client.
// ==========================================

import { NextRequest, NextResponse } from 'next/server';

const KENER_URL   = (process.env.KENER_URL || 'https://status.alfychat.app').replace(/\/$/, '');
const KENER_TOKEN = process.env.KENER_API_TOKEN || '';

const DAY = 86400;

type Status = 'UP' | 'DOWN' | 'DEGRADED';

interface DataPoint {
  monitor_tag: string;
  timestamp: number; // seconds
  status: Status;
  latency: number;
  type: string;
}

interface DayBucket {
  date: string;     // YYYY-MM-DD (UTC)
  status: Status | 'NO_DATA';
  up: number;
  degraded: number;
  down: number;
  avgLatency: number | null;
  maintenanceMinutes: number; // minutes of scheduled maintenance in this day
}

interface MaintenanceEvent {
  id: number;
  maintenance_id: number;
  start_date_time: number;
  end_date_time: number;
  event_status: string;
  maintenance?: { id: number; title: string; monitors: Array<{ monitor_tag: string; impact: string }> };
}

interface MonitorSummary {
  tag: string;
  name: string;
  current: Status | 'NO_DATA';
  uptime: number | null; // 0..1 over the window
  avgLatency: number | null;
  days: DayBucket[];
}

// Fetch with short-lived cache (monitors list, incidents).
async function kener<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${KENER_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${KENER_TOKEN}` },
    next: { revalidate: 30 },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Kener ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

// Fetch without cache — used for per-monitor data (responses can be 2-3 MB,
// which exceeds the Next.js 2 MB data-cache limit and triggers a warning).
async function kenerNoCache<T>(path: string): Promise<T> {
  const res = await fetch(`${KENER_URL}${path}`, {
    headers: { Authorization: `Bearer ${KENER_TOKEN}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Kener ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

function bucketByDay(
  points: DataPoint[],
  days: number,
  endTs: number,
  maintenanceEvents: MaintenanceEvent[] = [],
): DayBucket[] {
  const startTs = endTs - days * DAY;
  const buckets = new Map<string, { up: number; degraded: number; down: number; latSum: number; latCount: number }>();

  // Pre-seed the window so every day shows up, even with zero data.
  for (let d = 0; d < days; d++) {
    const t = endTs - (days - 1 - d) * DAY;
    const date = new Date(t * 1000).toISOString().slice(0, 10);
    buckets.set(date, { up: 0, degraded: 0, down: 0, latSum: 0, latCount: 0 });
  }

  for (const p of points) {
    if (p.timestamp < startTs || p.timestamp > endTs) continue;
    const date = new Date(p.timestamp * 1000).toISOString().slice(0, 10);
    const b = buckets.get(date);
    if (!b) continue;
    if (p.status === 'UP')       b.up++;
    else if (p.status === 'DEGRADED') b.degraded++;
    else if (p.status === 'DOWN') b.down++;
    if (p.latency > 0) { b.latSum += p.latency; b.latCount++; }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => {
      const total = b.up + b.degraded + b.down;
      let status: DayBucket['status'] = 'NO_DATA';
      if (total > 0) {
        if (b.down > 0)       status = 'DOWN';
        else if (b.degraded > 0) status = 'DEGRADED';
        else                  status = 'UP';
      }
      // Compute scheduled maintenance minutes overlapping this day
      const dayStart = new Date(date + 'T00:00:00Z').getTime() / 1000;
      const dayEnd   = dayStart + DAY;
      let maintenanceMinutes = 0;
      for (const evt of maintenanceEvents) {
        if (!evt.end_date_time) continue;
        const oStart = Math.max(evt.start_date_time, dayStart);
        const oEnd   = Math.min(evt.end_date_time,   dayEnd);
        if (oEnd > oStart) maintenanceMinutes += Math.round((oEnd - oStart) / 60);
      }
      return {
        date,
        status,
        up: b.up,
        degraded: b.degraded,
        down: b.down,
        avgLatency: b.latCount ? Math.round(b.latSum / b.latCount) : null,
        maintenanceMinutes,
      };
    });
}

export async function GET(req: NextRequest) {
  if (!KENER_TOKEN) {
    return NextResponse.json({ error: 'Status API not configured' }, { status: 503 });
  }
  const days = Math.min(90, Math.max(7, Number(req.nextUrl.searchParams.get('days') || '60')));
  const endTs = Math.floor(Date.now() / 1000);
  const startTs = endTs - days * DAY;

  try {
    const [monitorsRes, incidentsRes, maintEventsRes] = await Promise.all([
      kener<{ monitors: Array<{ tag: string; name: string; status: string; is_hidden?: string }> }>(
        '/api/v4/monitors',
      ),
      kener<{ incidents: Array<any> }>(`/api/v4/incidents?start_ts=${startTs}&end_ts=${endTs}`),
      kener<{ events: MaintenanceEvent[] }>(
        `/api/v4/maintenances/events?start_ts=${startTs}&end_ts=${endTs + 30 * DAY}&limit=100`,
      ).catch(() => ({ events: [] as MaintenanceEvent[] })),
    ]);

    const visible = monitorsRes.monitors.filter(m => m.is_hidden !== 'YES' && m.status === 'ACTIVE');

    const summaries: MonitorSummary[] = await Promise.all(
      visible.map(async (m) => {
        try {
          const { data } = await kenerNoCache<{ data: DataPoint[] }>(
            `/api/v4/monitors/${encodeURIComponent(m.tag)}/data?start_ts=${startTs}&end_ts=${endTs}`,
          );
          // Filter maintenance events that affect this monitor
          const monitorMaintEvents = maintEventsRes.events.filter(e =>
            e.maintenance?.monitors.some(mon => mon.monitor_tag === m.tag),
          );
          const dayBuckets = bucketByDay(data, days, endTs, monitorMaintEvents);
          const totalPoints = data.length;
          const upPoints = data.filter(p => p.status === 'UP').length;
          const latPoints = data.filter(p => p.latency > 0);
          const avgLatency = latPoints.length
            ? Math.round(latPoints.reduce((a, p) => a + p.latency, 0) / latPoints.length)
            : null;
          const last = data[data.length - 1];
          return {
            tag: m.tag,
            name: m.name,
            current: last?.status ?? 'NO_DATA',
            uptime: totalPoints ? upPoints / totalPoints : null,
            avgLatency,
            days: dayBuckets,
          };
        } catch {
          return {
            tag: m.tag,
            name: m.name,
            current: 'NO_DATA' as const,
            uptime: null,
            avgLatency: null,
            days: bucketByDay([], days, endTs, []),
          };
        }
      }),
    );

    // Overall: worst currently-observed status.
    const currents = summaries.map(s => s.current);
    let overall: 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN' = 'UP';
    if (currents.some(c => c === 'DOWN')) overall = 'DOWN';
    else if (currents.some(c => c === 'DEGRADED')) overall = 'DEGRADED';
    else if (currents.every(c => c === 'NO_DATA')) overall = 'UNKNOWN';

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        windowDays: days,
        overall,
        monitors: summaries,
        incidents: incidentsRes.incidents,
        maintenanceEvents: maintEventsRes.events,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
        },
      },
    );
  } catch (err: any) {
    return NextResponse.json({ error: 'upstream_error', message: String(err?.message || err) }, { status: 502 });
  }
}
