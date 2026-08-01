'use client';

/** Invitations d'un serveur (REST), mappées en types alfy. */

import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';
import type { AlfyInvite } from '@/components/alfy/mock/types';

export function useAlfyInvites(serverId: string | null) {
  const [invites, setInvites] = useState<AlfyInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!serverId) return;
    void (async () => {
      try {
        const res = await api.getServerInvites(serverId);
        const raw = ((res as { data?: unknown })?.data ?? res) as unknown;
        const list = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
        setInvites(
          list.map((i) => ({
            code: (i.code ?? i.slug ?? i.id) as string,
            createdBy: (i.createdBy ?? i.creatorId ?? '') as string,
            uses: Number(i.uses ?? 0),
            maxUses: i.maxUses != null ? Number(i.maxUses) : null,
            expiresAt: (i.expiresAt as string) ?? null,
          })),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [serverId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const create = useCallback(
    async (opts?: { maxUses?: number; expiresIn?: number }) => {
      if (!serverId) return;
      await api.createServerInvite(serverId, opts ?? {}).catch(() => null);
      reload();
    },
    [serverId, reload],
  );

  const remove = useCallback(
    async (inviteId: string) => {
      await api.deleteServerInvite(inviteId).catch(() => null);
      reload();
    },
    [reload],
  );

  return { invites, loading, create, remove, reload };
}
