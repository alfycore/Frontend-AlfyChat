'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Chip, Input, Label, TextField, toast } from '@heroui/react';
import {
  Ban, Boxes, Check, ChevronLeft, ChevronRight, Clock, HardDrive, Pause, RotateCcw,
} from 'lucide-react';

import { hostingApi } from '@/lib/hosting-api';
import { cn } from '@/lib/utils';
import {
  DateText, EmptyState, PageHeader, RowAction, SectionCard, StatCard, TableShell,
  TableSkeleton, Td, Th, Tr,
} from '@/components/alfy/admin/primitives';
import { ConfirmDialog } from '@/components/alfy/admin/confirm-dialog';

type ProviderStatus = 'pending' | 'active' | 'suspended' | 'banned';
type Filter = 'all' | ProviderStatus;

interface Provider {
  id: string;
  name: string;
  slug: string;
  email: string;
  country_code?: string | null;
  status: ProviderStatus;
  created_at: string;
}

interface HostingStats {
  total_providers: number;
  active_providers: number;
  pending_providers: number;
  online_db_nodes: number;
  online_media_nodes: number;
  total_db_nodes: number;
  total_media_nodes: number;
}

const PAGE_SIZE = 20;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',       label: 'Tous' },
  { key: 'pending',   label: 'En attente' },
  { key: 'active',    label: 'Actifs' },
  { key: 'suspended', label: 'Suspendus' },
  { key: 'banned',    label: 'Bannis' },
];

const STATUS_CHIP: Record<ProviderStatus, { label: string; color: 'warning' | 'success' | 'danger' | 'default' }> = {
  pending:   { label: 'En attente', color: 'warning' },
  active:    { label: 'Actif',      color: 'success' },
  suspended: { label: 'Suspendu',   color: 'default' },
  banned:    { label: 'Banni',      color: 'danger' },
};

