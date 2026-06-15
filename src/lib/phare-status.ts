// ==========================================
// ALFYCHAT — Phare.io (https://api.phare.io) status adapter.
// Server-side helper: talks to the Phare Uptime API and maps its payloads
// into the shapes the public status pages already consume.
//
// Phare does NOT expose raw per-minute/per-day time series via its API — it
// returns aggregate availability + a list of incidents per monitor. Daily
// uptime bars are therefore reconstructed from incident windows (a day is
// "up" unless an incident overlaps it).
//
// Env:
//   PHARE_API_KEY        — required. Bearer key (project- or org-scoped).
//   PHARE_API_URL        — optional, defaults to https://api.phare.io
//   PHARE_PROJECT_ID     — optional, only for org-scoped keys.
//   PHARE_PROJECT_SLUG   — optional, alternative to PHARE_PROJECT_ID.
// ==========================================

const PHARE_URL = (process.env.PHARE_API_URL || 'https://api.phare.io').replace(/\/$/, '');
const PHARE_KEY = process.env.PHARE_API_KEY || '';
const PHARE_PROJECT_ID = process.env.PHARE_PROJECT_ID || '';
const PHARE_PROJECT_SLUG = process.env.PHARE_PROJECT_SLUG || '';

export const DAY = 86400;

export type Status = 'UP' | 'DOWN' | 'DEGRADED';

export function isConfigured(): boolean {
  return !!PHARE_KEY;
}

