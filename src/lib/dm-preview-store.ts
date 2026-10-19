// ==========================================
// ALFYCHAT — Aperçus déchiffrés de la liste de MP et de groupes
// ==========================================
// Le dernier message de chaque conversation arrive chiffré. Les aperçus sont
// déchiffrés en tâche de fond, par lots, puis gardés :
//   - en mémoire pour la session ;
//   - dans le coffre local (`lib/e2ee/vault.ts`), CHIFFRÉ au repos avec une clé
//     non extractible : au rechargement, la liste est lisible sans refaire
//     d'ECDH, et rien n'est jamais écrit en clair sur le disque.
//
// ── Règle de sécurité inchangée ───────────────────────────────────────────
// On ne déchiffre ici QUE les formats sans état (`e2e1:`, `ecdh:`, `aes:`).
// L'ancien Signal Double Ratchet ne se lit qu'une fois : le déchiffrer hors du
// fil le rendrait illisible à l'ouverture (perte irréversible). Ces messages
// gardent « Message chiffré » tant que le fil ne les a pas lus — après quoi le
// coffre les connaît, et l'aperçu devient lisible lui aussi.

import { resolveMessages } from '@/lib/e2ee/codec';

/** Nombre de conversations déchiffrées simultanément. */
const TAILLE_LOT = 10;

export interface PreviewSource {
  /** Identifiant du message — sert de clé de cache. */
  messageId: string;
  /** Conversation du message (données associées de l'enveloppe de groupe). */
  conversationId: string;
  senderId: string;
  /** Ciphertext destiné au destinataire (ou enveloppe de groupe). */
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

/** Texte déjà connu (message qu'on vient de déchiffrer ou d'envoyer). */
export function setPreviewText(messageId: string, text: string): void {
  if (!messageId || !text || cache.get(messageId) === text) return;
  cache.set(messageId, text);
  echecs.delete(messageId);
  emit();
}

/** Formats déchiffrables sans consommer d'état cryptographique. */
function estDechiffrableSansEtat(payload: string | null): boolean {
  return !!payload && (payload.startsWith('e2e1:') || payload.startsWith('ecdh:') || payload.startsWith('aes:'));
}

/** La copie pertinente : celle de l'expéditeur si c'est nous, sinon la nôtre (ou l'enveloppe). */
function copiePertinente(source: PreviewSource, currentUserId: string): string | null {
  if (source.content?.startsWith('e2e1:')) return source.content;
  return source.senderId === currentUserId ? source.senderContent : source.content;
}

function aTraiter(source: PreviewSource): boolean {
  return Boolean(source.messageId) && !cache.has(source.messageId) && !echecs.has(source.messageId) && !enCours.has(source.messageId);
}

async function dechiffrerLot(lot: PreviewSource[], currentUserId: string): Promise<void> {
  for (const s of lot) enCours.add(s.messageId);
  try {
    // Par conversation : l'enveloppe de groupe est liée à son identifiant.
    await Promise.all(
      lot.map(async (s) => {
        const ratchet = !estDechiffrableSansEtat(copiePertinente(s, currentUserId));
        const out = await resolveMessages(
          [{ id: s.messageId, senderId: s.senderId, content: s.content, senderContent: s.senderContent, e2eeType: s.e2eeType }],
          // allowRatchet: false — même sans copie sans état, le coffre peut connaître ce message.
          { me: currentUserId, conversationId: s.conversationId, allowRatchet: false },
        );
        const d = out.get(s.messageId);
        if (d && d.crypto !== 'locked' && d.content) cache.set(s.messageId, d.content);
        else if (!ratchet) echecs.add(s.messageId);
      }),
    );
  } catch {
    /* lot suivant */
  } finally {
    for (const s of lot) enCours.delete(s.messageId);
  }
}

/**
 * Déchiffre les aperçus manquants, par lots de 10, en rendant la main au
 * navigateur entre deux lots ; chaque lot terminé repeint la liste.
 */
export async function ensurePreviews(sources: PreviewSource[], currentUserId: string): Promise<void> {
  if (!currentUserId) return;
  const aFaire = sources.filter(aTraiter);
  if (aFaire.length === 0) return;
  for (let i = 0; i < aFaire.length; i += TAILLE_LOT) {
    await dechiffrerLot(aFaire.slice(i, i + TAILLE_LOT), currentUserId);
    emit();
    if (i + TAILLE_LOT < aFaire.length) await new Promise((r) => setTimeout(r, 0));
  }
}

/** Purge — déconnexion, ou changement de compte sur le même navigateur. */
export function clearPreviews(): void {
  cache.clear();
  echecs.clear();
  enCours.clear();
  emit();
}
