// ==========================================
// ALFYCHAT — Amorçage d'une conversation privée
// ==========================================
// Ouvrir un MP déclenchait cinq requêtes séparées, dont deux fois le MÊME
// profil (une depuis la page, une depuis `AlfyDmChat`) :
//   getUser × 2, getBlockStatus, getSignalKeyBundle, getMessages.
//
// `/api/bootstrap/dm/:id` les assemble côté serveur. Ce module partage le
// résultat entre la page et les composants, et mutualise la requête en vol :
// deux consommateurs montés en même temps n'en déclenchent qu'une.

import { api } from '@/lib/api';

export interface DmBootstrap {
  recipient: Record<string, unknown> | null;
  blockStatus: { iBlockedThem: boolean; theyBlockedMe: boolean };
  keyBundle: Record<string, unknown> | null;
  messages: Record<string, unknown>[];
  fetchedAt: number;
}

/** Court : à la réouverture d'un fil on veut des messages frais. */
const TTL_MS = 15_000;

const cache = new Map<string, DmBootstrap>();
const inFlight = new Map<string, Promise<DmBootstrap | null>>();

function fresh(recipientId: string): DmBootstrap | null {
  const entry = cache.get(recipientId);
  if (!entry) return null;
  return Date.now() - entry.fetchedAt < TTL_MS ? entry : null;
}

export function getDmBootstrap(recipientId: string): DmBootstrap | null {
  return fresh(recipientId);
}

export function loadDmBootstrap(recipientId: string, force = false): Promise<DmBootstrap | null> {
  if (!recipientId) return Promise.resolve(null);
  if (!force) {
    const hit = fresh(recipientId);
    if (hit) return Promise.resolve(hit);
  }

  const pending = inFlight.get(recipientId);
  if (pending) return pending;

  const request = api
    .get<DmBootstrap>(`/api/bootstrap/dm/${recipientId}`)
    .then((res) => {
      const payload = (res as { data?: DmBootstrap })?.data ?? null;
      if (!payload) return null;
      const entry: DmBootstrap = {
        recipient: payload.recipient ?? null,
        blockStatus: payload.blockStatus ?? { iBlockedThem: false, theyBlockedMe: false },
        keyBundle: payload.keyBundle ?? null,
        messages: Array.isArray(payload.messages) ? payload.messages : [],
        fetchedAt: payload.fetchedAt || Date.now(),
      };
      cache.set(recipientId, entry);
      return entry;
    })
    .catch(() => null)
    .finally(() => {
      inFlight.delete(recipientId);
    });

  inFlight.set(recipientId, request);
  return request;
}

/** Après un envoi ou une suppression : la page suivante doit repartir du serveur. */
export function invalidateDmBootstrap(recipientId: string): void {
  cache.delete(recipientId);
}
