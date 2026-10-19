/**
 * Enveloppe multi-destinataires `e2e1:` — chiffrement de bout en bout des
 * groupes (et format réservé pour tout message à plusieurs lecteurs).
 *
 *   e2e1:<base64(JSON)>
 *   {
 *     v: 1,
 *     epk: clé publique P-256 éphémère du message (brute, 65 o),
 *     iv:  IV du contenu (12 o),
 *     ct:  AES-256-GCM(clé de message, texte, aad),
 *     k:   { [userId]: iv(12 o) ‖ AES-256-GCM(kek_userId, clé de message, aad_userId) }
 *   }
 *
 *   aad         = "alfy:e2e1|<conversationId>|<senderId>"
 *   kek_userId  = HKDF-SHA256(ECDH(éphémère, clé publique du membre), sel 0, "alfy:e2e1:kek|<userId>")
 *   aad_userId  = "alfy:e2e1:key|<conversationId>|<userId>"
 *
 * Le texte est chiffré UNE fois ; seule la clé de message l'est par membre.
 * Sans état : lisible autant de fois qu'on veut, sur tout appareil qui détient
 * la clé ECDH privée du compte (restaurée depuis la sauvegarde chiffrée). Les
 * données associées lient l'enveloppe à SA conversation et à SON auteur : un
 * serveur ne peut pas la recoller ailleurs ni l'attribuer à quelqu'un d'autre.
 */

import { signalStore } from '@/lib/signal-store';
import { concat, fromB64, fromUtf8, randomBytes, toB64, utf8 } from '@/lib/e2ee/bytes';

export const ENVELOPE_PREFIX = 'e2e1:';
/** Valeur `e2eeType` d'un message en enveloppe (1 / 3 = formats Signal historiques). */
export const E2EE_TYPE_ENVELOPE = 4;

interface EnvelopeJson {
  v: 1;
  epk: string;
  iv: string;
  ct: string;
  k: Record<string, string>;
}

export interface EnvelopeRecipient {
  userId: string;
  /** Clé ECDH P-256 publique (brute, base64). */
  ecdhKey: string;
}

const P256 = { name: 'ECDH', namedCurve: 'P-256' } as const;

/* ── Clé privée locale (importée une fois, réimportée si elle change) ───────── */

let local: { pub: string; key: CryptoKey } | null = null;

async function localPrivateKey(): Promise<CryptoKey> {
  const kp = await signalStore.getECDHKeyPair();
  if (!kp) throw new Error('E2EE_NO_LOCAL_KEY');
  if (local?.pub === kp.pubKey) return local.key;
  const key = await crypto.subtle.importKey('pkcs8', fromB64(kp.privKey), P256, false, ['deriveBits']);
  local = { pub: kp.pubKey, key };
  return key;
}

/** Clé ECDH publique de ce compte (pour s'inclure soi-même dans l'enveloppe). */
export async function localPublicKey(): Promise<string | null> {
  return (await signalStore.getECDHKeyPair())?.pubKey ?? null;
}

/** À appeler à la déconnexion / au changement de trousseau. */
export function forgetLocalKey(): void {
  local = null;
}

async function kekFor(priv: CryptoKey, pub: CryptoKey, userId: string, usage: KeyUsage): Promise<CryptoKey> {
  const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, priv, 256);
  const material = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: utf8(`alfy:e2e1:kek|${userId}`) },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  );
}

const contentAad = (conversationId: string, senderId: string) => utf8(`alfy:e2e1|${conversationId}|${senderId}`);
const keyAad = (conversationId: string, userId: string) => utf8(`alfy:e2e1:key|${conversationId}|${userId}`);

export function isEnvelope(payload: string | null | undefined): payload is string {
  return typeof payload === 'string' && payload.startsWith(ENVELOPE_PREFIX);
}

