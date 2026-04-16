/**
 * friends-store.ts
 * Cache module-level pour la liste d'amis, demandes et bloqués.
 * Persiste entre les navigations Next.js App Router.
 */

export interface CachedFriend {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: 'online' | 'idle' | 'dnd' | 'invisible' | 'offline';
  customStatus?: string | null;
  isOnline: boolean;
}

export interface CachedFriendRequest {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  message?: string;
}

export interface CachedBlockedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

type Listener = () => void;

let _friends: CachedFriend[] = [];
let _requests: { received: CachedFriendRequest[]; sent: CachedFriendRequest[] } = { received: [], sent: [] };
let _blocked: CachedBlockedUser[] = [];
let _loaded = false;
const _listeners = new Set<Listener>();

function _notify(): void {
  _listeners.forEach((l) => l());
}

export const friendsStore = {
  // ── Lecture ──────────────────────────────────────────────────────────────
  getFriends(): CachedFriend[] { return _friends; },
  getRequests() { return _requests; },
  getBlocked(): CachedBlockedUser[] { return _blocked; },
  isLoaded(): boolean { return _loaded; },

  // ── Écriture initiale ────────────────────────────────────────────────────
  setFriends(list: CachedFriend[]): void {
    _friends = list;
    _loaded = true;
    _notify();
  },
  setRequests(r: { received: CachedFriendRequest[]; sent: CachedFriendRequest[] }): void {
    _requests = r;
    _notify();
  },
  setBlocked(list: CachedBlockedUser[]): void {
    _blocked = list;
    _notify();
  },

  // ── Mises à jour incrémentales (WebSocket) ───────────────────────────────
  updateFriendPresence(userId: string, status: string, customStatus?: string | null): void {
    _friends = _friends.map((f) =>
      f.id === userId
        ? { ...f, status: status as CachedFriend['status'], customStatus: customStatus ?? f.customStatus, isOnline: status !== 'offline' && status !== 'invisible' }
        : f,
    );
    _notify();
  },
  updateFriendProfile(userId: string, updates: Partial<Pick<CachedFriend, 'displayName' | 'avatarUrl'>>): void {
    _friends = _friends.map((f) => (f.id === userId ? { ...f, ...updates } : f));
    _notify();
  },
  removeFriend(friendId: string): void {
    _friends = _friends.filter((f) => f.id !== friendId);
    _notify();
  },

  // ── Invalide (déconnexion) ────────────────────────────────────────────────
  invalidate(): void {
    _friends = [];
    _requests = { received: [], sent: [] };
    _blocked = [];
    _loaded = false;
    _notify();
  },

  // ── Abonnement ────────────────────────────────────────────────────────────
  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
