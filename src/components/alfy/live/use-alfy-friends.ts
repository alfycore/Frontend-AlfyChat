'use client';

/**
 * Amis, demandes en attente et utilisateurs bloqués, mappés en types alfy.
 * Porté depuis atelier/people/FriendsHome.tsx.
 */

import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { toAlfyUser } from '@/components/alfy/live/map';
import type { AlfyUser } from '@/components/alfy/mock/types';

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
  const [friends, setFriends] = useState<AlfyUser[]>([]);
  const [pending, setPending] = useState<AlfyFriendRequest[]>([]);
  const [blocked, setBlocked] = useState<AlfyUser[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    void (async () => {
      try {
        const [fRes, rRes, bRes] = await Promise.all([
          api.getFriends().catch(() => null),
          api.getFriendRequests().catch(() => null),
          api.getBlockedUsers().catch(() => null),
        ]);

        setFriends(list(fRes).map((u) => toAlfyUser(u, (u.id as string) ?? '')));
        setBlocked(list(bRes).map((u) => toAlfyUser(u, (u.id as string) ?? '')));

        // Les demandes portent l'utilisateur soit à plat, soit imbriqué.
        setPending(
          list(rRes).map((r) => {
            const nested = (r.user ?? r.sender ?? r.requester ?? r.recipient) as
              | Record<string, unknown>
              | undefined;
            const raw = nested ?? r;
            const incoming =
              r.direction === 'incoming' ||
              r.type === 'incoming' ||
              Boolean(r.senderId ?? r.sender_id) ||
              !(r.direction || r.type);
            return {
              requestId: (r.id as string) ?? (raw.id as string) ?? '',
              user: toAlfyUser(raw, (raw.id as string) ?? ''),
              direction: incoming ? 'incoming' : 'outgoing',
            } satisfies AlfyFriendRequest;
          }),
        );
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
    const refresh = () => reload();
    socketService.on('FRIEND_REQUEST', refresh);
    socketService.on('FRIEND_ACCEPT', refresh);
    socketService.on('FRIEND_DECLINE', refresh);
    return () => {
      socketService.off('FRIEND_REQUEST', refresh);
      socketService.off('FRIEND_ACCEPT', refresh);
      socketService.off('FRIEND_DECLINE', refresh);
    };
  }, [reload]);

  const accept = useCallback(
    async (requestId: string) => {
      await api.acceptFriendRequest(requestId).catch(() => null);
      reload();
    },
    [reload],
  );

  const decline = useCallback(
    async (requestId: string) => {
      await api.declineFriendRequest(requestId).catch(() => null);
      reload();
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
      reload();
      return Boolean((res as { success?: boolean } | null)?.success);
    },
    [reload],
  );

  const unblock = useCallback(
    async (userId: string) => {
      await api.unblockUser(userId).catch(() => null);
      reload();
    },
    [reload],
  );

  return { friends, pending, blocked, loading, reload, accept, decline, add, unblock };
}
