/**
 * notification-store.ts
 * Module global (sans React) qui suit :
 * - la conversation actuellement ouverte (activeConversationId / activeRecipientId)
 * - les compteurs de messages non-lus par conversation
 *
 * Ce store est intentionnellement SANS Zustand/Redux pour éviter les
 * imports circulaires. Les composants s'y abonnent via `subscribe`.
 */

import { useSyncExternalStore } from 'react';

type Listener = () => void;

// Namespace storage keys by userId to avoid double-account conflicts
let STORAGE_KEY = 'alfychat_unread';
let LAST_SEEN_KEY = 'alfychat_last_seen';

export function setStorageNamespace(userId: string) {
  STORAGE_KEY = `alfychat_unread_${userId}`;
  LAST_SEEN_KEY = `alfychat_last_seen_${userId}`;
  // Reload state from user-specific localStorage
  state.unread = loadFromStorage();
  notify();
}

function loadFromStorage(): Map<string, number> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, number>;
    return new Map(Object.entries(parsed).map(([k, v]) => [k, Number(v)]));
  } catch {
    return new Map();
  }
}

function loadLastSeenFromStorage(): Map<string, string> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = localStorage.getItem(LAST_SEEN_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, string>;
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

function saveLastSeenToStorage(lastSeen: Map<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, string> = {};
    lastSeen.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

function saveToStorage(unread: Map<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, number> = {};
    unread.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

interface NotificationState {
  /** recipientId du DM actuellement ouvert, ou null */
  activeRecipientId: string | null;
  /** groupId du groupe actuellement ouvert, ou null */
  activeGroupId: string | null;
  /** channelId du salon serveur actuellement ouvert, ou null */
  activeChannelId: string | null;
  /** Map<conversationKey, unreadCount> — clé = recipientId, 'group:groupId' ou 'channel:channelId' */
  unread: Map<string, number>;
}

const state: NotificationState = {
  activeRecipientId: null,
  activeGroupId: null,
  activeChannelId: null,
  unread: loadFromStorage(),
};

const listeners = new Set<Listener>();

// Snapshot mis en cache — ne change de référence que quand notify() est appelé
let cachedSnapshot: NotificationState = { ...state, unread: new Map(state.unread) };

function notify() {
  // Persister dans localStorage avant de notifier les listeners
  saveToStorage(state.unread);
  // Créer un nouveau snapshot stable AVANT d'appeler les listeners
  cachedSnapshot = { ...state, unread: new Map(state.unread) };
  listeners.forEach((l) => l());
}

/** S'abonner aux changements du store (retourne un unsubscribe). */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  // À la première écoute côté client, forcer une synchronisation immédiate
  // pour que React remplace le snapshot SSR (vide) par les données localStorage.
  if (typeof window !== 'undefined' && state.unread.size > 0) {
    Promise.resolve().then(listener);
  }
  return () => listeners.delete(listener);
}

/** Retourner le snapshot mis en cache (référence stable entre deux notify()). */
export function getSnapshot(): NotificationState {
  return cachedSnapshot;
}

// ── Active conversation ───────────────────────────────────────────────────────

/**
 * Appeler quand l'utilisateur entre dans un DM.
 * Efface automatiquement le compteur non-lu pour ce destinataire.
 */
export function setActiveDM(recipientId: string | null) {
  // Marquer l'ancienne conversation comme vue
  if (state.activeRecipientId) markLastSeen(state.activeRecipientId);
  if (state.activeGroupId) markLastSeen(`group:${state.activeGroupId}`);
  if (state.activeChannelId) markLastSeen(`channel:${state.activeChannelId}`);

  state.activeRecipientId = recipientId;
  state.activeGroupId = null;
  state.activeChannelId = null;
  if (recipientId) {
    state.unread.delete(recipientId);
  }
  notify();
}

/**
 * Appeler quand l'utilisateur entre dans un groupe.
 */
export function setActiveGroup(groupId: string | null) {
  // Marquer l'ancienne conversation comme vue
  if (state.activeRecipientId) markLastSeen(state.activeRecipientId);
  if (state.activeGroupId) markLastSeen(`group:${state.activeGroupId}`);
  if (state.activeChannelId) markLastSeen(`channel:${state.activeChannelId}`);

  state.activeGroupId = groupId;
  state.activeRecipientId = null;
  state.activeChannelId = null;
  if (groupId) {
    state.unread.delete(`group:${groupId}`);
  }
  notify();
}

/**
 * Appeler quand l'utilisateur entre dans un salon de serveur.
 * Efface automatiquement le compteur non-lu pour ce salon et décrémente le serveur.
 */
export function setActiveChannel(channelId: string | null, serverId?: string) {
  // Marquer l'ancienne conversation comme vue
  if (state.activeRecipientId) markLastSeen(state.activeRecipientId);
  if (state.activeGroupId) markLastSeen(`group:${state.activeGroupId}`);
  if (state.activeChannelId) markLastSeen(`channel:${state.activeChannelId}`);

  state.activeChannelId = channelId;
  state.activeRecipientId = null;
  state.activeGroupId = null;
  if (channelId) {
    const key = `channel:${channelId}`;
    const count = state.unread.get(key) ?? 0;
    state.unread.delete(key);
    if (serverId && count > 0) {
      const serverKey = `server:${serverId}`;
      const serverCount = state.unread.get(serverKey) ?? 0;
      const newCount = serverCount - count;
      if (newCount <= 0) {
        state.unread.delete(serverKey);
      } else {
        state.unread.set(serverKey, newCount);
      }
    }
  }
  notify();
}

/** Retourner vrai si le DM avec ce recipientId est actuellement ouvert. */
export function isDMActive(recipientId: string): boolean {
  return state.activeRecipientId === recipientId;
}

/** Retourner vrai si ce groupe est actuellement ouvert. */
export function isGroupActive(groupId: string): boolean {
  return state.activeGroupId === groupId;
}

/** Retourner vrai si ce salon de serveur est actuellement ouvert. */
export function isChannelActive(channelId: string): boolean {
  return state.activeChannelId === channelId;
}

/** Calculer le total de non-lus pour un serveur (somme de tous ses channels). */
export function getServerUnreadTotal(channelIds: string[]): number {
  let total = 0;
  for (const chId of channelIds) {
    total += state.unread.get(`channel:${chId}`) ?? 0;
  }
  return total;
}

// ── Unread counts ─────────────────────────────────────────────────────────────

/** Incrémenter le compteur non-lu pour une conversation. */
export function incrementUnread(key: string) {
  const current = state.unread.get(key) ?? 0;
  state.unread.set(key, current + 1);
  notify();
}

/** Remettre à zéro le compteur non-lu pour une conversation. */
export function clearUnread(key: string) {
  if (state.unread.has(key)) {
    state.unread.delete(key);
    notify();
  }
}

/**
 * Remettre à zéro le compteur non-lu d'un salon serveur.
 * Décrémente aussi le compteur du serveur parent (server:{serverId}).
 */
export function clearChannelUnread(channelId: string, serverId?: string) {
  const key = `channel:${channelId}`;
  const count = state.unread.get(key) ?? 0;
  if (count > 0) {
    state.unread.delete(key);
    if (serverId) {
      const serverKey = `server:${serverId}`;
      const serverCount = state.unread.get(serverKey) ?? 0;
      const newCount = serverCount - count;
      if (newCount <= 0) {
        state.unread.delete(serverKey);
      } else {
        state.unread.set(serverKey, newCount);
      }
    }
    notify();
  }
}

/** Lire le compteur non-lu pour une conversation. */
export function getUnread(key: string): number {
  return state.unread.get(key) ?? 0;
}

/** Lire tous les compteurs non-lus. */
export function getAllUnread(): ReadonlyMap<string, number> {
  return state.unread;
}

/**
 * Purger les clés inconnues du store (supprime les notifications fantômes en localStorage).
 * À appeler après loadConversations / loadChannels avec les clés valides connues.
 * Les clés de type "server:xxx" sont toujours conservées (gérées séparément).
 */
export function pruneUnread(knownKeys: string[]) {
  const known = new Set(knownKeys);
  let changed = false;
  state.unread.forEach((_, key) => {
    // Conserver les clés server:xxx et channel:xxx (gérées par le layout serveur)
    if (key.startsWith('server:') || key.startsWith('channel:')) return;
    if (!known.has(key)) {
      state.unread.delete(key);
      changed = true;
    }
  });
  if (changed) notify();
}

// ── Last seen timestamps ──────────────────────────────────────────────────────

const lastSeenMap = loadLastSeenFromStorage();

/**
 * Enregistrer le timestamp actuel comme dernier moment vu pour une conversation.
 * Appelé quand l'utilisateur quitte une conversation ou ferme l'app.
 */
export function markLastSeen(conversationKey: string) {
  lastSeenMap.set(conversationKey, new Date().toISOString());
  saveLastSeenToStorage(lastSeenMap);
}

/**
 * Retourner le timestamp ISO de la dernière visite dans une conversation.
 * Retourne null si la conversation n'a jamais été visitée.
 */
export function getLastSeen(conversationKey: string): string | null {
  return lastSeenMap.get(conversationKey) ?? null;
}

// ── React hook ────────────────────────────────────────────────────────────────

/**
 * Snapshot vide pour le rendu serveur (SSR).
 * Doit être cohérent avec le HTML rendu côté serveur (aucun badge).
 * React hydrate avec ce snapshot puis bascule sur getSnapshot() côté client.
 */
const SERVER_SNAPSHOT: NotificationState = {
  activeRecipientId: null,
  activeGroupId: null,
  activeChannelId: null,
  unread: new Map(),
};

/**
 * Hook React pour s'abonner au store de notifications.
 * Déclenche un re-render uniquement quand le store change.
 */
export function useNotificationStore() {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}
