import { NextResponse } from 'next/server';

const GATEWAY = (process.env.NEXT_PUBLIC_API_URL || 'https://gateway.alfychat.app').replace(/\/$/, '');

export const revalidate = 60;

export async function GET() {
  try {
    const r = await fetch(`${GATEWAY}/api/stats`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return NextResponse.json(d, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' },
    });
  } catch {
    return NextResponse.json(
      { totalUsers: null, onlineUsers: null, totalServers: null, totalMembers: null, connectedWS: null },
      { headers: { 'Cache-Control': 'public, max-age=10' } },
    );
  }
}
