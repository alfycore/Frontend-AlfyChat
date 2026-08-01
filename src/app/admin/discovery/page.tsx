'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Chip, Tabs } from '@heroui/react';
import { Check, Compass, RotateCcw, X } from 'lucide-react';

import { api } from '@/lib/api';
import {
  DateText, EmptyState, InitialAvatar, PageHeader, SectionCard, TableShell,
  TableSkeleton, Td, Th, Tr,
} from '@/components/alfy/admin/primitives';

type AppStatus = 'pending' | 'approved' | 'rejected';

interface Application {
  id: string;
  serverId: string;
  serverName?: string;
  serverIconUrl?: string | null;
  memberCount?: number;
  reason: string;
  status: AppStatus;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedByUsername?: string | null;
}

const TABS: { key: AppStatus; label: string }[] = [
  { key: 'pending',  label: 'En attente' },
  { key: 'approved', label: 'Acceptées' },
  { key: 'rejected', label: 'Refusées' },
];

const STATUS_CHIP: Record<AppStatus, { label: string; color: 'warning' | 'success' | 'danger' }> = {
  pending:  { label: 'En attente', color: 'warning' },
  approved: { label: 'Acceptée',   color: 'success' },
  rejected: { label: 'Refusée',    color: 'danger' },
};

export default function AdminDiscoveryPage() {
  const [status, setStatus]   = useState<AppStatus>('pending');
  const [items, setItems]     = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [busyId, setBusyId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await api.getDiscoverApplications(status);
    if (res.success && res.data) {
      const d = res.data as Application[] | { applications?: Application[] };
      setItems(Array.isArray(d) ? d : (d.applications ?? []));
    } else {
      setError(res.error ?? 'Impossible de charger les candidatures.');
    }
    setLoading(false);
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const review = async (app: Application, action: 'approved' | 'rejected') => {
    setBusyId(app.id);
    const res = await api.reviewApplication(app.id, action);
    setBusyId(null);
    if (res.success) load();
    else setError(res.error ?? 'La décision n’a pas pu être enregistrée.');
  };

  return (
    <>
      <PageHeader
        title="Découverte"
        description="Candidatures des serveurs souhaitant apparaître dans l’annuaire public."
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

      <Tabs selectedKey={status} onSelectionChange={(k) => setStatus(k as AppStatus)}>
        <Tabs.ListContainer>
          <Tabs.List aria-label="Filtrer les candidatures">
            {TABS.map((t) => (
              <Tabs.Tab key={t.key} id={t.key}>
                {t.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>

        {TABS.map((t) => (
          <Tabs.Panel key={t.key} id={t.key} className="pt-4">
            <SectionCard
              flush
              title={t.label}
              description={`${items.length} candidature${items.length > 1 ? 's' : ''}`}
            >
              {loading ? (
                <TableSkeleton rows={4} cols={4} />
              ) : items.length === 0 ? (
                <EmptyState
                  icon={Compass}
                  title={
                    t.key === 'pending'
                      ? 'Aucune candidature en attente'
                      : `Aucune candidature ${t.key === 'approved' ? 'acceptée' : 'refusée'}`
                  }
                  description={
                    t.key === 'pending'
                      ? 'Les nouvelles demandes apparaîtront ici.'
                      : undefined
                  }
                />
              ) : (
                <TableShell
                  minWidth={820}
                  head={
                    <>
                      <Th>Serveur</Th>
                      <Th>Motivation</Th>
                      <Th>Statut</Th>
                      <Th>Déposée</Th>
                      <Th align="right">Décision</Th>
                    </>
                  }
                >
                  {items.map((app) => (
                    <Tr key={app.id}>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <InitialAvatar
                            name={app.serverName ?? '?'}
                            src={app.serverIconUrl}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {app.serverName ?? app.serverId}
                            </p>
                            {app.memberCount != null && (
                              <p className="text-xs text-muted">{app.memberCount} membres</p>
                            )}
                          </div>
                        </div>
                      </Td>
                      <Td className="max-w-sm">
                        <p className="line-clamp-2 text-sm leading-relaxed" title={app.reason}>
                          {app.reason}
                        </p>
                      </Td>
                      <Td>
                        <Chip size="sm" variant="soft" color={STATUS_CHIP[app.status].color}>
                          <Chip.Label>{STATUS_CHIP[app.status].label}</Chip.Label>
                        </Chip>
                        {app.reviewedByUsername && (
                          <p className="mt-0.5 text-xs text-muted">
                            par @{app.reviewedByUsername}
                          </p>
                        )}
                      </Td>
                      <Td><DateText value={app.createdAt} /></Td>
                      <Td align="right">
                        {app.status === 'pending' ? (
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              isPending={busyId === app.id}
                              onPress={() => review(app, 'approved')}
                            >
                              <Check className="size-3.5" aria-hidden />
                              Accepter
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger hover:bg-danger/10"
                              isDisabled={busyId === app.id}
                              onPress={() => review(app, 'rejected')}
                            >
                              <X className="size-3.5" aria-hidden />
                              Refuser
                            </Button>
                          </div>
                        ) : (
                          <DateText value={app.reviewedAt} withTime />
                        )}
                      </Td>
                    </Tr>
                  ))}
                </TableShell>
              )}
            </SectionCard>
          </Tabs.Panel>
        ))}
      </Tabs>
    </>
  );
}
