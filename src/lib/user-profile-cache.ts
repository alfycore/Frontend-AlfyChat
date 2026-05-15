/**
 * user-profile-cache.ts
 * Cache module-level pour les profils utilisateurs affichés dans les messages.
 * Mis à jour automatiquement via PROFILE_UPDATE WebSocket.
 */

export interface CachedUserProfile {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

type Listener = () => void;

const _profiles = new Map<string, CachedUserProfile>();
const _listeners = new Set<Listener>();
let _version = 0; // incrémenté à chaque mutation pour forcer le re-render

function _notify(): void {
  _version++;
  _listeners.forEach((l) => l());
}

export const userProfileCache = {
  getProfile(userId: string): CachedUserProfile | undefined {
    return _profiles.get(userId);
  },

  setProfile(profile: CachedUserProfile): void {
    _profiles.set(profile.id, profile);
    _notify();
  },

  patchProfile(userId: string, updates: Partial<Omit<CachedUserProfile, 'id'>>): void {
    const existing = _profiles.get(userId);
    if (existing) {
      _profiles.set(userId, { ...existing, ...updates });
    } else {
      _profiles.set(userId, { id: userId, username: '', ...updates });
    }
    _notify();
  },

  // Initialise le cache à partir d'un tableau (ex: liste des membres)
  seedProfiles(profiles: CachedUserProfile[]): void {
    for (const p of profiles) {
      if (!_profiles.has(p.id)) _profiles.set(p.id, p);
    }
    // Pas de _notify() : ne déclenche pas de re-render inutile
  },

  // Pour useSyncExternalStore — retourne une ref stable par version
  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },

  getSnapshot(): number {
    return _version;
  },

  getServerSnapshot(): number {
    return 0;
  },
};
