'use client';

/**
 * Conversations privées + groupes + présence, mappées en types alfy.
 * Porté depuis atelier/chrome/SidebarDms.tsx : api.getConversations,
 * résolution des profils via api.getUser, requestBulkPresence, puis
 * message:new / PRESENCE_UPDATE / CONVERSATION_CREATE.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { api } from '@/lib/api';
import { loadBootstrap, subscribeBootstrap } from '@/lib/bootstrap-store';
import { ensurePreviews, getPreview, subscribePreviews } from '@/lib/dm-preview-store';
import { useAuth } from '@/hooks/use-auth';
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
 * Les aperçus de DM arrivent chiffrés (E2EE).
 *
 * `dechiffre` est le texte clair produit par `dm-preview-store` quand le format
 * le permet ; on l'utilise en priorité. Sinon on retombe sur le libellé — soit
 * le message est dans l'ancien format Signal (déchiffrable une seule fois, donc
 * volontairement laissé à la vue de conversation), soit la clé manque.
 */
const CIPHER_PREFIXES = ['ecdh:', 'signal:', 'enc:', 'aes:'];
export function previewOf(raw?: string, dechiffre?: string | null): string {
  // Un aperçu tient sur une ligne : les retours chariot deviennent des espaces.
  if (dechiffre) return dechiffre.replace(/\s*\n+\s*/g, ' ').trim();
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
  /* Incrémenté à chaque lot d'aperçus déchiffrés — sert uniquement à
     redéclencher le rendu, les textes vivent dans `dm-preview-store`. */
  const [, setVersionApercus] = useState(0);
  /* `load` est mémoïsé sans dépendance : passer par une ref évite de le
     recréer (et donc de tout recharger) à chaque rendu de l'utilisateur. */
  const { user } = useAuth();
  const userIdRef = useRef<string>('');
  userIdRef.current = user?.id ?? '';
  const notifState = useSyncExternalStore(notif.subscribe, notif.getSnapshot, notif.getSnapshot);

  const load = useCallback(async (force = false) => {
    try {
      // Une seule requête d'amorçage, partagée avec les autres hooks. Le
      // profil du destinataire y est déjà résolu côté serveur : l'ancienne
      // version faisait un `getUser` PAR conversation privée pour des données
      // que la réponse contenait déjà (`participants[]`).
      const boot = await loadBootstrap(force);
      // Repli : si l'amorçage échoue (gateway indisponible, ancienne version
      // déployée), on retombe sur l'appel historique. Le profil du
      // destinataire manquera, mais la liste s'affiche.
      const list = boot
        ? (boot.conversations as unknown as Record<string, unknown>[])
        : (((await api.getConversations()) as { data?: unknown })?.data as Record<string, unknown>[]);

      if (!Array.isArray(list)) return;

      const initialPresence = new Map<string, AlfyPresence>();

      const resolved: CachedConversation[] = list.map((conv): CachedConversation => {
        const id = conv.id as string;
        const lastMessage = conv.lastMessage as string | undefined;
        const lastMessageAt = (conv.lastMessageAt ?? conv.updatedAt) as string | undefined;

        if (conv.type === 'dm' && conv.recipientId) {
          const recipientId = conv.recipientId as string;
          if (conv.recipientOnline === true) initialPresence.set(recipientId, 'online');
          return {
            id,
            type: 'dm',
            recipientId,
            recipientName:
              (conv.recipientName as string) ||
              (conv.name as string) ||
              recipientId,
            recipientAvatar: conv.recipientAvatar as string | undefined,
            lastMessage,
            lastMessageAt,
            lastMessageId: conv.lastMessageId as string | undefined,
            lastMessageSenderId: conv.lastMessageSenderId as string | undefined,
            lastMessageSenderContent: conv.lastMessageSenderContent as string | undefined,
            lastMessageE2eeType: conv.lastMessageE2eeType as number | null | undefined,
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
          lastMessageId: conv.lastMessageId as string | undefined,
          lastMessageSenderId: conv.lastMessageSenderId as string | undefined,
          lastMessageSenderContent: conv.lastMessageSenderContent as string | undefined,
          lastMessageE2eeType: conv.lastMessageE2eeType as number | null | undefined,
          participants: conv.participants as string[] | undefined,
        };
      });

      setConversations(resolved);
      if (initialPresence.size) setPresence(initialPresence);

      // Déchiffrer les aperçus par lots de 10, en tâche de fond : la liste
      // s'affiche immédiatement avec « Message chiffré » puis se remplit.
      const moi = userIdRef.current;
      if (moi) {
        void ensurePreviews(
          resolved
            .filter((c) => c.lastMessageId)
            .map((c) => ({
              messageId: c.lastMessageId as string,
              senderId: c.lastMessageSenderId ?? '',
              content: c.lastMessage ?? null,
              senderContent: c.lastMessageSenderContent ?? null,
              e2eeType: c.lastMessageE2eeType ?? null,
            })),
          moi,
        );
      }

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
    // Un autre consommateur (page Amis, shell…) peut rafraîchir l'amorçage :
    // on se resynchronise sans relancer de requête.
    const desabonneBootstrap = subscribeBootstrap(() => void load());
    // Chaque lot d'aperçus déchiffrés doit repeindre la liste.
    const desabonnePreviews = subscribePreviews(() => setVersionApercus((v) => v + 1));
    return () => {
      desabonneBootstrap();
      desabonnePreviews();
    };
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
          void load(true);
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
    const refresh = () => void load(true);

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
        lastMessage: previewOf(c.lastMessage, getPreview(c.lastMessageId)),
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
      lastMessage: previewOf(c.lastMessage, getPreview(c.lastMessageId)),
      lastMessageAt: c.lastMessageAt ?? new Date().toISOString(),
      unreadCount: notifState.unread.get(`group:${c.id}`) ?? 0,
    }));

  return { entries, groups, loading };
}
