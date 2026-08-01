// ==========================================
// ALFYCHAT - CACHE DE PREFETCH DM
// Messages bruts et infos utilisateurs pré-chargés au démarrage
// ==========================================

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const USER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
// Messages : ciphertext uniquement (Signal) → sans risque à persister le temps d'une journée.
const MESSAGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 jour
const MESSAGE_CACHE_STORAGE_KEY = 'alfychat_dm_message_cache_v1';

interface MessageCacheEntry {
  messages: any[];
  fetchedAt: number;
}

interface ConversationsCacheEntry {
  conversations: any[];
  fetchedAt: number;
}

export interface CachedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  status?: string;
  customStatus?: string | null;
}

interface UserCacheEntry {
  user: CachedUser;
  fetchedAt: number;
}

class DMPrefetchCache {
  private messageCache = new Map<string, MessageCacheEntry>();
  private conversationsCache: ConversationsCacheEntry | null = null;
  private userCache = new Map<string, UserCacheEntry>();

  constructor() {
    this.hydrateMessagesFromStorage();
  }

  // ── Persistance (localStorage) ──────────────────────────────────────────────
  // Ne contient que du ciphertext Signal (e2eeType intact) : sûr à garder 1 jour
  // sur le disque, le déchiffrement reste entièrement côté client à la lecture.

  private hydrateMessagesFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(MESSAGE_CACHE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, MessageCacheEntry>;
      const now = Date.now();
      for (const [key, entry] of Object.entries(parsed)) {
        if (entry && now - entry.fetchedAt <= MESSAGE_CACHE_TTL_MS) {
          this.messageCache.set(key, entry);
        }
      }
    } catch {
      // Cache corrompu ou indisponible (navigation privée…) — on repart à vide.
    }
  }

  private persistMessagesToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const obj = Object.fromEntries(this.messageCache);
      window.localStorage.setItem(MESSAGE_CACHE_STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Quota localStorage dépassé ou navigation privée — cache mémoire seule.
    }
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  setMessages(key: string, messages: any[]): void {
    this.messageCache.set(key, { messages, fetchedAt: Date.now() });
    this.persistMessagesToStorage();
  }

  getMessages(key: string): any[] | null {
    const entry = this.messageCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > MESSAGE_CACHE_TTL_MS) {
      this.messageCache.delete(key);
      this.persistMessagesToStorage();
      return null;
    }
    return entry.messages;
  }

  invalidateMessages(key: string): void {
    this.messageCache.delete(key);
    this.persistMessagesToStorage();
  }

  // ── Utilisateurs ──────────────────────────────────────────────────────────

  setUser(userId: string, user: CachedUser): void {
    this.userCache.set(userId, { user, fetchedAt: Date.now() });
  }

  getUser(userId: string): CachedUser | null {
    const entry = this.userCache.get(userId);
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > USER_CACHE_TTL_MS) {
      this.userCache.delete(userId);
      return null;
    }
    return entry.user;
  }

  // ── Conversations ─────────────────────────────────────────────────────────

  setConversations(conversations: any[]): void {
    this.conversationsCache = { conversations, fetchedAt: Date.now() };
  }

  getConversations(): any[] | null {
    if (!this.conversationsCache) return null;
    if (Date.now() - this.conversationsCache.fetchedAt > CACHE_TTL_MS) {
      this.conversationsCache = null;
      return null;
    }
    return this.conversationsCache.conversations;
  }

  invalidateConversations(): void {
    this.conversationsCache = null;
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  clear(): void {
    this.messageCache.clear();
    this.conversationsCache = null;
    this.userCache.clear();
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(MESSAGE_CACHE_STORAGE_KEY); } catch { /* ignore */ }
    }
  }
}

export const dmPrefetchCache = new DMPrefetchCache();
