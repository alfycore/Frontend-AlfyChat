'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { dmPrefetchCache } from '@/lib/dm-prefetch-cache';

const PREFETCH_CONV_COUNT = 10;
const PREFETCH_MSG_COUNT = 10;
const MAX_CONCURRENT = 3;

/**
 * Pré-charge les 10 premières conversations privées et leurs 10 derniers messages
 * dès que l'utilisateur est authentifié. Les résultats sont mis en cache dans
 * dmPrefetchCache et consommés par useMessages() pour un affichage instantané.
 */
export function usePrefetchDMs() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('alfychat_token') : null;
    if (!token) return;

    let cancelled = false;

    const run = async () => {
      // 1. Récupérer la liste des conversations (top 10)
      try {
        const response = await api.getConversations();
        if (cancelled || !response.success || !response.data) return;

        const allConvs = response.data as any[];
        dmPrefetchCache.setConversations(allConvs);

        const toFetch = allConvs.slice(0, PREFETCH_CONV_COUNT);

        // 2. Pré-charger les infos utilisateurs + messages par batchs de MAX_CONCURRENT
        for (let i = 0; i < toFetch.length; i += MAX_CONCURRENT) {
          if (cancelled) break;

          const batch = toFetch.slice(i, i + MAX_CONCURRENT);
          await Promise.all(
            batch.map(async (conv) => {
              const recipientId: string | undefined =
                conv.type === 'dm' ? conv.recipientId : undefined;
              const channelId: string | undefined =
                conv.type === 'group' ? conv.id : undefined;
              const cacheKey = recipientId ?? channelId;
              if (!cacheKey) return;

              // Pré-charger les infos utilisateur pour les DMs
              if (recipientId && !dmPrefetchCache.getUser(recipientId)) {
                try {
                  const userRes = await api.getUser(recipientId);
                  if (!cancelled && userRes.success && userRes.data) {
                    const u = userRes.data as any;
                    dmPrefetchCache.setUser(recipientId, {
                      id: u.id,
                      username: u.username,
                      displayName: u.displayName || u.username,
                      avatarUrl: u.avatarUrl,
                      bannerUrl: u.bannerUrl,
                      bio: u.bio,
                      status: u.status,
                      customStatus: u.customStatus ?? null,
                    });
                  }
                } catch {
                  // Silencieux
                }
              }

              // Ne pas re-fetch les messages si déjà en cache et frais
              if (dmPrefetchCache.getMessages(cacheKey)) return;

              try {
                const msgRes = await api.getMessages(
                  channelId,
                  recipientId,
                  PREFETCH_MSG_COUNT
                );
                if (!cancelled && msgRes.success && msgRes.data) {
                  dmPrefetchCache.setMessages(cacheKey, msgRes.data as any[]);
                }
              } catch {
                // Silencieux — le prefetch est best-effort
              }
            })
          );
        }
      } catch {
        // Silencieux — le prefetch est best-effort
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);
}
