/**
 * Annuaire des clés ECDH publiques des contacts.
 *
 *  - Lecture PAR LOT (`POST /api/users/keys/ecdh/batch`) et sans effet de bord :
 *    l'ancien chemin (`GET /api/users/keys/:id`) consommait une prékey à usage
 *    unique à chaque appel — ouvrir un groupe de 20 membres en brûlait 20.
 *  - Requêtes en vol mutualisées, cache mémoire de 10 min.
 *  - Confiance au premier usage : la première clé vue d'un contact est gardée
 *    dans le coffre local ; si elle change ensuite, on le signale (nouvel
 *    appareil sans restauration… ou interception). `subscribeKeyChanges`.
 */

import { api } from '@/lib/api';
import { shortHash, utf8 } from '@/lib/e2ee/bytes';
import { vault } from '@/lib/e2ee/vault';

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { key: string | null; at: number }>();
const inflight = new Map<string, Promise<string | null>>();

export interface KeyChange {
  userId: string;
  previous: string;
  current: string;
  at: number;
}
const changeListeners = new Set<(change: KeyChange) => void>();
const changes = new Map<string, KeyChange>();

export function subscribeKeyChanges(listener: (change: KeyChange) => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

/** Dernier changement de clé constaté pour ce contact pendant la session. */
export function keyChangeOf(userId: string): KeyChange | undefined {
  return changes.get(userId);
}

/** Injecte une clé déjà connue (amorçage du fil, réponse serveur…). */
export function seedPublicKey(userId: string, key: string | null | undefined): void {
  if (!userId || !key) return;
  cache.set(userId, { key, at: Date.now() });
  void observe(userId, key);
}

async function observe(userId: string, key: string): Promise<void> {
  if (!vault.ready) return;
  const seen = await vault.trustGet(userId);
  if (!seen) {
    await vault.trustPut({ userId, ecdhKey: key, firstSeenAt: Date.now() });
    return;
  }
  if (seen.ecdhKey === key) return;
  const change: KeyChange = { userId, previous: seen.ecdhKey, current: key, at: Date.now() };
  changes.set(userId, change);
  // La nouvelle clé devient la référence (sans « vérifiée ») : l'alerte vaut une fois.
  await vault.trustPut({ userId, ecdhKey: key, firstSeenAt: Date.now() });
  for (const l of changeListeners) l(change);
}

async function fetchBatch(userIds: string[]): Promise<Record<string, string | null>> {
  const res = await api.getEcdhKeys(userIds);
  if (res.success && res.data?.keys) return res.data.keys;
  // Passerelle pas encore à jour : repli sur le bundle complet, un par un.
  if (res.status === 404) {
    const out: Record<string, string | null> = {};
    await Promise.all(
      userIds.map(async (id) => {
        const r = (await api.getSignalKeyBundle(id)) as { success?: boolean; data?: { ecdhKey?: string } };
        out[id] = r?.success ? (r.data?.ecdhKey ?? null) : null;
      }),
    );
    return out;
  }
  throw new Error(res.error || 'E2EE_KEYS_UNAVAILABLE');
}

/** Clés ECDH publiques de `userIds` (null = le compte n'a pas encore de clé). */
export async function getPublicKeys(userIds: string[], force = false): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const now = Date.now();
  const toFetch: string[] = [];
  const waiting: Promise<void>[] = [];

  for (const id of new Set(userIds)) {
    const hit = cache.get(id);
    if (!force && hit && now - hit.at < TTL_MS) {
      out.set(id, hit.key);
      continue;
    }
    const running = inflight.get(id);
    if (running) {
      waiting.push(running.then((k) => void out.set(id, k)));
      continue;
    }
    toFetch.push(id);
  }

  if (toFetch.length > 0) {
    const batch = fetchBatch(toFetch);
    for (const id of toFetch) {
      const p = batch.then((keys) => keys[id] ?? null).finally(() => inflight.delete(id));
      inflight.set(id, p);
      waiting.push(
        p.then((key) => {
          out.set(id, key);
          cache.set(id, { key, at: Date.now() });
          if (key) void observe(id, key);
        }),
      );
    }
  }

  await Promise.all(waiting);
  return out;
}

export async function getPublicKey(userId: string): Promise<string | null> {
  return (await getPublicKeys([userId])).get(userId) ?? null;
}

export function forgetPublicKeys(): void {
  cache.clear();
  inflight.clear();
  changes.clear();
}

/**
 * Empreinte de sécurité d'une conversation à deux : la même des deux côtés
 * (clés triées). 12 groupes de 5 chiffres, à comparer de vive voix.
 */
export async function safetyNumber(myKey: string, theirKey: string): Promise<string[]> {
  const [a, b] = [myKey, theirKey].sort();
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-512', utf8(`alfy:safety-v1|${a}|${b}`)));
  const groups: string[] = [];
  for (let i = 0; i < 12; i++) {
    const n = ((digest[i * 5] << 24) | (digest[i * 5 + 1] << 16) | (digest[i * 5 + 2] << 8) | digest[i * 5 + 3]) >>> 0;
    groups.push(String(n % 100000).padStart(5, '0'));
  }
  return groups;
}

/** Empreinte courte d'une clé (affichage « clé 3f2a… »). */
export const keyFingerprint = (key: string) => shortHash(key).then((h) => h.slice(0, 8));
