'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { useDMArchive } from '@/hooks/use-dm-archive';
import { signalService } from '@/lib/signal-service';
import { api } from '@/lib/api';
import { notify } from '@/hooks/use-notification';

interface Reaction {
  emoji: string;
  userIds: string[];
  count: number;
}

interface Message {
  id: string;
  content: string;
  authorId: string;
  channelId?: string;
  conversationId?: string;
  recipientId?: string;
  replyToId?: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  reactions: Reaction[];
  sender?: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  pending?: boolean;
  /** true si le message a été déchiffré avec succès via Signal Protocol */
  e2ee?: boolean;
  /** Message système local (non envoyé au serveur) */
  isSystem?: boolean;
  /** Message éphémère : disparaît automatiquement après quelques secondes */
  ephemeral?: boolean;
}

/**
 * Déchiffre un message Signal côté client.
 * Retourne le texte en clair ou un fallback si le déchiffrement échoue.
 */
async function decryptMessage(
  raw: {
    content: string;
    senderContent?: string;
    e2eeType?: 1 | 3;
    senderId: string;
  },
  currentUserId: string
): Promise<{ content: string; e2ee: boolean }> {
  if (!raw.e2eeType) {
    // Message non chiffré (canal serveur ou ancien message)
    return { content: raw.content, e2ee: false };
  }

  // Si on est l'expéditeur et qu'on a senderContent, on peut déchiffrer directement
  // Si on est le destinataire, s'assurer que la session est établie avant de déchiffrer
  const isSender = raw.senderId === currentUserId;
  if (!isSender) {
    await ensureSignalSession(raw.senderId);
  }

  try {
    const plaintext = await signalService.decrypt(
      raw.senderId,
      currentUserId,
      raw.content,
      raw.senderContent,
      raw.e2eeType
    );
    return { content: plaintext, e2ee: true };
  } catch (err) {
    console.warn('[Signal] Déchiffrement échoué:', err);
    return { content: '🔒 Message chiffré (session non établie)', e2ee: true };
  }
}

/**
 * Récupère et met en cache le bundle de clés publiques du destinataire.
 * Avec ECDH direct, aucune session n'est nécessaire — le bundle suffit.
 * Déduplique les appels concurrents pour le même userId.
 */
const _pendingBundleFetches = new Map<string, Promise<boolean>>();

async function ensureSignalSession(recipientId: string): Promise<boolean> {
  // Bundle déjà en cache avec ecdhKey → OK
  const cached = signalService.getCachedBundle(recipientId);
  if (cached?.ecdhKey) return true;

  // Réutiliser la promesse en cours si déjà en vol (évite N appels API simultanés)
  const inflight = _pendingBundleFetches.get(recipientId);
  if (inflight) return inflight;

  const promise = (async (): Promise<boolean> => {
    try {
      const res = await api.getSignalKeyBundle(recipientId) as any;
      if (!res?.success || !res?.data) {
        console.error('[Signal] Bundle introuvable pour', recipientId);
        return false;
      }
      if (!res.data.ecdhKey) {
        console.error('[Signal] Le destinataire n\'a pas de clé ECDH P-256', recipientId);
        return false;
      }
      signalService.setCachedBundle(recipientId, res.data);
      return true;
    } catch (err) {
      console.error('[Signal] Impossible de récupérer le bundle:', err);
      return false;
    } finally {
      _pendingBundleFetches.delete(recipientId);
    }
  })();

  _pendingBundleFetches.set(recipientId, promise);
  return promise;
}

/** Agrège les réactions brutes { emoji, userId } en { emoji, userIds, count } */
function groupReactions(raw: Array<{ emoji: string; userId: string }>): Reaction[] {
  const map = new Map<string, string[]>();
  for (const r of raw) {
    const existing = map.get(r.emoji);
    if (existing) {
      if (!existing.includes(r.userId)) existing.push(r.userId);
    } else {
      map.set(r.emoji, [r.userId]);
    }
  }
  return Array.from(map.entries()).map(([emoji, userIds]) => ({
    emoji,
    userIds,
    count: userIds.length,
  }));
}

interface TypingUser {
  id: string;
  username: string;
}

