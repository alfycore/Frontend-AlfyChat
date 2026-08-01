// ==========================================
// ALFYCHAT — Server-side proxy to Kener v4
// Injects the Bearer token from env; exposes only safe GET endpoints to the
// public status page.
// ==========================================

import { NextRequest, NextResponse } from 'next/server';

const KENER_URL   = (process.env.KENER_URL || 'https://status.alfychat.app').replace(/\/$/, '');
const KENER_TOKEN = process.env.KENER_API_TOKEN || '';

// Only expose read-only endpoints — protects against the token being used to
// create/modify incidents through the public proxy.
const ALLOWED = [
  /^monitors$/,
  /^monitors\/[a-z0-9_-]+$/i,
  /^monitors\/[a-z0-9_-]+\/data$/i,
  /^incidents$/,
  /^incidents\/\d+$/,
  /^incidents\/\d+\/comments$/,
  /^maintenances$/,
  /^maintenances\/events$/,
  /^site$/,
];

export const revalidate = 30; // seconds — upstream-cached response TTL

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  if (!KENER_TOKEN) {
    return NextResponse.json({ error: 'Status API not configured' }, { status: 503 });
  }
  const { path } = await ctx.params;
  const joined = path.join('/');
  if (!ALLOWED.some(rx => rx.test(joined))) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 404 });
  }

  const qs = req.nextUrl.search;
  const upstream = `${KENER_URL}/api/v4/${joined}${qs}`;

  const res = await fetch(upstream, {
    headers: { Authorization: `Bearer ${KENER_TOKEN}` },
    next: { revalidate: 30 },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  if (!res) return NextResponse.json({ error: 'Upstream unreachable' }, { status: 502 });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') || 'application/json',
      'Cache-Control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
    },
  });
}
