/**
 * Cache module-level (hors React) des émoji personnalisés utilisables par
 * l'utilisateur courant — tous ses serveurs, sauf ceux réservés ailleurs.
 * Chargé une fois au démarrage (voir `AlfyChannelsShell`) ; lookup
 * synchrone pour le rendu markdown des messages (`:nom:` → image).
 *
 * Limite connue : le chargement est asynchrone, donc les tout premiers
 * messages affichés avant la fin du chargement peuvent montrer le code
 * `:nom:` en texte brut le temps qu'il se résolve — pas de re-rendu rétroactif
 * une fois le cache rempli (pas d'abonnement réactif ici, volontairement,
 * pour ne pas complexifier le rendu markdown partagé par tout le chat).
 */

import { api, resolveMediaUrl } from '@/lib/api';

let emojiMap = new Map<string, string>();
let loadingPromise: Promise<void> | null = null;

export function getCustomEmojiUrl(name: string): string | undefined {
  return emojiMap.get(name);
}

export function loadCustomEmojis(currentServerId?: string): Promise<void> {
  if (loadingPromise) return loadingPromise;
  loadingPromise = api
    .getAvailableEmojis(currentServerId)
    .then((res) => {
      if (!res.success || !res.data) return;
      const next = new Map<string, string>();
      for (const e of res.data) {
        next.set(e.name, resolveMediaUrl(e.imageUrl) ?? e.imageUrl);
      }
      emojiMap = next;
    })
    .finally(() => {
      loadingPromise = null;
    });
  return loadingPromise;
}
