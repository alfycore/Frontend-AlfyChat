/**
 * groups-store.ts
 * Cache module-level pour la liste des groupes de conversation.
 * Persiste entre les navigations Next.js App Router.
 */

export interface CachedGroup {
  id: string;
  name: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  participantCount: number;
}

type Listener = () => void;

let _groups: CachedGroup[] = [];
let _loaded = false;
const _listeners = new Set<Listener>();

function _notify(): void {
  _listeners.forEach((l) => l());
}

export const groupsStore = {
  // ── Lecture ──────────────────────────────────────────────────────────────
  get(): CachedGroup[] { return _groups; },
  isLoaded(): boolean { return _loaded; },

  // ── Écriture initiale ────────────────────────────────────────────────────
  set(list: CachedGroup[]): void {
    _groups = list;
    _loaded = true;
    _notify();
  },

  // ── Mises à jour incrémentales (WebSocket) ───────────────────────────────
  updateLastMessage(id: string, lastMessage: string, lastMessageAt: string): void {
    const idx = _groups.findIndex((g) => g.id === id);
    if (idx === -1) return;
    const updated = { ..._groups[idx], lastMessage, lastMessageAt };
    _groups = [updated, ..._groups.filter((g) => g.id !== id)];
    _notify();
  },

  addOrUpdate(group: CachedGroup): void {
    const existing = _groups.findIndex((g) => g.id === group.id);
    if (existing === -1) {
      _groups = [group, ..._groups];
    } else {
      _groups = _groups.map((g) => (g.id === group.id ? group : g));
    }
    _notify();
  },

  remove(id: string): void {
    _groups = _groups.filter((g) => g.id !== id);
    _notify();
  },

  // ── Invalide (déconnexion) ────────────────────────────────────────────────
  invalidate(): void {
    _groups = [];
    _loaded = false;
    _notify();
  },

  // ── Abonnement ────────────────────────────────────────────────────────────
  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
