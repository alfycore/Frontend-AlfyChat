// ==========================================
// ALFYCHAT — Aggregated status summary for the public status page.
// Powered by Phare.io (https://api.phare.io). One request per monitor report,
// merged into the shape the status page expects. Cached ~30s.
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import {
  phare,
  isConfigured,
  monitorStatus,
  impactStatus,
  isMaintenance,
  mapIncident,
  mapMaintenance,
  buildDaysFromIncidents,
  collectIncidents,
  toSec,
  DAY,
  type PhareMonitor,
  type PhareReport,
} from '@/lib/phare-status';

export async function GET(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Status API not configured' }, { status: 503 });
  }

  const days = Math.min(90, Math.max(7, Number(req.nextUrl.searchParams.get('days') || '60')));
  const endTs = Math.floor(Date.now() / 1000);
  const startTs = endTs - days * DAY;
  const fromISO = new Date(startTs * 1000).toISOString();
  const toISO = new Date(endTs * 1000).toISOString();

  try {
    const monitorsRes = await phare<{ data: PhareMonitor[] }>('/uptime/monitors?per_page=100');
    const monitors = monitorsRes.data.filter((m) => !m.paused);

    // One report per monitor (availability + incidents over the window).
    const reports = await Promise.all(
      monitors.map((m) =>
        phare<PhareReport>(
          `/uptime/monitors/${m.id}/report?from=${fromISO}&to=${toISO}&per_page=100`,
          { noStore: true, timeoutMs: 20000 },
        ).catch(() => null),
      ),
    );

    const allIncidents = collectIncidents(reports);

    const summaries = monitors.map((m, idx) => {
      const r = reports[idx];
      return {
        tag: String(m.id),
        name: m.name,
        current: monitorStatus(m),
        uptime: r ? r.availability / 100 : null,
        avgLatency: m.response_time ?? null,
        days: buildDaysFromIncidents(days, endTs, toSec(m.created_at), m.id, r?.incidents ?? []),
      };
    });

    // Overall = worst currently-observed status.
    const currents = summaries.map((s) => s.current);
    let overall: 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN' = 'UP';
    if (currents.some((c) => c === 'DOWN')) overall = 'DOWN';
    else if (currents.some((c) => c === 'DEGRADED')) overall = 'DEGRADED';
    else if (currents.length > 0 && currents.every((c) => c === 'NO_DATA')) overall = 'UNKNOWN';

    const incidents = allIncidents.filter((i) => !isMaintenance(i)).map(mapIncident);
    const maintenanceEvents = allIncidents.filter(isMaintenance).map(mapMaintenance);

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        windowDays: days,
        overall,
        monitors: summaries,
        incidents,
        maintenanceEvents,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
        },
      },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'upstream_error', message: String(err?.message || err) },
      { status: 502 },
    );
  }
}