export function useMessages(channelId?: string, recipientId?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [hasOlderArchived, setHasOlderArchived] = useState(false);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);

  // Ref pour éviter les closures périmées dans les handlers WebSocket
  const userIdRef = useRef<string>('');
  useEffect(() => {
    userIdRef.current = user?.id ?? '';
  }, [user?.id]);

  // File FIFO des plaintexts DM en attente de confirmation.
  // Évite le bug rapid-send où plusieurs messages envoyés rapidement
  // faisaient afficher le ciphertext brut à la place du texte clair.
  const pendingContentsRef = useRef<string[]>([]);

  /** Calcule le conversationId pour envoyer avec les réactions */
  const getConversationId = useCallback((): string | null => {
    if (channelId) return channelId;
    if (recipientId && user) {
      const sortedIds = [user.id, recipientId].sort();
      return `dm_${sortedIds[0]}_${sortedIds[1]}`;
    }
    return null;
  }, [channelId, recipientId, user]);

  // Intégration archivage DM
  const isDM = !!recipientId;
  const convId = getConversationId();
  const {
    getArchivedMessages,
    archiveStatus,
    localMeta,
    isArchiving,
  } = useDMArchive({
    conversationId: convId || undefined,
    enabled: isDM,
  });

  useEffect(() => {
    if (!channelId && !recipientId) return;
    // Attendre que l'utilisateur soit chargé (évite les closures avec user=null)
    if (!user) return;

    // Vérifier si l'utilisateur est authentifié avant d'utiliser le socket
    const token = typeof window !== 'undefined' ? localStorage.getItem('alfychat_token') : null;
    if (!token) {
      console.log('⚠️ Pas de token - WebSocket non initialisé');
      setIsLoading(false);
      return;
    }

    // Rejoindre la conversation WebSocket
    if (recipientId) {
      socketService.joinConversation(recipientId);
      // Pré-charger le bundle E2EE en parallèle avec les messages
      // → supprime la latence du fetch de clé lors du 1er chiffrement/déchiffrement
      ensureSignalSession(recipientId);
    } else if (channelId) {
      socketService.joinConversation(undefined, channelId);
    }

    // Charger les messages initiaux via API
    loadMessages();

    // Écouter les nouveaux messages (événement message:new)
    const handleNewMessage = async (message: any) => {
      console.log('📨 Nouveau message reçu:', message);

      const rawReactions: Array<{ emoji: string; userId: string }> = message.reactions || [];
      const groupedReactions = groupReactions(rawReactions);
      // Utiliser la ref pour éviter la closure périmée
      const currentUserId = userIdRef.current;
      const senderId = message.senderId || message.authorId;
      const isSelf = senderId === currentUserId;

      // Pour nos propres messages DM : ne pas re-décrypter si déjà confirmé
      // (message:sent a déjà remplacé le pending avec le plaintext)
      if (isSelf && message.e2eeType) {
        // Vérifier si le message est déjà confirmé dans la liste
        setMessages((prev) => {
          // Si déjà confirmé avec cet ID (non-pending) → ignorer le doublon
          if (prev.some(m => m.id === message.id && !m.pending)) return prev;
          // Si un pending existe encore, laisser message:sent le gérer
          if (prev.some(m => m.pending && m.authorId === senderId)) return prev;
          return prev;
        });
        return;
      }

      // Déchiffrer le message Signal si nécessaire
      const { content, e2ee } = await decryptMessage(
        {
          content: message.content,
          senderContent: message.senderContent,
          e2eeType: message.e2eeType,
          senderId,
        },
        currentUserId
      );

      const normalizedMessage: Message = {
        id: message.id,
        content,
        e2ee,
        authorId: senderId,
        channelId: message.channelId,
        conversationId: message.conversationId,
        recipientId: message.recipientId,
        replyToId: message.replyToId,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        isEdited: !!message.isEdited,
        reactions: groupedReactions,
        sender: message.sender,
      };

      setMessages((prev) => {
        const existingMsg = prev.find(m => m.id === normalizedMessage.id);
        if (existingMsg) {
          // Déjà confirmé (via message:sent) → ne pas écraser le plaintext conservé
          if (!existingMsg.pending) return prev;
          // Encore pending → remplacer par le message déchiffré
          return prev.map(m => m.id === normalizedMessage.id ? normalizedMessage : m);
        }
        // Remplacer uniquement le PREMIER message optimiste (pending) de cet auteur
        let replaced = false;
        const next = prev.map(m => {
          if (!replaced && m.pending && m.authorId === normalizedMessage.authorId) {
            replaced = true;
            return normalizedMessage;
          }
          return m;
        });
        if (replaced) return next;
        return [...prev, normalizedMessage];
      });
    };

    socketService.on('message:new', handleNewMessage);

    const handleMessageSent = (data: any) => {
      console.log('✅ Confirmation message envoyé:', data);
      if (data.success && data.message) {
        const rawReactions: Array<{ emoji: string; userId: string }> = data.message.reactions || [];
        const groupedReactions = groupReactions(rawReactions);
        const authorId = data.message.senderId || data.message.authorId;
        const isDM = !!data.message.e2eeType;

        // Dépiler le plaintext correspondant (ordre FIFO = ordre d'envoi)
        const plaintext = isDM ? pendingContentsRef.current.shift() : undefined;

        setMessages((prev) => {
          // Retirer UN SEUL message pending de cet auteur (le plus ancien)
          let removed = false;
          const withoutOnePending = prev.filter(m => {
            if (!removed && m.pending && m.authorId === authorId) {
              removed = true;
              return false;
            }
            return true;
          });
          // Éviter les doublons
          if (withoutOnePending.some(m => m.id === data.message.id)) return withoutOnePending;

          const confirmedMessage: Message = {
            id: data.message.id,
            // Pour les DMs : utiliser le plaintext de la file FIFO
            content: isDM ? (plaintext ?? data.message.content) : data.message.content,
            e2ee: isDM,
            authorId,
            channelId: data.message.channelId,
            conversationId: data.message.conversationId,
            recipientId: data.message.recipientId,
            replyToId: data.message.replyToId,
            createdAt: data.message.createdAt,
            updatedAt: data.message.updatedAt,
            isEdited: !!data.message.isEdited,
            reactions: groupedReactions,
            sender: data.message.sender,
          };
          return [...withoutOnePending, confirmedMessage];
        });
      }
    };
    socketService.on('message:sent', handleMessageSent);

    // Écouter les erreurs de message (rate-limit, etc.)
    const handleMessageError = (data: any) => {
      console.warn('⚠️ Erreur message:', data);
      // Retirer les messages pending (optimistes) car le serveur les a rejetés
      setMessages((prev) => prev.filter(m => !m.pending));
    };
    socketService.on('message:error', handleMessageError);

    // Écouter les modifications
    const handleMessageEdit = (data: any) => {
      const { messageId, content, updatedAt } = data as { messageId: string; content: string; updatedAt: string };
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content, updatedAt, isEdited: true } : m))
      );
    };
    socketService.on('message:edited', handleMessageEdit);

    // Écouter les suppressions
    const handleMessageDelete = (data: any) => {
      const { messageId } = data as { messageId: string };
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };
    socketService.on('message:deleted', handleMessageDelete);

    // Écouter le typing
    const handleTyping = (data: any) => {
      const { users } = data as { users: TypingUser[] };
      setTypingUsers(users);
    };
    socketService.on('typing:update', handleTyping);

    // Écouter les réactions
    const handleReactionAdd = (data: any) => {
      const payload = data.payload || data;
      const { messageId, userId: reactUserId, emoji } = payload;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const existing = m.reactions.find((r) => r.emoji === emoji);
          if (existing) {
            if (existing.userIds.includes(reactUserId)) return m;
            return {
              ...m,
              reactions: m.reactions.map((r) =>
                r.emoji === emoji
                  ? { ...r, userIds: [...r.userIds, reactUserId], count: r.count + 1 }
                  : r
              ),
            };
          }
          return {
            ...m,
            reactions: [...m.reactions, { emoji, userIds: [reactUserId], count: 1 }],
          };
        })
      );
    };

    const handleReactionRemove = (data: any) => {
      const payload = data.payload || data;
      const { messageId, userId: reactUserId, emoji } = payload;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          return {
            ...m,
            reactions: m.reactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, userIds: r.userIds.filter((id) => id !== reactUserId), count: r.count - 1 }
                  : r
              )
              .filter((r) => r.count > 0),
          };
        })
      );
    };

    socketService.onReactionAdd(handleReactionAdd);
    socketService.onReactionRemove(handleReactionRemove);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('message:sent', handleMessageSent);
      socketService.off('message:error', handleMessageError);
      socketService.off('message:edited', handleMessageEdit);
      socketService.off('message:deleted', handleMessageDelete);
      socketService.off('typing:update', handleTyping);
      socketService.off('REACTION_ADD', handleReactionAdd);
      socketService.off('REACTION_REMOVE', handleReactionRemove);
    };
    // Inclure user?.id pour recharger les messages si l'utilisateur change (ex: reload complet)
  }, [channelId, recipientId, user?.id]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      // Lancer le fetch du bundle E2EE en parallèle avec les messages
      const bundlePromise = recipientId ? ensureSignalSession(recipientId) : Promise.resolve(true);
      const response = await api.getMessages(channelId, recipientId);

      if (response.success && response.data) {
        const rawMessages = response.data as any[];
        const currentUserId = userIdRef.current || user?.id || '';

        // Afficher immédiatement les messages non-chiffrés (canaux serveur)
        // Les messages DM chiffrés affichent un placeholder vide pendant le déchiffrement
        const immediate = rawMessages.map((m) => ({
          id: m.id,
          content: m.e2eeType ? '' : m.content,
          e2ee: !!m.e2eeType,
          authorId: m.senderId || m.authorId,
          channelId: m.channelId,
          conversationId: m.conversationId,
          recipientId: m.recipientId,
          replyToId: m.replyToId,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          isEdited: !!m.isEdited,
          reactions: groupReactions(m.reactions || []),
          sender: m.sender,
        }));
        setMessages(immediate);
        setHasMoreMessages(rawMessages.length >= 50);
        // Afficher sans attendre le déchiffrement → latence perçue = 0
        setIsLoading(false);

        // Déchiffrer en arrière-plan (bundle déjà en cours de chargement)
        const encryptedMsgs = rawMessages.filter((m) => m.e2eeType);
        if (encryptedMsgs.length > 0) {
          await bundlePromise;
          await Promise.all(
            encryptedMsgs.map(async (m) => {
              const { content, e2ee } = await decryptMessage(
                {
                  content: m.content,
                  senderContent: m.senderContent,
                  e2eeType: m.e2eeType,
                  senderId: m.senderId || m.authorId,
                },
                currentUserId
              );
              // Mettre à jour chaque message au fur et à mesure qu'il est déchiffré
              setMessages((prev) =>
                prev.map((msg) => (msg.id === m.id ? { ...msg, content, e2ee } : msg))
              );
            })
          );
        }
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  };

  const loadMoreMessages = useCallback(async () => {
    if (!hasMoreMessages || isLoadingMoreMessages) return;
    const oldest = messages[0];
    if (!oldest) return;

    setIsLoadingMoreMessages(true);
    try {
      const response = await api.getMessages(channelId, recipientId, 50, oldest.createdAt);
      if (response.success && response.data) {
        const rawMessages = response.data as any[];
        const currentUserId = userIdRef.current || user?.id || '';

        // Afficher immédiatement les messages non-chiffrés
        const immediate = rawMessages.map((m) => ({
          id: m.id,
          content: m.e2eeType ? '' : m.content,
          e2ee: !!m.e2eeType,
          authorId: m.senderId || m.authorId,
          channelId: m.channelId,
          conversationId: m.conversationId,
          recipientId: m.recipientId,
          replyToId: m.replyToId,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          isEdited: !!m.isEdited,
          reactions: groupReactions(m.reactions || []),
          sender: m.sender,
        }));

        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          const newMsgs = immediate.filter((m) => !existing.has(m.id));
          return [...newMsgs, ...prev];
        });
        setHasMoreMessages(rawMessages.length >= 50);

        // Déchiffrer en arrière-plan
        const encryptedMsgs = rawMessages.filter((m) => m.e2eeType);
        if (encryptedMsgs.length > 0) {
          if (recipientId) await ensureSignalSession(recipientId);
          await Promise.all(
            encryptedMsgs.map(async (m) => {
              const { content, e2ee } = await decryptMessage(
                {
                  content: m.content,
                  senderContent: m.senderContent,
                  e2eeType: m.e2eeType,
                  senderId: m.senderId || m.authorId,
                },
                currentUserId
              );
              setMessages((prev) =>
                prev.map((msg) => (msg.id === m.id ? { ...msg, content, e2ee } : msg))
              );
            })
          );
        }
      }
    } finally {
      setIsLoadingMoreMessages(false);
    }
  }, [hasMoreMessages, isLoadingMoreMessages, messages, channelId, recipientId, user]);

  const sendMessage = useCallback(
    async (content: string, replyToId?: string) => {
      if (!user) return;

      // Message optimiste : afficher le texte clair immédiatement
      const optimisticMessage: Message = {
        id: `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        content,
        authorId: user.id,
        channelId,
        recipientId,
        replyToId,
        createdAt: new Date().toISOString(),
        reactions: [],
        sender: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        pending: true,
        e2ee: !!recipientId, // DMs → E2EE
      };
      setMessages((prev) => [...prev, optimisticMessage]);

      // Pour les DMs : chiffrer obligatoirement avec Signal Protocol
      if (recipientId) {
        try {
          // S'assurer qu'une session Signal est établie avec le destinataire
          const sessionOk = await ensureSignalSession(recipientId);

          if (!sessionOk) {
            console.error('[Signal] Session E2EE non établie — message bloqué');
            setMessages((prev) => {
              const withoutPending = prev.filter(m => !m.pending);
              const ephemeralId = `ephemeral_${Date.now()}`;
              const ephemeralMsg: Message = {
                id: ephemeralId,
                content: "⚠️ Ce contact n'a pas encore mis à jour son compte. Il doit se connecter une fois pour activer le chiffrement E2EE.",
                authorId: '',
                createdAt: new Date().toISOString(),
                reactions: [],
                isSystem: true,
                ephemeral: true,
              };
              setTimeout(() => {
                setMessages((cur) => cur.filter(m => m.id !== ephemeralId));
              }, 8000);
              return [...withoutPending, ephemeralMsg];
            });
            return;
          }

          const encrypted = await signalService.encrypt(recipientId, content, user.id);
          // Empiler le plaintext dans la file FIFO avant d'envoyer
          pendingContentsRef.current.push(content);
          socketService.sendMessage({
            channelId,
            recipientId,
            content: encrypted.content,
            senderContent: encrypted.senderContent,
            e2eeType: encrypted.e2eeType,
            replyToId,
          });
        } catch (err) {
          console.error('[Signal] Erreur chiffrement message:', err);
          // Retirer le message optimiste
          setMessages((prev) => prev.filter(m => !m.pending));
        }
        return;
      }

      // Canaux serveur (pas de E2EE)
      socketService.sendMessage({
        channelId,
        recipientId,
        content,
        replyToId,
      });
    },
    [channelId, recipientId, user]
  );

  const editMessage = useCallback((messageId: string, content: string) => {
    socketService.editMessage(messageId, content, getConversationId() || undefined);
  }, [getConversationId]);

  const deleteMessage = useCallback((messageId: string) => {
    socketService.deleteMessage(messageId, getConversationId() || undefined);
  }, [getConversationId]);

  const addReaction = useCallback((messageId: string, emoji: string) => {
    const convId = getConversationId();
    if (convId) socketService.addReaction(messageId, emoji, convId);
  }, [getConversationId]);

  const removeReaction = useCallback((messageId: string, emoji: string) => {
    const convId = getConversationId();
    if (convId) socketService.removeReaction(messageId, emoji, convId);
  }, [getConversationId]);

  const startTyping = useCallback(() => {
    socketService.startTyping(channelId, recipientId);
  }, [channelId, recipientId]);

  const stopTyping = useCallback(() => {
    socketService.stopTyping(channelId, recipientId);
  }, [channelId, recipientId]);

  /**
   * Charge les MP archivés plus anciens (P2P / IndexedDB)
   * Utile quand l'utilisateur scrolle vers le haut au-delà des MP serveur
   */
  const loadOlderArchived = useCallback(async (limit = 50) => {
    if (!isDM || !convId) return;
    
    setIsLoadingArchived(true);
    try {
      const oldestMessage = messages[0];
      const archivedMessages = await getArchivedMessages(convId, {
        before: oldestMessage?.createdAt,
        limit,
      });

      if (archivedMessages.length > 0) {
        // Convertir les messages archivés au format Message
        const converted: Message[] = archivedMessages.map(m => ({
          id: m.messageId,
          content: m.content,
          authorId: m.senderId,
          conversationId: m.conversationId,
          replyToId: m.replyToId,
          createdAt: typeof m.createdAt === 'string' ? m.createdAt : new Date(m.createdAt).toISOString(),
          reactions: [],
          sender: undefined, // Les messages archivés n'ont pas les infos sender
        }));

        setMessages(prev => {
          const existing = new Set(prev.map(m => m.id));
          const newMsgs = converted.filter(m => !existing.has(m.id));
          return [...newMsgs, ...prev];
        });

        setHasOlderArchived(archivedMessages.length >= limit);
      } else {
        setHasOlderArchived(false);
      }
    } catch (error) {
      console.error('Erreur chargement MP archivés:', error);
    } finally {
      setIsLoadingArchived(false);
    }
  }, [isDM, convId, messages, getArchivedMessages]);

  // Vérifier s'il y a des messages archivés plus anciens quand les messages sont chargés
  useEffect(() => {
    if (isDM && localMeta && messages.length > 0) {
      const oldestServerMsg = messages[0]?.createdAt;
      if (localMeta.newestMessageAt && localMeta.newestMessageAt < oldestServerMsg) {
        setHasOlderArchived(true);
      }
    }
  }, [isDM, localMeta, messages]);

  return {
    messages,
    typingUsers,
    isLoading,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    startTyping,
    stopTyping,
    refresh: loadMessages,
    // Pagination serveur
    hasMoreMessages,
    isLoadingMoreMessages,
    loadMoreMessages,
    // Système hybride DM
    hasOlderArchived,
    isLoadingArchived,
    isArchiving,
    loadOlderArchived,
    archiveStatus,
  };
}
