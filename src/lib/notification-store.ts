/**
 * notification-store.ts
 * Module global (sans React) qui suit :
 * - la conversation actuellement ouverte (activeConversationId / activeRecipientId)
 * - les compteurs de messages non-lus par conversation
 *
 * Ce store est intentionnellement SANS Zustand/Redux pour éviter les
 * imports circulaires. Les composants s'y abonnent via `subscribe`.
 */

type Listener = () => void;

const STORAGE_KEY = 'alfychat_unread';

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
  /** Map<conversationKey, unreadCount> — clé = recipientId ou 'group:groupId' */
  unread: Map<string, number>;
}

const state: NotificationState = {
  activeRecipientId: null,
  activeGroupId: null,
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
  state.activeRecipientId = recipientId;
  state.activeGroupId = null;
  if (recipientId) {
    state.unread.delete(recipientId);
  }
  notify();
}

/**
 * Appeler quand l'utilisateur entre dans un groupe.
 */
export function setActiveGroup(groupId: string | null) {
  state.activeGroupId = groupId;
  state.activeRecipientId = null;
  if (groupId) {
    state.unread.delete(`group:${groupId}`);
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

/** Lire le compteur non-lu pour une conversation. */
export function getUnread(key: string): number {
  return state.unread.get(key) ?? 0;
}

/** Lire tous les compteurs non-lus. */
export function getAllUnread(): ReadonlyMap<string, number> {
  return state.unread;
}

// ── React hook ────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from 'react';

/**
 * Snapshot vide pour le rendu serveur (SSR).
 * Doit être cohérent avec le HTML rendu côté serveur (aucun badge).
 * React hydrate avec ce snapshot puis bascule sur getSnapshot() côté client.
 */
const SERVER_SNAPSHOT: NotificationState = {
  activeRecipientId: null,
  activeGroupId: null,
  unread: new Map(),
};

/**
 * Hook React pour s'abonner au store de notifications.
 * Déclenche un re-render uniquement quand le store change.
 */
export function useNotificationStore() {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}
