// ==========================================
// ALFYCHAT — Amorçage en une requête
// ==========================================
// Les hooks de la coquille (`useAlfyDms`, `useAlfyFriends`, le préchargement du
// shell…) déclenchaient chacun leurs propres appels : trois `getConversations`
// concurrents, puis un `getUser` par conversation privée. Résultat, une
// quarantaine de requêtes avant le premier rendu utile.
//
// Ce module fait UN appel `/api/bootstrap/me`, dont le résultat est partagé par
// tous les consommateurs. Les hooks lisent ici en premier et ne retombent sur
// leurs appels individuels que si l'amorçage échoue.

import { api } from '@/lib/api';

export interface BootstrapConversation {
  id: string;
  type: 'dm' | 'group' | string;
  name?: string;
  avatarUrl?: string;
  ownerId?: string;
  recipientId?: string;
  /** Rempli côté gateway depuis `participants[]` — plus de `getUser` par conversation. */
  recipientName?: string;
  recipientAvatar?: string;
  recipientUsername?: string;
  recipientOnline?: boolean;
  participantIds?: string[];
  participants?: Array<{
    userId?: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    isOnline?: boolean;
  }>;
  lastMessage?: string;
  lastMessageAt?: string;
  updatedAt?: string;
  [k: string]: unknown;
}

export interface BootstrapData {
  user: Record<string, unknown> | null;
  servers: Record<string, unknown>[];
  conversations: BootstrapConversation[];
  friends: Record<string, unknown>[];
  friendRequests: { received?: unknown[]; sent?: unknown[] } | Record<string, unknown>;
  blocked: Record<string, unknown>[];
  notifications: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
  preferences: Record<string, unknown>;
  fetchedAt: number;
}

/** Au-delà, l'amorçage est considéré périmé et sera rechargé au prochain besoin. */
const TTL_MS = 60_000;

let data: BootstrapData | null = null;
let inFlight: Promise<BootstrapData | null> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function isFresh(): boolean {
  return !!data && Date.now() - data.fetchedAt < TTL_MS;
}

/**
 * Charge l'amorçage. Les appels concurrents partagent la même requête en vol :
 * c'est ce qui évite que trois hooks montés en même temps en déclenchent trois.
 */
export function loadBootstrap(force = false): Promise<BootstrapData | null> {
  if (!force && isFresh()) return Promise.resolve(data);
  if (inFlight) return inFlight;

  inFlight = api
    .get<BootstrapData>('/api/bootstrap/me')
    .then((res) => {
      const payload = (res as { success?: boolean; data?: BootstrapData })?.data ?? null;
      if (payload && Array.isArray(payload.conversations)) {
        data = { ...payload, fetchedAt: payload.fetchedAt || Date.now() };
        emit();
        return data;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Données déjà chargées, ou `null`. Ne déclenche aucune requête. */
export function getBootstrap(): BootstrapData | null {
  return isFresh() ? data : null;
}

/** Vide le cache — à la déconnexion, ou après une action qui invalide tout. */
export function clearBootstrap(): void {
  data = null;
  emit();
}

/**
 * Met à jour la liste de conversations en place.
 * Utilisé quand le socket signale une nouvelle conversation : inutile de
 * refaire tout l'amorçage pour une seule ligne.
 */
export function patchBootstrapConversations(
  update: (current: BootstrapConversation[]) => BootstrapConversation[],
): void {
  if (!data) return;
  data = { ...data, conversations: update(data.conversations) };
  emit();
}

export function subscribeBootstrap(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
