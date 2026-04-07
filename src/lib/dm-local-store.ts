// ==========================================
// ALFYCHAT - STOCKAGE LOCAL DM (IndexedDB)
// Archive P2P des messages anciens côté client
// ==========================================

const DB_NAME = 'alfychat-dm-archive';
const DB_VERSION = 1;
const STORE_MESSAGES = 'archived_messages';
const STORE_META = 'archive_meta';

export interface LocalArchivedMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  content: string;           // Contenu chiffré E2EE
  nonce: string;
  encryptionKey: string;
  replyToId?: string;
  createdAt: string;         // ISO string
  archivedAt: string;        // ISO string
}

export interface ArchiveMeta {
  conversationId: string;
  messageCount: number;
  oldestMessageAt: string;
  newestMessageAt: string;
  lastSyncAt: string;
}

/**
 * Ouvre la base IndexedDB pour l'archivage DM
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store des messages archivés
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const msgStore = db.createObjectStore(STORE_MESSAGES, { keyPath: 'messageId' });
        msgStore.createIndex('conversationId', 'conversationId', { unique: false });
        msgStore.createIndex('conv_created', ['conversationId', 'createdAt'], { unique: false });
        msgStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Store des métadonnées par conversation
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'conversationId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Service de stockage local pour les MP archivés
 */
export class DMLocalStore {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = openDB();
  }

  // ============================================================
  // STOCKAGE DE MESSAGES
  // ============================================================

  /**
   * Stocke un lot de messages archivés
   */
  async storeMessages(messages: LocalArchivedMessage[]): Promise<number> {
    const db = await this.dbPromise;
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_MESSAGES, STORE_META], 'readwrite');
      const msgStore = tx.objectStore(STORE_MESSAGES);
      let stored = 0;

      for (const msg of messages) {
        const request = msgStore.put(msg);
        request.onsuccess = () => stored++;
      }

      tx.oncomplete = async () => {
        // Mettre à jour les métadonnées par conversation
        const convIds = [...new Set(messages.map(m => m.conversationId))];
        for (const convId of convIds) {
          await this.updateMeta(convId);
        }
        resolve(stored);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Récupère un message archivé par ID
   */
  async getMessage(messageId: string): Promise<LocalArchivedMessage | null> {
    const db = await this.dbPromise;
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MESSAGES, 'readonly');
      const store = tx.objectStore(STORE_MESSAGES);
      const request = store.get(messageId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère les messages archivés d'une conversation
   * Triés par date de création (ASC)
   */
  async getMessagesByConversation(
    conversationId: string,
    options?: {
      limit?: number;
      before?: string; // ISO date string
      after?: string;  // ISO date string
    }
  ): Promise<LocalArchivedMessage[]> {
    const db = await this.dbPromise;
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MESSAGES, 'readonly');
      const store = tx.objectStore(STORE_MESSAGES);
      const index = store.index('conversationId');
      const request = index.getAll(conversationId);

      request.onsuccess = () => {
        let messages = request.result as LocalArchivedMessage[];

        // Filtrer par date
        if (options?.before) {
          messages = messages.filter(m => m.createdAt < options.before!);
        }
        if (options?.after) {
          messages = messages.filter(m => m.createdAt > options.after!);
        }

        // Trier par date ASC
        messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // Limiter
        if (options?.limit) {
          messages = messages.slice(-options.limit);
        }

        resolve(messages);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cherche un message par ID parmi les archives locales
   */
  async hasMessage(messageId: string): Promise<boolean> {
    const msg = await this.getMessage(messageId);
    return msg !== null;
  }

  /**
   * Compte les messages archivés par conversation
   */
  async getMessageCount(conversationId: string): Promise<number> {
    const db = await this.dbPromise;
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MESSAGES, 'readonly');
      const store = tx.objectStore(STORE_MESSAGES);
      const index = store.index('conversationId');
      const request = index.count(conversationId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Compte total des messages archivés
   */
  async getTotalCount(): Promise<number> {
    const db = await this.dbPromise;
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MESSAGES, 'readonly');
      const store = tx.objectStore(STORE_MESSAGES);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================================
  // MÉTADONNÉES
  // ============================================================

  /**
   * Met à jour les métadonnées d'une conversation
   */
  private async updateMeta(conversationId: string): Promise<void> {
    const db = await this.dbPromise;
    const messages = await this.getMessagesByConversation(conversationId);

    if (messages.length === 0) return;

    const meta: ArchiveMeta = {
      conversationId,
      messageCount: messages.length,
      oldestMessageAt: messages[0].createdAt,
      newestMessageAt: messages[messages.length - 1].createdAt,
      lastSyncAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readwrite');
      const store = tx.objectStore(STORE_META);
      store.put(meta);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Récupère les métadonnées d'une conversation
   */
  async getMeta(conversationId: string): Promise<ArchiveMeta | null> {
    const db = await this.dbPromise;
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly');
      const store = tx.objectStore(STORE_META);
      const request = store.get(conversationId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère les métadonnées de toutes les conversations archivées
   */
  async getAllMeta(): Promise<ArchiveMeta[]> {
    const db = await this.dbPromise;
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly');
      const store = tx.objectStore(STORE_META);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================================
  // NETTOYAGE
  // ============================================================

  /**
   * Supprime tous les messages archivés d'une conversation
   */
  async clearConversation(conversationId: string): Promise<void> {
    const db = await this.dbPromise;
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_MESSAGES, STORE_META], 'readwrite');
      const msgStore = tx.objectStore(STORE_MESSAGES);
      const metaStore = tx.objectStore(STORE_META);
      const index = msgStore.index('conversationId');
      
      // Supprimer les messages
      const request = index.openCursor(conversationId);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Supprimer les métadonnées
      metaStore.delete(conversationId);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Supprime toute la base locale (RGPD / déconnexion)
   */
  async clearAll(): Promise<void> {
    const db = await this.dbPromise;
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_MESSAGES, STORE_META], 'readwrite');
      tx.objectStore(STORE_MESSAGES).clear();
      tx.objectStore(STORE_META).clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Exporte tous les messages archivés (RGPD)
   */
  async exportAll(): Promise<LocalArchivedMessage[]> {
    const db = await this.dbPromise;
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MESSAGES, 'readonly');
      const store = tx.objectStore(STORE_MESSAGES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Estime la taille du stockage local en octets
   */
  async estimateStorageSize(): Promise<number> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    // Fallback: compter les messages × taille moyenne
    const total = await this.getTotalCount();
    return total * 500; // ~500 bytes par message en moyenne
  }
}

// Singleton
let dmLocalStoreInstance: DMLocalStore | null = null;

export function getDMLocalStore(): DMLocalStore {
  if (!dmLocalStoreInstance) {
    dmLocalStoreInstance = new DMLocalStore();
  }
  return dmLocalStoreInstance;
}
