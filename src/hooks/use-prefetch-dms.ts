'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { dmPrefetchCache } from '@/lib/dm-prefetch-cache';
import { loadBootstrap } from '@/lib/bootstrap-store';

const PREFETCH_CONV_COUNT = 6;
const PREFETCH_MSG_COUNT = 20;

/**
 * Précharge les messages des conversations les plus récentes, pour que leur
 * ouverture soit instantanée.
 *
 * Ce hook faisait auparavant son propre `getConversations()` (le troisième de
 * la page), puis un `getUser()` par conversation — pour des profils que la
 * liste contenait déjà — puis un `getMessages()` par conversation, par lots
 * séquentiels de 3. Soit une vingtaine de requêtes en concurrence directe avec
 * le rendu initial.
 *
 * Désormais : les conversations et les profils viennent de l'amorçage partagé
 * (zéro requête supplémentaire), et seuls les messages sont préchargés — en
 * parallèle, et seulement après que la page a eu le temps de se peindre.
 */
export function usePrefetchDMs() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('alfychat_token') : null;
    if (!token) return;

    let cancelled = false;

    const run = async () => {
      const boot = await loadBootstrap();
      if (cancelled || !boot) return;

      dmPrefetchCache.setConversations(boot.conversations as unknown as any[]);

      // Les profils sont déjà dans l'amorçage : on remplit le cache sans
      // aucune requête réseau.
      for (const conv of boot.conversations) {
        if (conv.type !== 'dm' || !conv.recipientId) continue;
        if (dmPrefetchCache.getUser(conv.recipientId)) continue;
        dmPrefetchCache.setUser(conv.recipientId, {
          id: conv.recipientId,
          username: conv.recipientUsername ?? conv.recipientName ?? conv.recipientId,
          displayName: conv.recipientName ?? conv.recipientUsername ?? conv.recipientId,
          avatarUrl: conv.recipientAvatar,
          status: conv.recipientOnline ? 'online' : 'offline',
          customStatus: null,
        });
      }

      // Messages : uniquement les conversations les plus récentes, et en
      // parallèle. Le tri vient du serveur (ORDER BY updated_at DESC).
      const toFetch = boot.conversations.slice(0, PREFETCH_CONV_COUNT);
      await Promise.all(
        toFetch.map(async (conv) => {
          const recipientId = conv.type === 'dm' ? conv.recipientId : undefined;
          const channelId = conv.type === 'group' ? conv.id : undefined;
          const cacheKey = recipientId ?? channelId;
          if (!cacheKey || dmPrefetchCache.getMessages(cacheKey)) return;
          try {
            const msgRes = await api.getMessages(channelId, recipientId, PREFETCH_MSG_COUNT);
            if (!cancelled && msgRes.success && msgRes.data) {
              dmPrefetchCache.setMessages(cacheKey, msgRes.data as any[]);
            }
          } catch {
            // Le préchargement est best-effort : un échec ne se voit pas.
          }
        }),
      );
    };

    // Laisser le rendu initial passer devant : ce préchargement est un confort,
    // il ne doit pas concurrencer l'affichage de la page.
    const idle =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (window as unknown as { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number })
            .requestIdleCallback(() => void run(), { timeout: 3000 })
        : (setTimeout(() => void run(), 1200) as unknown as number);

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as unknown as { cancelIdleCallback: (h: number) => void }).cancelIdleCallback(idle);
      } else {
        clearTimeout(idle as unknown as ReturnType<typeof setTimeout>);
      }
    };
  }, [user?.id]);
}
