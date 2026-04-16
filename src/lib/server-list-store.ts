/**
 * server-list-store.ts
 * Cache module-level (singleton hors React) pour la liste des serveurs.
 * Persiste entre les navigations Next.js App Router, évitant un re-fetch
 * à chaque changement de page. Les mises à jour viennent du WebSocket.
 */

export interface CachedServer {
  id: string;
  name: string;
  iconUrl?: string;
  ownerId?: string;
}

type Listener = () => void;

let _servers: CachedServer[] = [];
let _loaded = false;
const _listeners = new Set<Listener>();

function _notify(): void {
  _listeners.forEach((l) => l());
}

export const serverListStore = {
  // ── Lecture ─────────────────────────────────────────────────────────────
  get(): CachedServer[] { return _servers; },
  isLoaded(): boolean { return _loaded; },

  // ── Écriture (depuis loadServers) ────────────────────────────────────────
  set(list: CachedServer[]): void {
    _servers = list;
    _loaded = true;
    _notify();
  },

  // ── Mises à jour incrémentales (depuis WebSocket) ────────────────────────
  add(server: CachedServer): void {
    if (_servers.find((s) => s.id === server.id)) return;
    _servers = [..._servers, server];
    _notify();
  },

  update(id: string, updates: Partial<Omit<CachedServer, 'id'>>): void {
    _servers = _servers.map((s) => (s.id === id ? { ...s, ...updates } : s));
    _notify();
  },

  remove(id: string): void {
    _servers = _servers.filter((s) => s.id !== id);
    _notify();
  },

  // ── Invalide le cache (déconnexion, changement de compte) ───────────────
  invalidate(): void {
    _servers = [];
    _loaded = false;
    _notify();
  },

  // ── Abonnement (pour useSyncExternalStore) ───────────────────────────────
  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
  getSnapshot(): CachedServer[] { return _servers; },
  getServerSnapshot(): CachedServer[] { return []; },
};
