/**
 * live-cache.ts
 * Cache mémoire des données live d'un serveur : salons, fiche serveur, membres,
 * rôles, historique de messages.
 *
 * `useAlfyChannels`, `useAlfyMembers` et `useAlfyServerMessages` repartaient
 * d'un état vide à chaque montage : revenir sur un salon déjà ouvert rejouait
 * un aller-retour WebSocket complet, spinner compris, pour réafficher
 * exactement ce qu'on venait de quitter. Ces hooks amorcent désormais leur état
 * depuis ce cache, puis rafraîchissent en arrière-plan.
 *
 * **En mémoire uniquement, et volontairement.** Ces données changent en
 * permanence via le WebSocket ; les persister ferait rouvrir l'application sur
 * un état périmé sans moyen de le dater. L'objectif est plus modeste : ne pas
 * repasser par un écran de chargement pour du contenu déjà connu *dans la
 * session courante*.
 *
 * Le cache est borné (LRU) : sans plafond, parcourir cent salons garderait cent
 * historiques de messages en mémoire jusqu'à la fermeture de l'onglet.
 */

/** Au-delà, l'entrée la moins récemment lue est évincée. */
const MAX_ENTRIES = 60;

const store = new Map<string, unknown>();

export function readLive<T>(key: string | null): T | undefined {
  if (!key || !store.has(key)) return undefined;
  const value = store.get(key) as T;
  // Réinsertion : lire une clé la remet en tête de la file LRU.
  store.delete(key);
  store.set(key, value);
  return value;
}

export function writeLive<T>(key: string | null, value: T): void {
  if (!key) return;
  store.delete(key);
  store.set(key, value);
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

/**
 * Vidage complet — déconnexion ou changement de compte. Sans ça, le compte
 * suivant ouvert dans le même onglet hériterait des salons et messages du
 * précédent (même raison que `dmPrefetchCache.clear()`).
 */
export function clearLiveCache(): void {
  store.clear();
}

/** Clés du cache. `null` en entrée ⇒ `null` en sortie : lecture et écriture deviennent des non-opérations. */
export const liveKey = {
  channels: (serverId: string | null) => (serverId ? `channels:${serverId}` : null),
  serverInfo: (serverId: string | null) => (serverId ? `info:${serverId}` : null),
  members: (serverId: string | null) => (serverId ? `members:${serverId}` : null),
  roles: (serverId: string | null) => (serverId ? `roles:${serverId}` : null),
  messages: (channelId: string | null) => (channelId ? `messages:${channelId}` : null),
};
