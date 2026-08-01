'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Chip, Input, SearchField } from '@heroui/react';
import { BadgeCheck, Handshake, RotateCcw, Server, Star } from 'lucide-react';

import { api } from '@/lib/api';
import {
  EmptyState, InitialAvatar, PageHeader, SectionCard, TableShell, TableSkeleton,
  Td, Th, Toggle, Tr,
} from '@/components/alfy/admin/primitives';

interface AdminServer {
  id: string;
  name: string;
  iconUrl?: string | null;
  memberCount?: number;
  isCertified?: boolean;
  isPartnered?: boolean;
  isFeatured?: boolean;
}

const PAGE_SIZE = 25;

export default function AdminServerBadgesPage() {
  const [servers, setServers] = useState<AdminServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.getAllServersAdmin();
    if (res.success && res.data) {
      const d = res.data as AdminServer[] | { servers?: AdminServer[] };
      setServers(Array.isArray(d) ? d : (d.servers ?? []));
    } else {
      setError(res.error ?? 'Impossible de charger les serveurs.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return servers;
    return servers.filter((s) => s.name?.toLowerCase().includes(q));
  }, [servers, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /** Applique un badge et reflète l'état localement sans recharger la liste. */
  const setBadge = async (
    server: AdminServer,
    key: 'isCertified' | 'isPartnered',
    value: boolean,
  ) => {
    setServers((prev) => prev.map((s) => (s.id === server.id ? { ...s, [key]: value } : s)));
    const res = await api.updateServerBadges(server.id, { [key]: value });
    if (!res.success) {
      setError(res.error ?? 'La distinction n’a pas pu être appliquée.');
      load();
    }
  };

  const setFeatured = async (server: AdminServer, value: boolean) => {
    setServers((prev) =>
      prev.map((s) => (s.id === server.id ? { ...s, isFeatured: value } : s)),
    );
    const res = value ? await api.featureServer(server.id) : await api.unfeatureServer(server.id);
    if (!res.success) {
      setError(res.error ?? 'La mise en avant n’a pas pu être modifiée.');
      load();
    }
  };

  return (
    <>
      <PageHeader
        title="Badges serveurs"
        description="Certification, partenariat et mise en avant dans la découverte."
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

      <SectionCard
        flush
        title="Serveurs"
        description={`${filtered.length} serveur${filtered.length > 1 ? 's' : ''}`}
        actions={
          <SearchField
            aria-label="Rechercher un serveur"
            value={search}
            onChange={(v) => { setSearch(v); setPage(0); }}
            className="w-full sm:w-64"
          >
            <Input placeholder="Nom du serveur…" />
          </SearchField>
        }
      >
        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Server}
            title="Aucun serveur"
            description={search ? 'Aucun serveur ne correspond à cette recherche.' : undefined}
          />
        ) : (
          <>
            <TableShell
              minWidth={760}
              head={
                <>
                  <Th>Serveur</Th>
                  <Th>Membres</Th>
                  <Th align="center">Certifié</Th>
                  <Th align="center">Partenaire</Th>
                  <Th align="center">Mis en avant</Th>
                </>
              }
            >
              {visible.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <InitialAvatar name={s.name ?? '?'} src={s.iconUrl} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <div className="mt-0.5 flex gap-1">
                          {s.isCertified && (
                            <Chip size="sm" variant="soft" color="accent">
                              <Chip.Label>Certifié</Chip.Label>
                            </Chip>
                          )}
                          {s.isPartnered && (
                            <Chip size="sm" variant="soft" color="success">
                              <Chip.Label>Partenaire</Chip.Label>
                            </Chip>
                          )}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-sm tabular-nums text-muted">
                      {s.memberCount ?? '—'}
                    </span>
                  </Td>
                  <Td align="center">
                    <div className="flex justify-center">
                      <Toggle
                        isSelected={!!s.isCertified}
                        onChange={(v) => setBadge(s, 'isCertified', v)}
                        label={`Certifier ${s.name}`}
                      />
                    </div>
                  </Td>
                  <Td align="center">
                    <div className="flex justify-center">
                      <Toggle
                        isSelected={!!s.isPartnered}
                        onChange={(v) => setBadge(s, 'isPartnered', v)}
                        label={`Partenariat pour ${s.name}`}
                      />
                    </div>
                  </Td>
                  <Td align="center">
                    <div className="flex justify-center">
                      <Toggle
                        isSelected={!!s.isFeatured}
                        onChange={(v) => setFeatured(s, v)}
                        label={`Mettre en avant ${s.name}`}
                      />
                    </div>
                  </Td>
                </Tr>
              ))}
            </TableShell>

            {pageCount > 1 && (
              <div className="flex items-center justify-between border-t border-separator px-4 py-3">
                <p className="text-xs text-muted">
                  Page {page + 1} sur {pageCount}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={page === 0}
                    onPress={() => setPage((p) => p - 1)}
                  >
                    Précédent
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={page >= pageCount - 1}
                    onPress={() => setPage((p) => p + 1)}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { icon: BadgeCheck, label: 'Certifié',      hint: 'Serveur officiel ou vérifié par l’équipe.' },
          { icon: Handshake,  label: 'Partenaire',    hint: 'Communauté partenaire, mise en relation contractuelle.' },
          { icon: Star,       label: 'Mis en avant',  hint: 'Remonte en tête de la page Découverte.' },
        ].map(({ icon: Icon, label, hint }) => (
          <div key={label} className="flex gap-3 rounded-lg border border-border bg-surface p-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