/** Chiffre `plaintext` pour chacun des destinataires (l'expéditeur doit en faire partie). */
export async function sealEnvelope(
  plaintext: string,
  ctx: { conversationId: string; senderId: string; recipients: EnvelopeRecipient[] },
): Promise<string> {
  if (ctx.recipients.length === 0) throw new Error('E2EE_NO_RECIPIENT');

  const eph = (await crypto.subtle.generateKey(P256, true, ['deriveBits'])) as CryptoKeyPair;
  const contentKeyRaw = randomBytes(32);
  const contentKey = await crypto.subtle.importKey('raw', contentKeyRaw, 'AES-GCM', false, ['encrypt']);
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: contentAad(ctx.conversationId, ctx.senderId) },
    contentKey,
    utf8(plaintext),
  );

  const k: Record<string, string> = {};
  await Promise.all(
    ctx.recipients.map(async (r) => {
      const pub = await crypto.subtle.importKey('raw', fromB64(r.ecdhKey), P256, false, []);
      const kek = await kekFor(eph.privateKey, pub, r.userId, 'encrypt');
      const wrapIv = randomBytes(12);
      const wrapped = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: wrapIv, additionalData: keyAad(ctx.conversationId, r.userId) },
        kek,
        contentKeyRaw,
      );
      k[r.userId] = toB64(concat(wrapIv, new Uint8Array(wrapped)));
    }),
  );

  const json: EnvelopeJson = {
    v: 1,
    epk: toB64(await crypto.subtle.exportKey('raw', eph.publicKey)),
    iv: toB64(iv),
    ct: toB64(ct),
    k,
  };
  return ENVELOPE_PREFIX + btoa(JSON.stringify(json));
}

/** Membres pour qui l'enveloppe a été scellée (sans rien déchiffrer). */
export function envelopeRecipients(encoded: string): string[] {
  try {
    return Object.keys((JSON.parse(atob(encoded.slice(ENVELOPE_PREFIX.length))) as EnvelopeJson).k ?? {});
  } catch {
    return [];
  }
}

export class EnvelopeError extends Error {
  /** `not-for-me` : on n'était pas membre au moment de l'envoi (arrivée plus tard, par ex.). */
  constructor(readonly reason: 'malformed' | 'not-for-me' | 'no-key' | 'tampered') {
    super(`E2EE_ENVELOPE_${reason.toUpperCase()}`);
  }
}

/** Ouvre une enveloppe destinée à `me`. */
export async function openEnvelope(
  encoded: string,
  ctx: { conversationId: string; senderId: string; me: string },
): Promise<string> {
  let json: EnvelopeJson;
  try {
    json = JSON.parse(atob(encoded.slice(ENVELOPE_PREFIX.length))) as EnvelopeJson;
  } catch {
    throw new EnvelopeError('malformed');
  }
  if (json?.v !== 1 || !json.epk || !json.iv || !json.ct || typeof json.k !== 'object') throw new EnvelopeError('malformed');
  const mine = json.k[ctx.me];
  if (!mine) throw new EnvelopeError('not-for-me');

  let priv: CryptoKey;
  try {
    priv = await localPrivateKey();
  } catch {
    throw new EnvelopeError('no-key');
  }

  try {
    const epk = await crypto.subtle.importKey('raw', fromB64(json.epk), P256, false, []);
    const kek = await kekFor(priv, epk, ctx.me, 'decrypt');
    const blob = fromB64(mine);
    const contentKeyRaw = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: blob.subarray(0, 12), additionalData: keyAad(ctx.conversationId, ctx.me) },
      kek,
      blob.subarray(12),
    );
    const contentKey = await crypto.subtle.importKey('raw', contentKeyRaw, 'AES-GCM', false, ['decrypt']);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(json.iv), additionalData: contentAad(ctx.conversationId, ctx.senderId) },
      contentKey,
      fromB64(json.ct),
    );
    return fromUtf8(plain);
  } catch {
    // Mauvaise clé locale (trousseau régénéré) ou enveloppe altérée : GCM refuse.
    throw new EnvelopeError('tampered');
  }
}
