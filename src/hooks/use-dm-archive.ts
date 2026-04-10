'use client';

// ==========================================
// ALFYCHAT - HOOK ARCHIVAGE DM HYBRIDE
// Gère le stockage local + P2P des MP anciens
// ==========================================

import { useEffect, useCallback, useRef, useState } from 'react';
import { socketService } from '@/lib/socket';
import { getDMLocalStore, type LocalArchivedMessage, type ArchiveMeta } from '@/lib/dm-local-store';

interface ArchiveStatus {
  conversationId: string;
  serverMessageCount: number;
  localMessageCount: number;
  oldestServerMessage?: string;
  oldestLocalMessage?: string;
  quotaUsagePercent: number;
}

interface ArchivePushPayload {
  conversationId: string;
  messages: LocalArchivedMessage[];
  reason: 'quota_exceeded' | 'age_exceeded' | 'purge_inactive';
  totalArchived: number;
}

interface PeerRequestPayload {
  requestId: string;
  conversationId: string;
  messageId?: string;
  beforeDate?: string;
  limit: number;
  requesterId: string;
}

interface ArchiveResponsePayload {
  conversationId: string;
  messages: LocalArchivedMessage[];
  fromPeerId: string;
  requestId: string;
  error?: string;
}

interface UseDMArchiveOptions {
  conversationId?: string;
  enabled?: boolean;
}

