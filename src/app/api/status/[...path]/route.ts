// ==========================================
// ALFYCHAT — Per-monitor intraday data for the status page day-detail modal.
//
// Phare.io exposes no raw per-minute time series, so we reconstruct a point
// series for the requested window from the monitor's report incidents:
// every step is UP unless an incident overlaps it (DOWN / DEGRADED).
// Only `monitors/{id}/data` is served — everything else returns 404.
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import {
  phare,
  isConfigured,
  impactStatus,
  toSec,
  type PhareMonitor,
  type PhareReport,
} from '@/lib/phare-status';

const STEP = 300; // 5-minute resolution

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Status API not configured' }, { status: 503 });
  }

  const { path } = await ctx.params;
  // Expect exactly: monitors/{id}/data
  if (path.length !== 3 || path[0] !== 'monitors' || path[2] !== 'data' || !/^\d+$/.test(path[1])) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 404 });
  }

  const id = Number(path[1]);
  const now = Math.floor(Date.now() / 1000);
  const startTs = Number(req.nextUrl.searchParams.get('start_ts')) || now - 86400;
  const endTsRaw = Number(req.nextUrl.searchParams.get('end_ts')) || now;
  const endTs = Math.min(endTsRaw, now); // don't synthesize points in the future

  try {
    const fromISO = new Date(startTs * 1000).toISOString();
    const toISO = new Date(endTsRaw * 1000).toISOString();

    const [monitor, report] = await Promise.all([
      phare<PhareMonitor>(`/uptime/monitors/${id}`).catch(() => null),
      phare<PhareReport>(
        `/uptime/monitors/${id}/report?from=${fromISO}&to=${toISO}&per_page=100`,
        { noStore: true },
      ).catch(() => null),
    ]);

    const baseLatency = monitor?.response_time ?? 0;
    const incidents = (report?.incidents ?? []).filter((i) => i.monitors?.includes(id));

    const data: Array<{ monitor_tag: string; timestamp: number; status: string; latency: number; type: string }> = [];

    for (let t = startTs; t <= endTs; t += STEP) {
      let status: 'UP' | 'DOWN' | 'DEGRADED' = 'UP';
      for (const inc of incidents) {
        const s = toSec(inc.incident_at) ?? toSec(inc.created_at);
        if (s == null) continue;
        const e = toSec(inc.recovery_at) ?? now;
        if (t < s || t > e) continue;
        const st = impactStatus(inc.impact);
        if (st === 'DOWN') { status = 'DOWN'; break; }
        if (st === 'DEGRADED') status = 'DEGRADED';
      }
      data.push({
        monitor_tag: String(id),
        timestamp: t,
        status,
        latency: status === 'DOWN' ? 0 : baseLatency,
        type: 'http',
      });
    }

    return NextResponse.json(
      { data },
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
