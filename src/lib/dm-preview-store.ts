// ==========================================
// ALFYCHAT — Aperçus déchiffrés de la liste de MP
// ==========================================
// La barre latérale affichait « Message chiffré » sur chaque conversation :
// le dernier message arrive en ciphertext et rien ne le déchiffrait côté liste.
//
// ── Pourquoi c'est sûr ────────────────────────────────────────────────────
// On ne déchiffre QUE les formats sans état :
//   `ecdh:` — la clé éphémère de l'expéditeur est dans le message, on dérive le
//             secret à chaque fois ; déchiffrer deux fois donne le même
//             résultat, sans effet de bord ;
//   `aes:`  — copie expéditeur chiffrée avec une clé locale stockée.
//
// Le format Signal Double Ratchet historique est volontairement EXCLU : chaque
// déchiffrement y consomme un pas de ratchet. Déchiffrer un aperçu ici aurait
// rendu le message illisible à l'ouverture de la conversation — une perte de
// données irréversible. Ces messages-là gardent « Message chiffré ».
//
// ── Pourquoi le cache est en mémoire seule ────────────────────────────────
// `dm-prefetch-cache.ts` persiste des messages sur disque et précise pourquoi
// c'est acceptable : « ciphertext uniquement ». Un aperçu déchiffré, lui, est
// du texte en clair. L'écrire dans localStorage reviendrait à poser le contenu
// des conversations chiffrées de bout en bout en clair sur la machine. Le
// cache vit donc le temps de l'onglet ; au rechargement on redéchiffre, ce qui
// coûte un ECDH + un AES-GCM par conversation.

import { signalService } from '@/lib/signal-service';

/** Nombre de conversations déchiffrées simultanément. */
const TAILLE_LOT = 10;

export interface PreviewSource {
  /** Identifiant du message — sert de clé de cache. */
  messageId: string;
  senderId: string;
  /** Ciphertext destiné au destinataire. */
  content: string | null;
  /** Ciphertext destiné à l'expéditeur (relecture de ses propres messages). */
  senderContent: string | null;
  e2eeType: number | null;
}

const cache = new Map<string, string>();
/** Messages dont le déchiffrement a échoué — on n'y revient pas à chaque rendu. */
const echecs = new Set<string>();
const enCours = new Set<string>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function subscribePreviews(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPreview(messageId: string | null | undefined): string | null {
  if (!messageId) return null;
  return cache.get(messageId) ?? null;
}

/** Formats déchiffrables sans consommer d'état cryptographique. */
function estDechiffrableSansEtat(payload: string | null): boolean {
  return !!payload && (payload.startsWith('ecdh:') || payload.startsWith('aes:'));
}

/**
 * La copie à déchiffrer dépend du sens du message : celle de l'expéditeur si
 * c'est nous qui avons écrit, celle du destinataire sinon.
 */
function copiePertinente(source: PreviewSource, currentUserId: string): string | null {
  return source.senderId === currentUserId ? source.senderContent : source.content;
}

/** Ce message peut-il donner un aperçu, et faut-il encore le calculer ? */
function aTraiter(source: PreviewSource, currentUserId: string): boolean {
  if (!source.messageId) return false;
  if (cache.has(source.messageId) || echecs.has(source.messageId) || enCours.has(source.messageId)) {
    return false;
  }
  return estDechiffrableSansEtat(copiePertinente(source, currentUserId));
}

async function dechiffrerUn(source: PreviewSource, currentUserId: string): Promise<void> {
  enCours.add(source.messageId);
  try {
    const clair = await signalService.decrypt(
      source.senderId,
      currentUserId,
      source.content ?? '',
      source.senderContent ?? undefined,
      (source.e2eeType === 3 ? 3 : 1),
    );
    // `signalService.decrypt` renvoie un texte de repli entre crochets quand la
    // clé manque : ce n'est pas un aperçu utile, autant garder le libellé.
    if (clair && !clair.startsWith('[Message')) {
      cache.set(source.messageId, clair);
    } else {
      echecs.add(source.messageId);
    }
  } catch {
    echecs.add(source.messageId);
  } finally {
    enCours.delete(source.messageId);
  }
}

/**
 * Déchiffre les aperçus manquants, par lots de 10.
 *
 * Le lot est traité en parallèle puis on rend la main au navigateur avant le
 * suivant : sur une liste de 60 conversations, tout déchiffrer d'un coup
 * bloquerait le fil principal pendant que l'utilisateur essaie de faire défiler.
 * Chaque lot terminé notifie les abonnés, donc la liste se remplit
 * progressivement au lieu d'attendre la fin.
 */
export async function ensurePreviews(
  sources: PreviewSource[],
  currentUserId: string,
): Promise<void> {
  if (!currentUserId) return;
  const aFaire = sources.filter((s) => aTraiter(s, currentUserId));
  if (aFaire.length === 0) return;

  for (let i = 0; i < aFaire.length; i += TAILLE_LOT) {
    const lot = aFaire.slice(i, i + TAILLE_LOT);
    await Promise.all(lot.map((s) => dechiffrerUn(s, currentUserId)));
    emit();
    // Laisser respirer le fil principal entre deux lots.
    if (i + TAILLE_LOT < aFaire.length) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
}

/** Purge — déconnexion, ou changement de compte sur le même navigateur. */
export function clearPreviews(): void {
  cache.clear();
  echecs.clear();
  enCours.clear();
  emit();
}
