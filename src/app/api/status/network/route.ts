// ==========================================
// ALFYCHAT — Network status API route
// Returns monitors, all incidents and maintenances for the network page.
// ==========================================

import { NextRequest, NextResponse } from 'next/server';

const KENER_URL   = (process.env.KENER_URL   || 'https://status.alfychat.app').replace(/\/$/, '');
const KENER_TOKEN = process.env.KENER_API_TOKEN || '';

const DAY = 86400;

async function kener<T>(path: string): Promise<T> {
  const res = await fetch(`${KENER_URL}${path}`, {
    headers: { Authorization: `Bearer ${KENER_TOKEN}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Kener ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export async function GET(_req: NextRequest) {
  if (!KENER_TOKEN) {
    return NextResponse.json({ error: 'Status API not configured' }, { status: 503 });
  }

  const now    = Math.floor(Date.now() / 1000);
  const past90 = now - 90 * DAY;
  const next30 = now + 30 * DAY;

  try {
    const [monitorsRes, incidentsRes, maintsRes, maintEventsRes] = await Promise.all([
      kener<{ monitors: any[] }>('/api/v4/monitors'),
      kener<{ incidents: any[] }>(`/api/v4/incidents?start_ts=${past90}&end_ts=${next30}`),
      kener<{ maintenances: any[] }>('/api/v4/maintenances'),
      kener<{ events: any[] }>(`/api/v4/maintenances/events?start_ts=${now - 7 * DAY}&end_ts=${next30}&limit=100`)
        .catch(() => ({ events: [] })),
    ]);

    const monitors = monitorsRes.monitors.filter(m => m.is_hidden !== 'YES');

    // Split incidents
    const activeIncidents = incidentsRes.incidents.filter(
      i => i.state !== 'RESOLVED' && !i.end_date_time,
    );
    const pastIncidents = incidentsRes.incidents
      .filter(i => i.state === 'RESOLVED' || !!i.end_date_time)
      .sort((a: any, b: any) => b.start_date_time - a.start_date_time);

    // Split maintenance events
    const upcomingEvents = maintEventsRes.events.filter(
      (e: any) => e.event_status === 'SCHEDULED' || e.event_status === 'ONGOING',
    );
    const pastEvents = maintEventsRes.events.filter(
      (e: any) => e.event_status === 'COMPLETED' || e.event_status === 'CANCELLED',
    );

    // Compute per-monitor current status from monitors list
    const monitorMap = Object.fromEntries(monitors.map(m => [m.tag, m]));

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      monitors,
      monitorMap,
      activeIncidents,
      pastIncidents,
      maintenances: maintsRes.maintenances,
      upcomingEvents,
      pastEvents,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'upstream_error', message: String(err?.message || err) },
      { status: 502 },
    );
  }
}
