/**
 * Connexion par QR code — côté poste demandeur.
 *
 * Le navigateur crée une paire éphémère P-256 et publie sa clé publique dans le
 * QR. Le téléphone, déjà authentifié, chiffre le bundle privé E2EE vers cette
 * clé et le renvoie via le serveur. Le serveur ne convoie qu'un chiffré qu'il
 * ne peut pas lire : la clé privée éphémère ne quitte jamais cet onglet.
 *
 * Les primitives sont volontairement IDENTIQUES à celles déjà utilisées pour
 * les messages (`signal-service.ts` côté web, `crypto-service.ts` côté mobile) :
 * ECDH P-256 → HKDF-SHA256(salt = 32 octets nuls, info = "AlfyChat-E2EE-v2")
 * → AES-256-GCM, enveloppe "ecdh:<ephPub>:<iv>:<ct>". Les deux plateformes
 * interopèrent déjà avec ce format, on ne réinvente donc aucun protocole.
 */

import { API_URL } from '@/lib/api';

/** Doit rester synchronisé avec `signal-store.ts`. */
export interface PrivateBundlePayload {
  identityKeyPair?: { pubKey: string; privKey: string };
  registrationId?: number;
  signedPreKeys?: Array<{ keyId: number; pubKey: string; privKey: string; signature?: string }>;
  preKeys?: Array<{ keyId: number; pubKey: string; privKey: string }>;
  sessions?: Array<{ identifier: string; session: unknown }>;
  selfEncryptionKey?: string;
  ecdhKeyPair?: { pubKey: string; privKey: string };
}

export interface RemoteAuthOrigin {
  ip: string | null;
  userAgent: string | null;
  requestedAt: string;
}

export interface RemoteSession {
  deviceCode: string;
  pollSecret: string;
  qrCodeDataUrl: string;
  qrPayload: string;
  expiresIn: number;
  /** Clé privée éphémère — reste en mémoire, jamais persistée. */
  ephemeralPrivateKey: CryptoKey;
}

export type RemotePollResult =
  | { status: 'pending' | 'scanned' | 'denied' | 'expired' }
  | {
      status: 'approved';
      tokens: { accessToken: string; refreshToken: string; expiresIn: number; sessionId: string };
      user: Record<string, unknown>;
      bundle: PrivateBundlePayload | null;
    };

/* ── Encodage ─────────────────────────────────────────────────────────────── */

function abToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Retourne un ArrayBuffer : accepté partout comme BufferSource par WebCrypto. */
function b64ToAb(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

/* ── Crypto ───────────────────────────────────────────────────────────────── */

/** Paire éphémère P-256. La clé publique est exportée en raw non compressé. */
async function generateEphemeralKeypair(): Promise<{ publicKeyB64: string; privateKey: CryptoKey }> {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const raw = await crypto.subtle.exportKey('raw', pair.publicKey);
  return { publicKeyB64: abToB64(raw), privateKey: pair.privateKey };
}

/** Mêmes paramètres HKDF que `signal-service.deriveAESFromECDH`. */
async function deriveAesKey(sharedBits: ArrayBuffer): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32),
      info: new TextEncoder().encode('AlfyChat-E2EE-v2'),
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
}

/**
 * Déchiffre une enveloppe "ecdh:<ephPub>:<iv>:<ct>" produite par le téléphone.
 * `ephPub` est la clé éphémère de l'ÉMETTEUR ; on la combine à notre clé privée.
 */
export async function decryptEcdhEnvelope(
  envelope: string,
  ephemeralPrivateKey: CryptoKey,
): Promise<string> {
  const parts = envelope.split(':');
  if (parts.length !== 4 || parts[0] !== 'ecdh') {
    throw new Error('Enveloppe de clé illisible');
  }
  const [, senderPubB64, ivB64, ctB64] = parts;

  const senderPub = await crypto.subtle.importKey(
    'raw',
    b64ToAb(senderPubB64),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  const shared = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: senderPub },
    ephemeralPrivateKey,
    256,
  );

  const aesKey = await deriveAesKey(shared);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToAb(ivB64) },
    aesKey,
    b64ToAb(ctB64),
  );

  return new TextDecoder().decode(plaintext);
}

/* ── Appels serveur ───────────────────────────────────────────────────────── */

/** Ouvre une session de connexion à distance et retourne de quoi afficher le QR. */
export async function startRemoteSession(): Promise<RemoteSession> {
  const { publicKeyB64, privateKey } = await generateEphemeralKeypair();

  const res = await fetch(`${API_URL}/api/auth/remote/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ephemeralPublicKey: publicKeyB64 }),
  });
  if (!res.ok) throw new Error('Impossible de générer le QR code');

  const data = (await res.json()) as Omit<RemoteSession, 'ephemeralPrivateKey'>;
  return { ...data, ephemeralPrivateKey: privateKey };
}

/**
 * Interroge l'état de la session. À l'approbation, déchiffre le bundle E2EE
 * localement — le résultat n'est jamais transmis à qui que ce soit.
 */
export async function pollRemoteSession(session: RemoteSession): Promise<RemotePollResult> {
  const url = `${API_URL}/api/auth/remote/poll?code=${encodeURIComponent(
    session.deviceCode,
  )}&secret=${encodeURIComponent(session.pollSecret)}`;

  const res = await fetch(url);
  if (!res.ok) return { status: 'expired' };

  const data = (await res.json()) as {
    status: RemotePollResult['status'];
    tokens?: { accessToken: string; refreshToken: string; expiresIn: number; sessionId: string };
    user?: Record<string, unknown>;
    encryptedKeyPayload?: string;
  };

  if (data.status !== 'approved') {
    return { status: data.status };
  }
  // Approuvé mais incomplet : le code a déjà été consommé ailleurs.
  if (!data.tokens || !data.user) {
    return { status: 'expired' };
  }

  let bundle: PrivateBundlePayload | null = null;
  if (data.encryptedKeyPayload) {
    try {
      const json = await decryptEcdhEnvelope(data.encryptedKeyPayload, session.ephemeralPrivateKey);
      bundle = JSON.parse(json) as PrivateBundlePayload;
    } catch (err) {
      // La session reste valable ; seul le déverrouillage des messages échoue.
      // On ne régénère SURTOUT pas de clés ici : cela rendrait illisibles tous
      // les messages passés, sur tous les appareils.
      console.error('[RemoteAuth] Déchiffrement du bundle impossible', err);
    }
  }

  return { status: 'approved', tokens: data.tokens, user: data.user, bundle };
}
