'use client';

/**
 * Conversations privées + groupes + présence, mappées en types alfy.
 * Porté depuis atelier/chrome/SidebarDms.tsx : api.getConversations,
 * résolution des profils via api.getUser, requestBulkPresence, puis
 * message:new / PRESENCE_UPDATE / CONVERSATION_CREATE.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import * as notif from '@/lib/notification-store';
import { conversationUser, toAlfyDM, toPresence, unwrap } from '@/components/alfy/live/map';
import type { AlfyDM, AlfyGroupDM, AlfyPresence, AlfyUser } from '@/components/alfy/mock/types';
import type { CachedConversation } from '@/lib/conversations-store';

export interface AlfyDmEntry {
  dm: AlfyDM;
  user: AlfyUser;
}

/**
 * Les aperçus de DM arrivent chiffrés (E2EE) : afficher le texte brut
 * exposerait du charabia. On rend un libellé lisible à la place.
 */
const CIPHER_PREFIXES = ['ecdh:', 'signal:', 'enc:'];
export function previewOf(raw?: string): string {
  const text = (raw ?? '').trim();
  if (!text) return '';
  const looksEncrypted =
    CIPHER_PREFIXES.some((p) => text.startsWith(p)) ||
    (text.length > 60 && !text.includes(' '));
  return looksEncrypted ? 'Message chiffré' : text;
}

export function useAlfyDms(): {
  entries: AlfyDmEntry[];
  groups: AlfyGroupDM[];
  loading: boolean;
} {
  const [conversations, setConversations] = useState<CachedConversation[]>([]);
  const [presence, setPresence] = useState<Map<string, AlfyPresence>>(new Map());
  const [loading, setLoading] = useState(true);
  const notifState = useSyncExternalStore(notif.subscribe, notif.getSnapshot, notif.getSnapshot);

  const load = useCallback(async () => {
    try {
      const res = await api.getConversations();
      const list = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>[];
      if (!Array.isArray(list)) return;

      const initialPresence = new Map<string, AlfyPresence>();

      // Résolution des profils : l'API des conversations ne porte pas le nom.
      const resolved = await Promise.all(
        list.map(async (conv): Promise<CachedConversation> => {
          const id = conv.id as string;
          const lastMessage = conv.lastMessage as string | undefined;
          const lastMessageAt = (conv.lastMessageAt ?? conv.updatedAt) as string | undefined;

          if (conv.type === 'dm' && conv.recipientId) {
            const recipientId = conv.recipientId as string;
            const ur = await api.getUser(recipientId).catch(() => null);
            const u = (ur as { success?: boolean; data?: Record<string, unknown> } | null)?.data ?? null;
            if (u?.status) initialPresence.set(recipientId, toPresence(u.status));
            return {
              id,
              type: 'dm',
              recipientId,
              recipientName:
                (u?.displayName as string) ||
                (u?.username as string) ||
                (conv.name as string) ||
                recipientId,
              recipientAvatar: u?.avatarUrl as string | undefined,
              lastMessage,
              lastMessageAt,
            };
          }

          return {
            id,
            type: 'group',
            recipientId: (conv.recipientId as string) || id,
            recipientName: (conv.name as string) || 'Groupe',
            recipientAvatar: conv.avatarUrl as string | undefined,
            lastMessage,
            lastMessageAt,
            participants: conv.participants as string[] | undefined,
          };
        }),
      );

      setConversations(resolved);
      if (initialPresence.size) setPresence(initialPresence);

      const dmIds = resolved.filter((c) => c.type === 'dm').map((c) => c.recipientId);
      if (dmIds.length) {
        socketService.requestBulkPresence(dmIds, (entries: unknown) => {
          const next = new Map<string, AlfyPresence>();
          (entries as { userId?: string; id?: string; status?: string }[] | undefined)?.forEach((e) => {
            const id = e.userId ?? e.id;
            if (id) next.set(id, toPresence(e.status));
          });
          setPresence((prev) => new Map([...prev, ...next]));
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* Temps réel */
  useEffect(() => {
    const onPresence = (data: unknown) => {
      const d = unwrap(data);
      const id = (d?.userId ?? d?.id) as string | undefined;
      if (!id) return;
      setPresence((prev) => new Map(prev).set(id, toPresence(d.status)));
    };
    const onMessage = (data: unknown) => {
      const m = unwrap(data);
      const convId = (m?.conversationId ?? m?.conversation_id) as string | undefined;
      if (!convId) return;
      setConversations((prev) => {
        if (!prev.some((c) => c.id === convId)) {
          // Premier message d'une conversation encore inconnue côté client
          // (ex: nouvel ami qui vient d'écrire) : un simple .map() ne peut
          // pas la faire apparaître puisqu'elle n'existe pas encore dans la
          // liste locale. On recharge depuis le serveur pour qu'elle
          // apparaisse tout de suite dans la barre MP, sans attendre que
          // l'utilisateur passe par Amis → ouvrir le MP manuellement.
          void load();
          return prev;
        }
        return prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                lastMessage: (m.content as string) ?? c.lastMessage,
                lastMessageAt: (m.createdAt as string) ?? new Date().toISOString(),
              }
            : c,
        );
      });
    };
    const refresh = () => void load();

    socketService.on('PRESENCE_UPDATE', onPresence);
    socketService.on('message:new', onMessage);
    socketService.on('CONVERSATION_CREATE', refresh);
    socketService.on('FRIEND_ACCEPT', refresh);
    socketService.on('socket:reconnected', refresh);
    return () => {
      socketService.off('PRESENCE_UPDATE', onPresence);
      socketService.off('message:new', onMessage);
      socketService.off('CONVERSATION_CREATE', refresh);
      socketService.off('FRIEND_ACCEPT', refresh);
      socketService.off('socket:reconnected', refresh);
    };
  }, [load]);

  const byRecent = (a: { lastMessageAt?: string }, b: { lastMessageAt?: string }) =>
    new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime();

  const entries: AlfyDmEntry[] = conversations
    .filter((c) => c.type === 'dm')
    .sort(byRecent)
    .map((c) => ({
      dm: {
        ...toAlfyDM(c, notifState.unread.get(c.recipientId) ?? 0),
        lastMessage: previewOf(c.lastMessage),
      },
      user: conversationUser(c, presence.get(c.recipientId) ?? 'offline'),
    }));

  const groups: AlfyGroupDM[] = conversations
    .filter((c) => c.type === 'group')
    .sort(byRecent)
    .map((c) => ({
      id: c.id,
      name: c.recipientName,
      memberIds: c.participants ?? [],
      lastMessage: previewOf(c.lastMessage),
      lastMessageAt: c.lastMessageAt ?? new Date().toISOString(),
      unreadCount: notifState.unread.get(`group:${c.id}`) ?? 0,
    }));

  return { entries, groups, loading };
}
