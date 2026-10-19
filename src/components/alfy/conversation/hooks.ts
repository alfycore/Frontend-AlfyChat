'use client';

/**
 * Sélecteurs du module conversation. Chaque hook lit la tranche minimale :
 * une frappe dans un autre fil ne re-rend pas celui-ci, un changement de
 * présence ne recrée aucun message.
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { userProfileCache } from '@/lib/user-profile-cache';
import { resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { keyChangeOf, subscribeKeyChanges, type KeyChange } from '@/lib/e2ee/public-keys';
import { toPresence } from '@/components/alfy/live/map';
import { guildStore, useGuildStore } from '@/components/alfy/guild/store';
import type { AlfyPresence, AlfyUser } from '@/components/alfy/mock/types';
import { EMPTY_THREAD, useConversationStore } from '@/components/alfy/conversation/store';
import type { GroupMeta, ThreadState } from '@/components/alfy/conversation/types';

export function useThread(conversationId: string): ThreadState {
  return useConversationStore((s) => s.threads[conversationId] ?? EMPTY_THREAD);
}

/** Ids des personnes en train d'écrire (clé stable : pas de re-rendu à chaque ping). */
export function useTypingIds(conversationId: string): string[] {
  const key = useConversationStore((s) => Object.keys(s.typing[conversationId] ?? {}).sort().join(','));
  return useMemo(() => (key ? key.split(',') : []), [key]);
}

export function useGroup(groupId: string | null): GroupMeta | undefined {
  return useConversationStore((s) => (groupId ? s.groups[groupId] : undefined));
}

/** Présence en direct (alimentée par le temps réel global). */
export function usePresenceOf(userId: string | null | undefined): AlfyPresence {
  return useGuildStore((s) => (userId ? (s.presence[userId]?.status ?? 'offline') : 'offline'));
}

/** Demande une fois la présence des personnes affichées (ensuite : temps réel). */
export function useRequestPresence(userIds: string[]) {
  const key = [...new Set(userIds)].filter(Boolean).sort().join(',');
  useEffect(() => {
    if (!key) return;
    socketService.requestBulkPresence(key.split(','), (entries) => {
      const batch: Record<string, { status: AlfyPresence; customStatus: string | null }> = {};
      for (const e of entries ?? []) if (e?.userId) batch[e.userId] = { status: toPresence(e.status), customStatus: e.customStatus ?? null };
      if (Object.keys(batch).length) guildStore.patchPresence(batch);
    });
  }, [key]);
}

/* Même contenu → même objet : sans ça, chaque présence reçue recréait tous les
   auteurs et re-rendait toutes les lignes du fil. */
const stable = new Map<string, AlfyUser>();
function stableUser(u: AlfyUser): AlfyUser {
  const prev = stable.get(u.id);
  if (
    prev &&
    prev.username === u.username &&
    prev.displayName === u.displayName &&
    prev.avatarUrl === u.avatarUrl &&
    prev.status === u.status &&
    prev.customStatus === u.customStatus &&
    prev.bannerUrl === u.bannerUrl &&
    prev.bio === u.bio
  ) {
    return prev;
  }
  stable.set(u.id, u);
  return u;
}

/**
 * Résolveur de personnes pour le fil : profils mis en cache (messages,
 * membres du groupe, amorçage du MP) + présence en direct + soi-même.
 */
export function usePeople(extra?: AlfyUser[]): (id: string) => AlfyUser {
  const { user } = useAuth();
  const version = useSyncExternalStore(userProfileCache.subscribe, userProfileCache.getSnapshot, userProfileCache.getServerSnapshot);
  const presence = useGuildStore((s) => s.presence);
  return useMemo(() => {
    void version;
    const table = new Map<string, AlfyUser>();
    for (const u of extra ?? []) table.set(u.id, u);
    return (id: string): AlfyUser => {
      const known = table.get(id);
      const p = userProfileCache.getProfile(id);
      const live = presence[id];
      if (user && id === user.id) {
        return stableUser({
          id,
          username: user.username,
          displayName: user.displayName || user.username,
          avatarUrl: resolveMediaUrl(user.avatarUrl),
          status: live?.status ?? 'online',
          badges: [],
          createdAt: '',
        });
      }
      const base: AlfyUser = known ?? {
        id,
        username: p?.username || '',
        displayName: p?.displayName || p?.username || '…',
        avatarUrl: resolveMediaUrl(p?.avatarUrl ?? undefined),
        status: 'offline',
        badges: [],
        createdAt: '',
      };
      return stableUser({
        ...base,
        displayName: base.displayName || p?.displayName || p?.username || base.username,
        avatarUrl: base.avatarUrl ?? resolveMediaUrl(p?.avatarUrl ?? undefined),
        status: live?.status ?? base.status,
        customStatus: live?.customStatus ?? base.customStatus,
      });
    };
  }, [extra, user, version, presence]);
}

/** Changement de clé constaté pour ce contact (alerte dans le fil). */
export function useKeyChange(userId: string | null | undefined): KeyChange | undefined {
  const [change, setChange] = useState<KeyChange | undefined>(() => (userId ? keyChangeOf(userId) : undefined));
  useEffect(() => {
    if (!userId) return;
    return subscribeKeyChanges((c) => {
      if (c.userId === userId) setChange(c);
    });
  }, [userId]);
  return userId && change?.userId === userId ? change : userId ? keyChangeOf(userId) : undefined;
}
