// ==========================================
// ALFYCHAT - CACHE DE PREFETCH DM
// Messages bruts et infos utilisateurs pré-chargés au démarrage
// ==========================================

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const USER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

  // ── Messages ──────────────────────────────────────────────────────────────

  setMessages(key: string, messages: any[]): void {
    this.messageCache.set(key, { messages, fetchedAt: Date.now() });
  }

  getMessages(key: string): any[] | null {
    const entry = this.messageCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
      this.messageCache.delete(key);
      return null;
    }
    return entry.messages;
  }

  invalidateMessages(key: string): void {
    this.messageCache.delete(key);
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
  }
}

export const dmPrefetchCache = new DMPrefetchCache();
