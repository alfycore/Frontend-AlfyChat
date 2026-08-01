'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Input, Label, Modal, TextField } from '@heroui/react';
import { Ban, Gauge, RotateCcw, ShieldAlert, ShieldOff, Trash2 } from 'lucide-react';

import { api } from '@/lib/api';
import {
  DateText, EmptyState, PageHeader, SectionCard, StatCard, TableShell,
  TableSkeleton, Td, Th, Tr,
} from '@/components/alfy/admin/primitives';

interface BannedIP {
  ip: string;
  reason?: string;
  bannedAt?: string;
  hits?: number;
}

interface RateLimitStats {
  blocked?: number;
  tracked?: number;
  topOffenders?: { ip: string; count: number }[];
}

interface RateLimitConfig {
  anon?: number;
  user?: number;
  admin?: number;
  windowSeconds?: number;
}

export default function AdminSecurityPage() {
  const [bannedIPs, setBannedIPs] = useState<BannedIP[]>([]);
  const [stats, setStats]   = useState<RateLimitStats | null>(null);
  const [config, setConfig] = useState<RateLimitConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const [banOpen, setBanOpen] = useState(false);
  const [ip, setIp]           = useState('');
  const [reason, setReason]   = useState('');
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.getGatewayStats();
    if (res.success && res.data) {
      const d = res.data as {
        bannedIPs?: BannedIP[];
        rateLimitStats?: RateLimitStats;
        config?: RateLimitConfig;
      };
      setBannedIPs(d.bannedIPs ?? []);
      setStats(d.rateLimitStats ?? null);
      setConfig(d.config ?? null);
    } else {
      setError(res.error ?? 'Impossible de charger les données de sécurité.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const ban = async () => {
    if (!ip.trim()) {
      setError('L’adresse IP est obligatoire.');
      return;
    }
    setSaving(true);
    const res = await api.banIP(ip.trim(), reason.trim() || undefined);
    setSaving(false);

    if (!res.success) {
      setError(res.error ?? 'L’adresse n’a pas pu être bannie.');
      return;
    }
    setBanOpen(false);
    setIp('');
    setReason('');
    load();
  };

  const unban = async (entry: BannedIP) => {
    const res = await api.unbanIP(entry.ip);
    if (res.success) load();
  };

  return (
    <>
      <PageHeader
        title="Sécurité"
        description="Bannissements d’adresses IP au niveau du gateway et limitation de débit."
      >
        <Button size="sm" variant="secondary" onPress={load} isPending={loading}>
          <RotateCcw className="size-3.5" aria-hidden />
          Actualiser
        </Button>
        <Button size="sm" variant="danger" onPress={() => setBanOpen(true)}>
          <Ban className="size-3.5" aria-hidden />
          Bannir une IP
        </Button>
      </PageHeader>

      {error && (
        <Alert status="danger" className="mb-5">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="admin-stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="IP bannies"
          value={bannedIPs.length}
          icon={ShieldOff}
          tone="danger"
          loading={loading}
        />
        <StatCard
          label="Requêtes bloquées"
          value={stats?.blocked?.toLocaleString('fr-FR') ?? '—'}
          hint="Par la limitation de débit"
          icon={ShieldAlert}
          tone="warning"
          loading={loading}
        />
        <StatCard
          label="Clients suivis"
          value={stats?.tracked?.toLocaleString('fr-FR') ?? '—'}
          icon={Gauge}
          loading={loading}
        />
        <StatCard
          label="Fenêtre"
          value={config?.windowSeconds != null ? `${config.windowSeconds} s` : '—'}
          hint={
            config
              ? `anon ${config.anon ?? '—'} · user ${config.user ?? '—'} · admin ${config.admin ?? '—'}`
              : undefined
          }
          icon={Gauge}
          tone="accent"
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          flush
          title="Adresses bannies"
          description={`${bannedIPs.length} adresse${bannedIPs.length > 1 ? 's' : ''}`}
          className="lg:col-span-2"
        >
          {loading ? (
            <TableSkeleton rows={4} cols={3} />
          ) : bannedIPs.length === 0 ? (
            <EmptyState
              icon={ShieldOff}
              title="Aucune adresse bannie"
              description="Le gateway ne bloque actuellement aucune adresse IP."
            />
          ) : (
            <TableShell
              minWidth={560}
              head={
                <>
                  <Th>Adresse</Th>
                  <Th>Motif</Th>
                  <Th>Depuis</Th>
                  <Th align="right">Action</Th>
                </>
              }
            >
              {bannedIPs.map((entry) => (
                <Tr key={entry.ip}>
                  <Td><code className="font-mono text-xs">{entry.ip}</code></Td>
                  <Td>
                    <span className="text-sm text-muted">{entry.reason || '—'}</span>
                  </Td>
                  <Td><DateText value={entry.bannedAt} withTime /></Td>
                  <Td align="right">
                    <Button
                      size="sm"
                      variant="ghost"
                      isIconOnly
                      aria-label={`Débannir ${entry.ip}`}
                      onPress={() => unban(entry)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </Td>
                </Tr>
              ))}
            </TableShell>
          )}
        </SectionCard>

        <SectionCard title="Adresses les plus actives" description="Sur la fenêtre courante">
          {!stats?.topOffenders?.length ? (
            <p className="py-8 text-center text-xs text-muted">Aucune donnée disponible.</p>
          ) : (
            <ul className="space-y-2">
              {stats.topOffenders.slice(0, 10).map((o) => (
                <li key={o.ip} className="flex items-center justify-between gap-3">
                  <code className="truncate font-mono text-xs">{o.ip}</code>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {o.count.toLocaleString('fr-FR')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* ── Bannissement ── */}
      <Modal.Backdrop isOpen={banOpen} onOpenChange={setBanOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-danger/12 text-danger">
                <Ban className="size-5" aria-hidden />
              </Modal.Icon>
              <Modal.Heading>Bannir une adresse IP</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="space-y-4">
              <Alert status="warning">
                <Alert.Content>
                  <Alert.Description>
                    Le blocage s’applique au niveau du gateway : toutes les connexions
                    depuis cette adresse sont refusées, sessions comprises.
                  </Alert.Description>
                </Alert.Content>
              </Alert>

              <TextField value={ip} onChange={setIp} isRequired>
                <Label>Adresse IP</Label>
                <Input placeholder="203.0.113.42" autoComplete="off" />
              </TextField>

              <TextField value={reason} onChange={setReason}>
                <Label>Motif</Label>
                <Input placeholder="Tentatives d’authentification répétées" autoComplete="off" />
              </TextField>
            </Modal.Body>

            <Modal.Footer>
              <Button slot="close" variant="tertiary" isDisabled={saving}>Annuler</Button>
              <Button variant="danger" onPress={ban} isPending={saving}>Bannir</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
