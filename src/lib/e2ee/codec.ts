/**
 * Chiffrement / déchiffrement des messages privés et de groupe, coffre compris.
 *
 * Formats lus (du plus récent au plus ancien) :
 *   e2e1:…  (e2eeType 4) — enveloppe multi-destinataires, groupes ;
 *   ecdh:…  (e2eeType 3) — MP : une copie pour le destinataire (`content`),
 *                          une pour soi (`senderContent`), sans état ;
 *   aes:…                — ancienne copie expéditeur (clé locale) ;
 *   (sans préfixe)       — ancien Signal Double Ratchet : UNE seule lecture
 *                          possible, donc seulement depuis le fil (`allowRatchet`).
 *
 * Écrits : `ecdh:` pour les MP (compatible avec l'app mobile), `e2e1:` pour
 * les groupes. Tout message lu est rangé dans le coffre (`vault.ts`) avec
 * l'empreinte de son ciphertext : relu tel quel tant qu'elle ne change pas.
 */

import { signalService } from '@/lib/signal-service';
import { shortHash } from '@/lib/e2ee/bytes';
import { E2EE_TYPE_ENVELOPE, EnvelopeError, isEnvelope, localPublicKey, openEnvelope, sealEnvelope } from '@/lib/e2ee/envelope';
import { getPublicKey, getPublicKeys } from '@/lib/e2ee/public-keys';
import { vault, type VaultMessage } from '@/lib/e2ee/vault';

/** État de chiffrement d'un message affiché. */
export type CryptoState =
  /** chiffré de bout en bout et lu */
  | 'e2ee'
  /** jamais chiffré (ancien message de groupe, par ex.) */
  | 'plain'
  /** chiffré mais illisible ici */
  | 'locked';

export type LockReason =
  /** arrivé dans le groupe après l'envoi */
  | 'not-member'
  /** clé locale absente : restaurer la sauvegarde (mot de passe) */
  | 'no-key'
  /** clé régénérée / message altéré / session Signal perdue */
  | 'unreadable';

export interface Decoded {
  content: string;
  crypto: CryptoState;
  reason?: LockReason;
}

/** Message tel que renvoyé par l'API / la passerelle. */
export interface RawMessage {
  id: string;
  conversationId?: string;
  senderId?: string;
  authorId?: string;
  content?: string | null;
  senderContent?: string | null;
  e2eeType?: number | null;
  createdAt?: string;
  updatedAt?: string;
  isEdited?: boolean;
  replyToId?: string | null;
}

export const isEncrypted = (raw: Pick<RawMessage, 'e2eeType' | 'content'>) =>
  Boolean(raw.e2eeType) || isEnvelope(raw.content ?? '');

/** Empreinte du ciphertext — change quand le message est modifié. */
export const cipherSig = (raw: Pick<RawMessage, 'content' | 'senderContent' | 'e2eeType'>) =>
  shortHash(`${raw.e2eeType ?? ''}|${raw.content ?? ''}|${raw.senderContent ?? ''}`);

const FAILED = '[Message';

async function decodeOne(raw: RawMessage, me: string, conversationId: string, allowRatchet: boolean): Promise<Decoded> {
  const content = raw.content ?? '';
  const senderId = raw.senderId ?? raw.authorId ?? '';
  if (!isEncrypted(raw)) return { content, crypto: 'plain' };

  if (raw.e2eeType === E2EE_TYPE_ENVELOPE || isEnvelope(content)) {
    try {
      return { content: await openEnvelope(content, { conversationId, senderId, me }), crypto: 'e2ee' };
    } catch (err) {
      const reason = err instanceof EnvelopeError ? err.reason : 'tampered';
      return { content: '', crypto: 'locked', reason: reason === 'not-for-me' ? 'not-member' : reason === 'no-key' ? 'no-key' : 'unreadable' };
    }
  }

  const mine = senderId === me;
  const copy = mine ? (raw.senderContent ?? '') : content;
  const stateless = copy.startsWith('ecdh:') || copy.startsWith('aes:');
  // Ratchet historique : un déchiffrement consomme l'état — jamais hors du fil.
  if (!stateless && !allowRatchet) return { content: '', crypto: 'locked', reason: 'unreadable' };
  try {
    const text = await signalService.decrypt(senderId, me, content, raw.senderContent ?? undefined, raw.e2eeType === 1 ? 1 : 3);
    if (text.startsWith(FAILED)) {
      return { content: '', crypto: 'locked', reason: text.includes('clé') || text.includes('ECDH') ? 'no-key' : 'unreadable' };
    }
    return { content: text, crypto: 'e2ee' };
  } catch {
    return { content: '', crypto: 'locked', reason: 'unreadable' };
  }
}

/**
 * Déchiffre une page de messages : coffre d'abord, réseau-crypto ensuite.
 * Les messages lus pour la première fois sont rangés dans le coffre.
 */