export default function AdminHostingPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [stats, setStats]         = useState<HostingStats | null>(null);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [filter, setFilter]       = useState<Filter>('all');
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [updating, setUpdating]   = useState<string | null>(null);
  const [banning, setBanning]     = useState<Provider | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [provRes, statsRes] = await Promise.all([
      hostingApi.adminListProviders({ page, status: filter !== 'all' ? filter : undefined }),
      hostingApi.adminStats(),
    ]);
    if (provRes.success && provRes.data) {
      const d = provRes.data as { providers?: Provider[]; total?: number };
      setProviders(d.providers ?? []);
      setTotal(Number(d.total ?? 0));
      setError(null);
    } else {
      setError(provRes.error ?? 'Impossible de charger les hébergeurs.');
    }
    if (statsRes.success && statsRes.data) setStats(statsRes.data as HostingStats);
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (p: Provider, status: ProviderStatus) => {
    setUpdating(p.id);
    const res = await hostingApi.adminSetProviderStatus(p.id, status);
    setUpdating(null);
    if (!res.success) {
      setError(res.error ?? 'Le statut n’a pas pu être modifié.');
      return;
    }
    toast(`${p.name} : ${STATUS_CHIP[status].label.toLowerCase()}`);
    load();
  };

  const q = search.trim().toLowerCase();
  const visible = q
    ? providers.filter((p) => p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q))
    : providers;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Hébergement"
        description="Partenaires qui fournissent stockage et nœuds aux serveurs AlfyChat."
      >
        <Button size="sm" variant="secondary" onPress={load} isPending={loading}>
          <RotateCcw className="size-3.5" aria-hidden />
          Actualiser
        </Button>
      </PageHeader>

      {error && (
        <Alert status="danger" className="mb-5">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Hébergeurs" value={stats?.total_providers ?? 0} icon={Boxes} loading={!stats && loading} />
        <StatCard
          label="En attente"
          value={stats?.pending_providers ?? 0}
          icon={Clock}
          tone={stats?.pending_providers ? 'warning' : 'neutral'}
          loading={!stats && loading}
        />
        <StatCard label="Actifs" value={stats?.active_providers ?? 0} icon={Check} tone="success" loading={!stats && loading} />
        <StatCard
          label="Nœuds en ligne"
          value={(stats?.online_db_nodes ?? 0) + (stats?.online_media_nodes ?? 0)}
          hint={stats ? `sur ${(stats.total_db_nodes ?? 0) + (stats.total_media_nodes ?? 0)} déclarés` : undefined}
          icon={HardDrive}
          tone="accent"
          loading={!stats && loading}
        />
      </div>

      <SectionCard
        flush
        title="Hébergeurs"
        description={`${total} au total`}
        actions={
          <TextField value={search} onChange={setSearch} aria-label="Rechercher" className="w-56">
            <Label className="sr-only">Rechercher</Label>
            <Input placeholder="Nom ou e-mail…" />
          </TextField>
        }
      >
        <div className="flex flex-wrap gap-1 border-b border-separator px-4 py-2">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? 'secondary' : 'ghost'}
              className={cn(filter !== f.key && 'text-muted')}
              onPress={() => { setFilter(f.key); setPage(1); }}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {loading && providers.length === 0 ? (
          <TableSkeleton rows={4} cols={4} />
        ) : visible.length === 0 ? (
          <EmptyState icon={Boxes} title="Aucun hébergeur" description={q ? 'Aucun résultat sur cette page.' : undefined} />
        ) : (
          <TableShell
            minWidth={720}
            head={
              <>
                <Th>Hébergeur</Th>
                <Th>Statut</Th>
                <Th>Pays</Th>
                <Th>Inscrit le</Th>
                <Th align="right">Actions</Th>
              </>
            }
          >
            {visible.map((p) => {
              const chip = STATUS_CHIP[p.status] ?? STATUS_CHIP.pending;
              const busy = updating === p.id;
              return (
                <Tr key={p.id}>
                  <Td>
                    <p className="truncate text-sm font-medium">
                      {p.name} <span className="font-normal text-muted">@{p.slug}</span>
                    </p>
                    <p className="truncate text-xs text-muted">{p.email}</p>
                  </Td>
                  <Td>
                    <Chip size="sm" variant="soft" color={chip.color}><Chip.Label>{chip.label}</Chip.Label></Chip>
                  </Td>
                  <Td><span className="text-sm text-muted">{p.country_code || '—'}</span></Td>
                  <Td><DateText value={p.created_at} /></Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      {p.status !== 'active' && (
                        <RowAction
                          icon={Check}
                          label={p.status === 'pending' ? 'Approuver' : 'Réactiver'}
                          isDisabled={busy}
                          onPress={() => setStatus(p, 'active')}
                        />
                      )}
                      {p.status === 'active' && (
                        <RowAction icon={Pause} label="Suspendre" isDisabled={busy} onPress={() => setStatus(p, 'suspended')} />
                      )}
                      {p.status !== 'banned' && (
                        <RowAction icon={Ban} label="Bannir" tone="danger" isDisabled={busy} onPress={() => setBanning(p)} />
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </TableShell>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-separator px-4 py-2">
            <span className="text-xs text-muted">Page {page} / {pages}</span>
            <Button size="sm" variant="ghost" isIconOnly aria-label="Page précédente" isDisabled={page <= 1} onPress={() => setPage((n) => n - 1)}>
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button size="sm" variant="ghost" isIconOnly aria-label="Page suivante" isDisabled={page >= pages} onPress={() => setPage((n) => n + 1)}>
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        isOpen={banning !== null}
        title={`Bannir ${banning?.name ?? ''} ?`}
        description="L’hébergeur ne pourra plus proposer de nœuds. Vous pourrez le réactiver plus tard."
        confirmLabel="Bannir"
        onConfirm={async () => {
          if (banning) await setStatus(banning, 'banned');
          setBanning(null);
        }}
        onClose={() => setBanning(null)}
      />
    </>
  );
}
