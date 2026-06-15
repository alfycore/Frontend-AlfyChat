// ==========================================
// ALFYCHAT — Network status API route (Phare.io).
// Returns monitors, incidents and maintenance events for the network page.
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import {
  phare,
  isConfigured,
  monitorStatus,
  isMaintenance,
  mapIncident,
  mapMaintenance,
  collectIncidents,
  DAY,
  type PhareMonitor,
  type PhareReport,
} from '@/lib/phare-status';

export async function GET(_req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Status API not configured' }, { status: 503 });
  }

  const now = Math.floor(Date.now() / 1000);
  const past90 = now - 90 * DAY;
  const fromISO = new Date(past90 * 1000).toISOString();
  const toISO = new Date(now * 1000).toISOString();

  try {
    const monitorsRes = await phare<{ data: PhareMonitor[] }>('/uptime/monitors?per_page=100', {
      noStore: true,
    });

    const monitors = monitorsRes.data.map((m) => ({
      tag: String(m.id),
      name: m.name,
      status: m.paused ? 'INACTIVE' : 'ACTIVE',
      current: monitorStatus(m),
      response_time: m.response_time,
      is_hidden: 'NO',
    }));
    const monitorMap = Object.fromEntries(monitors.map((m) => [m.tag, m]));

    // Incidents (last 90 days) gathered from each active monitor's report.
    const reports = await Promise.all(
      monitorsRes.data
        .filter((m) => !m.paused)
        .map((m) =>
          phare<PhareReport>(
            `/uptime/monitors/${m.id}/report?from=${fromISO}&to=${toISO}&per_page=100`,
            { noStore: true, timeoutMs: 18000 },
          ).catch(() => null),
        ),
    );
    const allIncidents = collectIncidents(reports);

    const incidents = allIncidents.filter((i) => !isMaintenance(i)).map(mapIncident);
    const activeIncidents = incidents.filter((i) => i.state !== 'RESOLVED' && !i.end_date_time);
    const pastIncidents = incidents
      .filter((i) => i.state === 'RESOLVED' || !!i.end_date_time)
      .sort((a, b) => b.start_date_time - a.start_date_time);

    const maintenanceEvents = allIncidents.filter(isMaintenance).map(mapMaintenance);
    const upcomingEvents = maintenanceEvents.filter(
      (e) => e.event_status === 'SCHEDULED' || e.event_status === 'ONGOING',
    );
    const pastEvents = maintenanceEvents
      .filter((e) => e.event_status === 'COMPLETED')
      .sort((a, b) => b.start_date_time - a.start_date_time);

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        monitors,
        monitorMap,
        activeIncidents,
        pastIncidents,
        maintenances: maintenanceEvents,
        upcomingEvents,
        pastEvents,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'upstream_error', message: String(err?.message || err) },
      { status: 502 },
    );
  }
}