function phareHeaders(): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${PHARE_KEY}` };
  // Org-scoped keys require a project selector; project-scoped keys ignore it.
  if (PHARE_PROJECT_ID) h['X-Phare-Project-Id'] = PHARE_PROJECT_ID;
  else if (PHARE_PROJECT_SLUG) h['X-Phare-Project-Slug'] = PHARE_PROJECT_SLUG;
  return h;
}

export async function phare<T>(
  path: string,
  opts: { revalidate?: number; noStore?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const { revalidate = 30, noStore = false, timeoutMs = 15000 } = opts;
  const res = await fetch(`${PHARE_URL}${path}`, {
    headers: phareHeaders(),
    ...(noStore ? { cache: 'no-store' } : { next: { revalidate } }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Phare ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Phare payload types (subset we use) ──────────────────────────────────────

export interface PhareMonitor {
  id: number;
  name: string;
  status: 'fetching' | 'online' | 'offline' | 'partial' | 'paused';
  paused: boolean;
  response_time: number | null;
  protocol?: string;
  created_at: string;
  updated_at: string;
}

export type PhareImpact =
  | 'unknown' | 'operational' | 'degraded_performance'
  | 'partial_outage' | 'major_outage' | 'maintenance';

export interface PhareIncident {
  id: number;
  type: string;
  slug: string;
  state: 'unknown' | 'investigating' | 'identified' | 'monitoring' | 'resolved';
  status: string; // ongoing | recovering | recovered
  impact: PhareImpact;
  title: string;
  description: string;
  exclude_from_downtime: boolean;
  incident_at: string | null;
  recovery_at: string | null;
  monitors: number[];
  created_at: string;
  updated_at: string;
}

export interface PhareReport {
  id: number;
  name: string;
  incident_count: number;
  downtime: number;
  availability: number; // percentage 0..100
  mttr: number | null;
  mtbf: number | null;
  highest_incident_impact: string;
  incidents: PhareIncident[];
}

// ── Mappers ──────────────────────────────────────────────────────────────────

export const toSec = (iso: string | null | undefined): number | null =>
  iso ? Math.floor(new Date(iso).getTime() / 1000) : null;

export function monitorStatus(m: PhareMonitor): Status | 'NO_DATA' {
  switch (m.status) {
    case 'online':  return 'UP';
    case 'partial': return 'DEGRADED';
    case 'offline': return 'DOWN';
    default:        return 'NO_DATA'; // paused | fetching
  }
}

/** Day/point status implied by an incident's impact. */
export function impactStatus(impact: PhareImpact | string): Status | 'MAINTENANCE' {
  switch (impact) {
    case 'major_outage':
    case 'partial_outage':       return 'DOWN';
    case 'degraded_performance': return 'DEGRADED';
    case 'maintenance':          return 'MAINTENANCE';
    default:                     return 'UP'; // operational | unknown
  }
}

export const isMaintenance = (inc: PhareIncident): boolean =>
  inc.impact === 'maintenance' || inc.type === 'maintenance';

/** Frontend incident shape (matches the status pages' `Incident` interface). */
export function mapIncident(inc: PhareIncident) {
  return {
    id: inc.id,
    title: inc.title,
    status: inc.status || inc.state,
    state: inc.state === 'resolved' ? 'RESOLVED' : inc.state.toUpperCase(),
    incident_type: inc.type,
    incident_source: 'phare',
    start_date_time: toSec(inc.incident_at) ?? toSec(inc.created_at) ?? 0,
    end_date_time: toSec(inc.recovery_at),
    monitors: (inc.monitors ?? []).map((id) => ({
      monitor_tag: String(id),
      impact: inc.impact,
    })),
  };
}

/** Frontend maintenance-event shape. */
export function mapMaintenance(inc: PhareIncident) {
  const nowSec = Math.floor(Date.now() / 1000);
  const start = toSec(inc.incident_at) ?? toSec(inc.created_at) ?? 0;
  const end = toSec(inc.recovery_at);
  const event_status =
    end && end < nowSec ? 'COMPLETED'
    : start > nowSec    ? 'SCHEDULED'
    : 'ONGOING';
  return {
    id: inc.id,
    maintenance_id: inc.id,
    start_date_time: start,
    end_date_time: end ?? start,
    event_status,
    maintenance: {
      id: inc.id,
      title: inc.title,
      description: inc.description,
      monitors: (inc.monitors ?? []).map((id) => ({
        monitor_tag: String(id),
        impact: inc.impact,
      })),
    },
  };
}

// ── Daily uptime bars reconstructed from incidents ───────────────────────────

export interface DayBucket {
  date: string; // YYYY-MM-DD (UTC)
  status: Status | 'NO_DATA';
  up: number;       // seconds (relative weights for the gradient bar)
  degraded: number;
  down: number;
  avgLatency: number | null;
  maintenanceMinutes: number;
}

export function buildDaysFromIncidents(
  days: number,
  endTs: number,
  createdSec: number | null,
  monitorId: number,
  incidents: PhareIncident[],
): DayBucket[] {
  const mine = incidents.filter((i) => i.monitors?.includes(monitorId));
  const out: DayBucket[] = [];

  for (let i = 0; i < days; i++) {
    const dayTs = endTs - (days - 1 - i) * DAY;
    const date = new Date(dayTs * 1000).toISOString().slice(0, 10);
    const dayStart = Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000);
    const dayEnd = dayStart + DAY;

    // Before the monitor existed → no data for that day.
    if (createdSec != null && dayEnd <= createdSec) {
      out.push({ date, status: 'NO_DATA', up: 0, degraded: 0, down: 0, avgLatency: null, maintenanceMinutes: 0 });
      continue;
    }

    let downSec = 0, degSec = 0, maintSec = 0;
    for (const inc of mine) {
      const s = toSec(inc.incident_at) ?? toSec(inc.created_at);
      if (s == null) continue;
      const e = toSec(inc.recovery_at) ?? endTs; // ongoing → until now
      const oStart = Math.max(s, dayStart);
      const oEnd = Math.min(e, dayEnd);
      const overlap = oEnd - oStart;
      if (overlap <= 0) continue;
      const st = impactStatus(inc.impact);
      if (st === 'MAINTENANCE') maintSec += overlap;
      else if (st === 'DOWN')    downSec += overlap;
      else if (st === 'DEGRADED') degSec += overlap;
    }

    const upSec = Math.max(0, DAY - downSec - degSec - maintSec);
    const status: DayBucket['status'] = downSec > 0 ? 'DOWN' : degSec > 0 ? 'DEGRADED' : 'UP';
    out.push({
      date,
      status,
      up: Math.round(upSec),
      degraded: Math.round(degSec),
      down: Math.round(downSec),
      avgLatency: null,
      maintenanceMinutes: Math.round(maintSec / 60),
    });
  }
  return out;
}

/** Collect + de-dupe incidents from a set of per-monitor reports. */
export function collectIncidents(reports: (PhareReport | null)[]): PhareIncident[] {
  const map = new Map<number, PhareIncident>();
  for (const r of reports) {
    for (const inc of r?.incidents ?? []) map.set(inc.id, inc);
  }
  return [...map.values()];
}
