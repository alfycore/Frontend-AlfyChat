'use client';

import { useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BanIcon, ShieldAlertIcon, ShieldCheckIcon, ShieldIcon } from '@/components/icons';
import { api } from '@/lib/api';

export default function AdminSecurityPage() {
  const [bannedIPs, setBannedIPs] = useState<any[]>([]);
  const [rlStats, setRlStats]     = useState<any>(null);
  const [rlConfig, setRlConfig]   = useState<any>(null);
  const [banIP, setBanIP]         = useState('');
  const [banReason, setBanReason] = useState('');
  const [loading, setLoading]     = useState(true);
  const [banning, setBanning]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.getGatewayStats();
    if (r.success && r.data) {
      const d = r.data as any;
      setBannedIPs(d.bannedIPs || []);
      setRlStats(d.rateLimitStats || null);
      setRlConfig(d.config || null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBan = async () => {
    if (!banIP.trim()) return;
    setBanning(true);
    try {
      await api.banIP(banIP.trim(), banReason.trim() || undefined);
      setBanIP(''); setBanReason('');
      await load();
    } finally { setBanning(false); }
  };

  if (loading) return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="h-8 w-36 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sécurité</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">IPs bannies et protection rate limiting.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">IPs bannies</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-destructive">{bannedIPs.length}</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-2.5">
              <BanIcon className="size-5 text-destructive" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Bloquées</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-amber-500">{rlStats?.totalBlocked ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">requêtes bloquées</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-2.5">
              <ShieldAlertIcon className="size-5 text-amber-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rate limit</p>
              <p className="mt-2 text-xl font-bold">
                {rlConfig ? `${rlConfig.max} req/${rlConfig.window}s` : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{rlStats?.activeWindows ?? 0} fenêtres actives</p>
            </div>
            <div className="rounded-lg bg-muted p-2.5">
              <ShieldIcon className="size-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Ban form */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <BanIcon className="size-4 text-destructive" />
            <p className="font-semibold">Bannir une IP</p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">L&apos;IP sera bloquée immédiatement au niveau du gateway.</p>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            <Input
              className="h-9 w-48 font-mono"
              placeholder="192.168.1.1"
              value={banIP}
              onChange={e => setBanIP(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBan()}
            />
            <Input
              className="h-9 flex-1 min-w-48"
              placeholder="Raison (optionnel)"
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBan()}
            />
            <Button
              variant="destructive"
              size="sm"
              className="h-9"
              disabled={!banIP.trim() || banning}
              onClick={handleBan}
            >
              <BanIcon className="size-4" />
              {banning ? 'Bannissement…' : 'Bannir'}
            </Button>
          </div>
        </div>
      </div>

      {/* IP list */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <ShieldAlertIcon className="size-4 text-amber-500" />
            <p className="font-semibold">IPs bannies</p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{bannedIPs.length}</span>
        </div>

        {bannedIPs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldCheckIcon className="mb-3 size-10 text-green-500/40" />
            <p className="font-medium">Aucune IP bannie</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Le gateway n&apos;a pas d&apos;IPs bloquées.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] border-b border-border bg-muted/20 px-5 py-2.5">
              {['IP', 'Raison', 'Banni par', 'Date', ''].map(h => (
                <span key={h} className="text-xs font-medium text-muted-foreground">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-border">
              {bannedIPs.map(b => (
                <div key={b.ip} className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/20">
                  <span className="font-mono text-sm">{b.ip}</span>
                  <span className="truncate text-sm text-muted-foreground">{b.reason || '—'}</span>
                  <span className="text-xs text-muted-foreground">{b.bannedBy || 'Système'}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {b.bannedAt ? new Date(b.bannedAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                  <button
                    onClick={() => api.unbanIP(b.ip).then(() => setBannedIPs(p => p.filter(x => x.ip !== b.ip)))}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    <ShieldCheckIcon className="size-3.5" /> Débannir
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
