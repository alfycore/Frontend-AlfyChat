'use client';

/**
 * Conversations épinglées.
 *
 * Aucune API serveur n'expose de favoris : c'est une préférence locale,
 * persistée en localStorage et partagée entre composants via un petit
 * store abonnable (même approche que la sidebar repliée d'atelier).
 */

import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'alfychat_pinned_conversations';

let pinned: string[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function persist(next: string[]) {
  pinned = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / mode privé : on garde l'état en mémoire */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  if (!loaded) {
    pinned = read();
    loaded = true;
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = (): string[] => {
  if (!loaded) {
    pinned = read();
    loaded = true;
  }
  return pinned;
};

/** Rendu serveur : jamais d'épinglés (pas de localStorage). */
const EMPTY: string[] = [];
const getServerSnapshot = (): string[] => EMPTY;

export function usePinnedConversations(): {
  pinnedIds: string[];
  isPinned: (id: string) => boolean;
  togglePin: (id: string) => void;
} {
  const pinnedIds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const togglePin = useCallback((id: string) => {
    const current = getSnapshot();
    persist(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }, []);

  const isPinned = useCallback((id: string) => pinnedIds.includes(id), [pinnedIds]);

  return { pinnedIds, isPinned, togglePin };
}
