/**
 * conversations-store.ts
 * Cache module-level (singleton hors React) pour la liste des conversations DM/Groupes.
 * Persiste entre les navigations Next.js App Router, évitant un re-fetch coûteux
 * (N appels api.getUser) à chaque changement de page.
 * Les mises à jour viennent du WebSocket.
 */

export interface CachedConversation {
  id: string;
  type: 'dm' | 'group';
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  participants?: string[];
}

type Listener = () => void;

let _conversations: CachedConversation[] = [];
let _presenceMap: Map<string, string> = new Map();
let _customStatusMap: Map<string, string | null> = new Map();
let _loaded = false;
const _listeners = new Set<Listener>();

function _notify(): void {
  _listeners.forEach((l) => l());
}

export const conversationsStore = {
  // ── Lecture ──────────────────────────────────────────────────────────────
  get(): CachedConversation[] { return _conversations; },
  getPresence(): Map<string, string> { return _presenceMap; },
  getCustomStatus(): Map<string, string | null> { return _customStatusMap; },
  isLoaded(): boolean { return _loaded; },

  // ── Écriture initiale (depuis loadConversations) ─────────────────────────
  set(
    list: CachedConversation[],
    presence: Map<string, string>,
    customStatus: Map<string, string | null>,
  ): void {
    _conversations = list;
    _presenceMap = new Map(presence);
    _customStatusMap = new Map(customStatus);
    _loaded = true;
    _notify();
  },

  // ── Mise à jour d'une conversation (lastMessage, lastMessageAt) ──────────
  updateLastMessage(id: string, lastMessage: string, lastMessageAt: string): void {
    const idx = _conversations.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const updated = { ..._conversations[idx], lastMessage, lastMessageAt };
    // Remonter en tête de liste (ordre anti-chronologique)
    _conversations = [updated, ..._conversations.filter((c) => c.id !== id)];
    _notify();
  },

  // ── Ajouter ou déplacer en tête une nouvelle conversation ────────────────
  addOrMoveToTop(conv: CachedConversation): void {
    _conversations = [conv, ..._conversations.filter((c) => c.id !== conv.id)];
    _notify();
  },

  // ── Mettre à jour la présence d'un utilisateur ───────────────────────────
  setPresence(userId: string, status: string, customStatus?: string | null): void {
    _presenceMap = new Map(_presenceMap).set(userId, status);
    if (customStatus !== undefined) {
      _customStatusMap = new Map(_customStatusMap).set(userId, customStatus);
    }
    _notify();
  },

  // ── Supprimer une conversation ───────────────────────────────────────────
  remove(id: string): void {
    _conversations = _conversations.filter((c) => c.id !== id);
    _notify();
  },

  // ── Invalide le cache (déconnexion, changement de compte) ────────────────
  invalidate(): void {
    _conversations = [];
    _presenceMap = new Map();
    _customStatusMap = new Map();
    _loaded = false;
    _notify();
  },

  // ── Abonnement (pour useSyncExternalStore) ───────────────────────────────
  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
  getSnapshot(): CachedConversation[] { return _conversations; },
  getServerSnapshot(): CachedConversation[] { return []; },
};
