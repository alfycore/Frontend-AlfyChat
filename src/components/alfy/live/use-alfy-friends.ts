'use client';

/**
 * Amis, demandes en attente et utilisateurs bloqués, mappés en types alfy.
 * Porté depuis atelier/people/FriendsHome.tsx.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '@/lib/api';
import { loadBootstrap } from '@/lib/bootstrap-store';
import { socketService } from '@/lib/socket';
import { toAlfyUser, toPresence, unwrap } from '@/components/alfy/live/map';
import type { AlfyPresence, AlfyUser } from '@/components/alfy/mock/types';

export interface AlfyFriendRequest {
  /** Identifiant de la demande (nécessaire pour accepter/refuser). */
  requestId: string;
  user: AlfyUser;
  direction: 'incoming' | 'outgoing';
}

export interface AlfyFriendsData {
  friends: AlfyUser[];
  pending: AlfyFriendRequest[];
  blocked: AlfyUser[];
  loading: boolean;
  reload: () => void;
  accept: (requestId: string) => Promise<void>;
  decline: (requestId: string) => Promise<void>;
  add: (username: string) => Promise<boolean>;
  unblock: (userId: string) => Promise<void>;
}

const list = (res: unknown): Record<string, unknown>[] => {
  const data = ((res as { data?: unknown })?.data ?? res) as unknown;
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
};

export function useAlfyFriends(): AlfyFriendsData {
  const [rawFriends, setRawFriends] = useState<AlfyUser[]>([]);
  // `/api/friends` renvoie un `status` lu depuis une colonne DB figée (dernier
  // statut explicitement enregistré, jamais mis à jour pour les transitions
  // auto-idle/déconnexion) — pas la présence réelle. Sans ce recouvrement,
  // presque tout le monde restait affiché "en ligne" indéfiniment.
  const [presence, setPresence] = useState<Map<string, AlfyPresence>>(new Map());
  const [pending, setPending] = useState<AlfyFriendRequest[]>([]);
  const [blocked, setBlocked] = useState<AlfyUser[]>([]);
  const [loading, setLoading] = useState(true);

  const friends = useMemo(
    () => rawFriends.map((u) => ({ ...u, status: presence.get(u.id) ?? u.status })),
    [rawFriends, presence],
  );

  const reload = useCallback((force = false) => {
    void (async () => {
      try {
        // Amis, demandes et blocages arrivent dans la requête d'amorçage
        // partagée : trois appels de moins, et aucun si la barre latérale l'a
        // déjà déclenchée (la requête en vol est mutualisée).
        const boot = await loadBootstrap(force);
        const [fRes, rRes, bRes] = boot
          ? [boot.friends, boot.friendRequests, boot.blocked]
          : await Promise.all([
              api.getFriends().catch(() => null),
              api.getFriendRequests().catch(() => null),
              api.getBlockedUsers().catch(() => null),
            ]);

        const friendUsers = list(fRes).map((u) => toAlfyUser(u, (u.id as string) ?? ''));
        setRawFriends(friendUsers);
        setBlocked(list(bRes).map((u) => toAlfyUser(u, (u.id as string) ?? '')));

        const ids = friendUsers.map((u) => u.id).filter(Boolean);
        if (ids.length) {
          socketService.requestBulkPresence(ids, (entries: unknown) => {
            const next = new Map<string, AlfyPresence>();
            (entries as { userId?: string; id?: string; status?: string }[] | undefined)?.forEach((e) => {
              const id = e.userId ?? e.id;
              if (id) next.set(id, toPresence(e.status));
            });
            setPresence((prev) => new Map([...prev, ...next]));
          });
        }

        // GET /api/friends/requests répond { received: [...], sent: [...] }
        // (chaque entrée porte les champs utilisateur à plat + `id` = id de la
        // ligne friends, `userId` = l'autre personne) — PAS un tableau brut.
        // `list()` attend un tableau et retombait donc silencieusement sur []
        // pour cette réponse : les demandes en attente n'apparaissaient jamais.
        const reqData = ((rRes as { data?: unknown })?.data ?? rRes) as
          | { received?: Record<string, unknown>[]; sent?: Record<string, unknown>[] }
          | undefined;
        const toEntry = (direction: 'incoming' | 'outgoing') => (r: Record<string, unknown>) => ({
          requestId: (r.id as string) ?? '',
          // `r.id` est l'id de la ligne de demande, pas de l'utilisateur — et
          // toAlfyUser() priorise justement `id` sur `userId`. Sans l'écraser
          // ici, chaque demande se serait résolue vers un profil inexistant.
          user: toAlfyUser({ ...r, id: r.userId }, (r.userId as string) ?? ''),
          direction,
        } satisfies AlfyFriendRequest);
        setPending([
          ...(reqData?.received ?? []).map(toEntry('incoming')),
          ...(reqData?.sent ?? []).map(toEntry('outgoing')),
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /* Temps réel : demandes et acceptations */
  useEffect(() => {
    const refresh = () => reload(true);
    socketService.on('FRIEND_REQUEST', refresh);
    socketService.on('FRIEND_ACCEPT', refresh);
    socketService.on('FRIEND_DECLINE', refresh);
    return () => {
      socketService.off('FRIEND_REQUEST', refresh);
      socketService.off('FRIEND_ACCEPT', refresh);
      socketService.off('FRIEND_DECLINE', refresh);
    };
  }, [reload]);

  /* Temps réel : présence des amis */
  useEffect(() => {
    const onPresence = (data: unknown) => {
      const d = unwrap(data);
      const id = (d?.userId ?? d?.id) as string | undefined;
      if (!id) return;
      setPresence((prev) => new Map(prev).set(id, toPresence(d.status)));
    };
    socketService.on('PRESENCE_UPDATE', onPresence);
    return () => socketService.off('PRESENCE_UPDATE', onPresence);
  }, []);

  const accept = useCallback(
    async (requestId: string) => {
      await api.acceptFriendRequest(requestId).catch(() => null);
      reload(true);
    },
    [reload],
  );

  const decline = useCallback(
    async (requestId: string) => {
      await api.declineFriendRequest(requestId).catch(() => null);
      reload(true);
    },
    [reload],
  );

  const add = useCallback(
    async (username: string) => {
      const clean = username.trim().replace(/^@/, '');
      if (!clean) return false;
      // L'API attend un id : on résout le pseudo d'abord.
      const search = await api.searchUsers(clean).catch(() => null);
      const found = list(search).find(
        (u) => (u.username as string)?.toLowerCase() === clean.toLowerCase(),
      );
      const targetId = (found?.id as string) ?? clean;
      const res = await api.sendFriendRequest(targetId).catch(() => null);
      reload(true);
      return Boolean((res as { success?: boolean } | null)?.success);
    },
    [reload],
  );

  const unblock = useCallback(
    async (userId: string) => {
      await api.unblockUser(userId).catch(() => null);
      reload(true);
    },
    [reload],
  );

  return { friends, pending, blocked, loading, reload, accept, decline, add, unblock };
}
