// E2EE crypto module — Curve25519 + PBKDF2(500k, SHA-512) + AES-256-GCM

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function b64ToBuf(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a Curve25519 (X25519) keypair.
 * Returns base64-encoded public and private keys.
 */
export async function generateKeypair(): Promise<{ publicKey: string; privateKey: string }> {
  const keypair = await crypto.subtle.generateKey(
    { name: 'X25519' },
    true,
    ['deriveKey', 'deriveBits']
  ) as CryptoKeyPair;

  const publicKeyBuf = await crypto.subtle.exportKey('raw', keypair.publicKey);
  const privateKeyBuf = await crypto.subtle.exportKey('pkcs8', keypair.privateKey);

  return {
    publicKey: bufToB64(publicKeyBuf),
    privateKey: bufToB64(privateKeyBuf),
  };
}

/**
 * Generate a random 32-byte salt, base64-encoded.
 */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  return bufToB64(salt);
}

/**
 * Derive an AES-256-GCM key from a password using PBKDF2
 * (500 000 iterations, SHA-512).
 */
export async function deriveKey(password: string, saltB64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: b64ToBuf(saltB64),
      iterations: 500_000,
      hash: 'SHA-512',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt the private key (pkcs8 b64) with the derived AES key.
 * Returns a JSON string containing { iv, ct } (both base64).
 */
export async function encryptPrivateKey(
  privateKeyB64: string,
  derivedKey: CryptoKey
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    b64ToBuf(privateKeyB64)
  );

  return JSON.stringify({ iv: bufToB64(iv), ct: bufToB64(ciphertext) });
}

/**
 * Decrypt the private key from the JSON envelope produced by encryptPrivateKey.
 * Returns base64 pkcs8 private key.
 */
export async function decryptPrivateKey(
  encryptedJson: string,
  derivedKey: CryptoKey
): Promise<string> {
  const { iv, ct } = JSON.parse(encryptedJson) as { iv: string; ct: string };
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBuf(iv) },
    derivedKey,
    b64ToBuf(ct)
  );
  return bufToB64(plaintext);
}

// ---------------------------------------------------------------------------
// Message encryption helpers
// ---------------------------------------------------------------------------

async function importPrivateKey(pkcs8B64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    b64ToBuf(pkcs8B64),
    { name: 'X25519' },
    false,
    ['deriveKey', 'deriveBits']
  );
}

async function importPublicKey(rawB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    b64ToBuf(rawB64),
    { name: 'X25519' },
    false,
    []
  );
}

async function deriveSharedKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'X25519', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext message using ECDH shared secret (AES-256-GCM).
 * Returns { ciphertext, nonce } — both base64.
 */
export async function encryptMessage(
  plaintext: string,
  senderPrivKeyB64: string,
  recipientPubKeyB64: string
): Promise<{ ciphertext: string; nonce: string }> {
  const senderPriv = await importPrivateKey(senderPrivKeyB64);
  const recipientPub = await importPublicKey(recipientPubKeyB64);
  const sharedKey = await deriveSharedKey(senderPriv, recipientPub);

  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    sharedKey,
    enc.encode(plaintext)
  );

  return { ciphertext: bufToB64(ciphertextBuf), nonce: bufToB64(nonce) };
}

/**
 * Decrypt a message using ECDH shared secret (AES-256-GCM).
 * The shared secret is derived from the recipient's private key and the sender's public key.
 */
export async function decryptMessage(
  ciphertextB64: string,
  nonceB64: string,
  recipientPrivKeyB64: string,
  senderPubKeyB64: string
): Promise<string> {
  const recipientPriv = await importPrivateKey(recipientPrivKeyB64);
  const senderPub = await importPublicKey(senderPubKeyB64);
  const sharedKey = await deriveSharedKey(recipientPriv, senderPub);

  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBuf(nonceB64) },
    sharedKey,
    b64ToBuf(ciphertextB64)
  );

  return new TextDecoder().decode(plainBuf);
}