export async function resolveMessages(
  raws: RawMessage[],
  ctx: { me: string; conversationId: string; allowRatchet?: boolean },
): Promise<Map<string, Decoded>> {
  const out = new Map<string, Decoded>();
  const encrypted = raws.filter(isEncrypted);
  for (const raw of raws) if (!isEncrypted(raw)) out.set(raw.id, { content: raw.content ?? '', crypto: 'plain' });
  if (encrypted.length === 0) return out;

  const sigs = new Map(await Promise.all(encrypted.map(async (r) => [r.id, await cipherSig(r)] as const)));
  const known = await vault.getMany(encrypted.map((r) => r.id));
  const fresh: VaultMessage[] = [];

  // Par tranches : une page de 50 messages en ECDH ne doit pas figer le fil.
  const todo = encrypted.filter((r) => {
    const hit = known.get(r.id);
    if (hit && hit.sig === sigs.get(r.id)) {
      out.set(r.id, { content: hit.content, crypto: 'e2ee' });
      return false;
    }
    return true;
  });
  for (let i = 0; i < todo.length; i += 16) {
    const slice = todo.slice(i, i + 16);
    const decoded = await Promise.all(slice.map((r) => decodeOne(r, ctx.me, ctx.conversationId, ctx.allowRatchet ?? false)));
    slice.forEach((r, j) => {
      const d = decoded[j];
      out.set(r.id, d);
      if (d.crypto === 'e2ee') {
        fresh.push({
          id: r.id,
          conversationId: ctx.conversationId,
          authorId: r.senderId ?? r.authorId ?? '',
          content: d.content,
          createdAt: r.createdAt ?? new Date().toISOString(),
          editedAt: r.isEdited ? r.updatedAt : undefined,
          replyToId: r.replyToId ?? undefined,
          sig: sigs.get(r.id) ?? '',
        });
      }
    });
    if (i + 16 < todo.length) await new Promise((r) => setTimeout(r, 0));
  }
  if (fresh.length) void vault.putMany(fresh);
  return out;
}

/** Range dans le coffre un message qu'on vient d'envoyer (on connaît déjà son texte). */
export async function rememberOwnMessage(raw: RawMessage, conversationId: string, plaintext: string): Promise<void> {
  if (!isEncrypted(raw)) return;
  await vault.putMany([
    {
      id: raw.id,
      conversationId,
      authorId: raw.senderId ?? raw.authorId ?? '',
      content: plaintext,
      createdAt: raw.createdAt ?? new Date().toISOString(),
      editedAt: raw.isEdited ? raw.updatedAt : undefined,
      replyToId: raw.replyToId ?? undefined,
      sig: await cipherSig(raw),
    },
  ]);
}

export class E2eeSendError extends Error {
  constructor(readonly reason: 'peer-no-key' | 'no-local-key' | 'no-recipient', readonly missing: string[] = []) {
    super(`E2EE_SEND_${reason.toUpperCase()}`);
  }
}

export type ConversationTarget =
  | { kind: 'dm'; conversationId: string; me: string; peerId: string }
  | { kind: 'group'; conversationId: string; me: string; memberIds: string[] };

export interface Encrypted {
  content: string;
  senderContent?: string;
  e2eeType: number;
  /** Groupe : membres sans clé publiée, qui ne pourront pas lire ce message. */
  skipped: string[];
}

/** Chiffre un texte pour une conversation (MP : copies `ecdh:`, groupe : enveloppe). */
export async function encryptFor(target: ConversationTarget, plaintext: string): Promise<Encrypted> {
  const myKey = await localPublicKey();
  if (!myKey) throw new E2eeSendError('no-local-key');

  if (target.kind === 'dm') {
    const peerKey = await getPublicKey(target.peerId);
    if (!peerKey) throw new E2eeSendError('peer-no-key', [target.peerId]);
    const [content, senderContent] = await Promise.all([
      signalService.encryptECDH(plaintext, peerKey),
      signalService.encryptECDH(plaintext, myKey),
    ]);
    return { content, senderContent, e2eeType: 3, skipped: [] };
  }

  const others = [...new Set(target.memberIds)].filter((id) => id !== target.me);
  const keys = await getPublicKeys(others);
  const recipients = [{ userId: target.me, ecdhKey: myKey }];
  const skipped: string[] = [];
  for (const id of others) {
    const k = keys.get(id);
    if (k) recipients.push({ userId: id, ecdhKey: k });
    else skipped.push(id);
  }
  if (recipients.length === 1 && others.length > 0) throw new E2eeSendError('no-recipient', skipped);
  const content = await sealEnvelope(plaintext, { conversationId: target.conversationId, senderId: target.me, recipients });
  return { content, e2eeType: E2EE_TYPE_ENVELOPE, skipped };
}