export function useDMArchive(options: UseDMArchiveOptions = {}) {
  const { conversationId, enabled = true } = options;
  const localStore = useRef(typeof window !== 'undefined' ? getDMLocalStore() : null);
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus | null>(null);
  const [localMeta, setLocalMeta] = useState<ArchiveMeta | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const pendingRequestsRef = useRef<Map<string, (messages: LocalArchivedMessage[]) => void>>(new Map());

  // ============================================================
  // RECEVOIR un push d'archivage du serveur
  // ============================================================
  const handleArchivePush = useCallback(async (event: any) => {
    const payload: ArchivePushPayload = event?.payload || event;
    if (!payload?.messages?.length || !localStore.current) return;

    // Filtrer seulement les messages de notre conversation (si spécifié)
    if (conversationId && payload.conversationId !== conversationId) return;

    setIsArchiving(true);
    console.log(`[Archive] Réception archive DM: ${payload.totalArchived} MP (${payload.reason})`);

    try {
      // Stocker dans IndexedDB
      const stored = await localStore.current.storeMessages(payload.messages);
      console.log(`[Archive] ${stored} MP stockés localement dans IndexedDB`);

      // Mettre à jour les métadonnées locales
      if (conversationId) {
        const meta = await localStore.current.getMeta(conversationId);
        setLocalMeta(meta);
      }

      // Confirmer la réception au serveur
      // (On a besoin de l'archiveLogId — il faudrait l'ajouter au payload)
      // Pour l'instant, on confirme via le conversationId
      socketService.confirmArchive(payload.conversationId, 'auto');
    } catch (error) {
      console.error('Erreur stockage archive locale:', error);
    } finally {
      setIsArchiving(false);
    }
  }, [conversationId]);

  // ============================================================
  // RÉPONDRE aux demandes de peers
  // ============================================================
  const handlePeerRequest = useCallback(async (event: any) => {
    const payload: PeerRequestPayload = event?.payload || event;
    if (!payload || !localStore.current) return;

    console.log(`[Archive] Demande peer: ${payload.requesterId} cherche dans ${payload.conversationId}`);

    try {
      let messages: LocalArchivedMessage[] = [];

      if (payload.messageId) {
        // Demande un message spécifique
        const msg = await localStore.current.getMessage(payload.messageId);
        if (msg) messages = [msg];
      } else {
        // Demande un lot de messages
        messages = await localStore.current.getMessagesByConversation(
          payload.conversationId,
          {
            before: payload.beforeDate,
            limit: payload.limit,
          }
        );
      }

      if (messages.length > 0) {
        console.log(`[Archive] Envoi de ${messages.length} MP archivés au peer ${payload.requesterId}`);
        socketService.respondToPeerArchiveRequest({
          requestId: payload.requestId,
          conversationId: payload.conversationId,
          messages,
          requesterId: payload.requesterId,
        });
      }
    } catch (error) {
      console.error('Erreur réponse peer archive:', error);
    }
  }, []);

  // ============================================================
  // RECEVOIR la réponse d'un peer
  // ============================================================
  const handleArchiveResponse = useCallback(async (event: any) => {
    const payload: ArchiveResponsePayload = event?.payload || event;
    if (!payload || !localStore.current) return;

    if (payload.messages?.length > 0) {
      // Stocker les messages récupérés localement aussi
      await localStore.current.storeMessages(payload.messages);
      console.log(`[Archive] ${payload.messages.length} MP récupérés du peer ${payload.fromPeerId}`);
    }

    // Résoudre la promesse en attente
    const resolver = pendingRequestsRef.current.get(payload.requestId);
    if (resolver) {
      resolver(payload.messages || []);
      pendingRequestsRef.current.delete(payload.requestId);
    }
  }, []);

  // ============================================================
  // RECEVOIR le statut d'archive
  // ============================================================
  const handleArchiveStatus = useCallback(async (event: any) => {
    const payload: ArchiveStatus = event?.payload || event;
    if (!payload) return;

    // Enrichir avec le count local
    if (localStore.current && payload.conversationId) {
      const localCount = await localStore.current.getMessageCount(payload.conversationId);
      const meta = await localStore.current.getMeta(payload.conversationId);
      
      setArchiveStatus({
        ...payload,
        localMessageCount: localCount,
        oldestLocalMessage: meta?.oldestMessageAt,
      });
    } else {
      setArchiveStatus(payload);
    }
  }, []);

  // ============================================================
  // SETUP / CLEANUP des listeners
  // ============================================================
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    socketService.onArchivePush(handleArchivePush);
    socketService.onArchivePeerRequest(handlePeerRequest);
    socketService.onArchiveResponse(handleArchiveResponse);
    socketService.onArchiveStatus(handleArchiveStatus);

    // Charger les métadonnées locales au montage
    if (conversationId && localStore.current) {
      localStore.current.getMeta(conversationId).then(setLocalMeta);
    }

    return () => {
      socketService.off('DM_ARCHIVE_PUSH', handleArchivePush);
      socketService.off('DM_ARCHIVE_PEER_REQUEST', handlePeerRequest);
      socketService.off('DM_ARCHIVE_RESPONSE', handleArchiveResponse);
      socketService.off('DM_ARCHIVE_STATUS', handleArchiveStatus);
    };
  }, [enabled, conversationId, handleArchivePush, handlePeerRequest, handleArchiveResponse, handleArchiveStatus]);

  // ============================================================
  // ACTIONS PUBLIQUES
  // ============================================================

  /**
   * Récupère des messages archivés (locaux d'abord, puis P2P)
   */
  const getArchivedMessages = useCallback(async (
    convId: string,
    options?: { before?: string; limit?: number }
  ): Promise<LocalArchivedMessage[]> => {
    if (!localStore.current) return [];

    // 1. Chercher localement d'abord
    const localMessages = await localStore.current.getMessagesByConversation(convId, {
      before: options?.before,
      limit: options?.limit || 50,
    });

    if (localMessages.length >= (options?.limit || 50)) {
      return localMessages;
    }

    // 2. Si pas assez localement, demander aux peers
    return new Promise((resolve) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      // Timeout: renvoyer ce qu'on a localement après 10s
      const timeout = setTimeout(() => {
        pendingRequestsRef.current.delete(requestId);
        resolve(localMessages);
      }, 10000);

      pendingRequestsRef.current.set(requestId, (peerMessages) => {
        clearTimeout(timeout);
        // Fusionner local + peer, dédupliquer par messageId
        const allMessages = [...localMessages, ...peerMessages];
        const unique = new Map(allMessages.map(m => [m.messageId, m]));
        const merged = Array.from(unique.values())
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        resolve(merged.slice(-(options?.limit || 50)));
      });

      socketService.requestArchivedMessage({
        conversationId: convId,
        beforeDate: options?.before,
        limit: options?.limit || 50,
      });
    });
  }, []);

  /**
   * Récupère un message archivé spécifique
   */
  const getArchivedMessage = useCallback(async (messageId: string, convId: string): Promise<LocalArchivedMessage | null> => {
    if (!localStore.current) return null;

    // Chercher localement d'abord
    const local = await localStore.current.getMessage(messageId);
    if (local) return local;

    // Demander aux peers
    return new Promise((resolve) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      const timeout = setTimeout(() => {
        pendingRequestsRef.current.delete(requestId);
        resolve(null);
      }, 10000);

      pendingRequestsRef.current.set(requestId, (messages) => {
        clearTimeout(timeout);
        resolve(messages.length > 0 ? messages[0] : null);
      });

      socketService.requestArchivedMessage({
        conversationId: convId,
        messageId,
      });
    });
  }, []);

  /**
   * Demande le statut d'archive au serveur
   */
  const refreshStatus = useCallback((convId?: string) => {
    const id = convId || conversationId;
    if (id) {
      socketService.requestArchiveStatus(id);
    }
  }, [conversationId]);

  /**
   * Récupère les métadonnées de toutes les conversations archivées
   */
  const getAllArchiveMeta = useCallback(async (): Promise<ArchiveMeta[]> => {
    if (!localStore.current) return [];
    return localStore.current.getAllMeta();
  }, []);

  /**
   * Nettoie l'archive locale d'une conversation
   */
  const clearArchive = useCallback(async (convId?: string) => {
    if (!localStore.current) return;
    const id = convId || conversationId;
    if (id) {
      await localStore.current.clearConversation(id);
      setLocalMeta(null);
    }
  }, [conversationId]);

  /**
   * Nettoie tout le stockage local (RGPD)
   */
  const clearAllArchives = useCallback(async () => {
    if (!localStore.current) return;
    await localStore.current.clearAll();
    setLocalMeta(null);
    setArchiveStatus(null);
  }, []);

  /**
   * Exporte les données locales (RGPD)
   */
  const exportLocalData = useCallback(async () => {
    if (!localStore.current) return [];
    return localStore.current.exportAll();
  }, []);

  /**
   * Estime la taille du stockage local
   */
  const getStorageSize = useCallback(async () => {
    if (!localStore.current) return 0;
    return localStore.current.estimateStorageSize();
  }, []);

  return {
    // État
    archiveStatus,
    localMeta,
    isArchiving,

    // Actions
    getArchivedMessages,
    getArchivedMessage,
    refreshStatus,
    getAllArchiveMeta,
    clearArchive,
    clearAllArchives,
    exportLocalData,
    getStorageSize,
  };
}
