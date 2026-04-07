// ==========================================
// ALFYCHAT - SIGNAL PROTOCOL SERVICE
// Chiffrement E2EE complet : X3DH + Double Ratchet
// Utilise @privacyresearch/libsignal-protocol-typescript
// ==========================================

import {
  KeyHelper,
  SignalProtocolAddress,
  SessionBuilder,
  SessionCipher,
  MessageType,
} from '@privacyresearch/libsignal-protocol-typescript';
import { signalStore } from './signal-store';
import type { PrivateBundleData } from './signal-store';

// Nombre de one-time prekeys à générer/maintenir
const ONE_TIME_PREKEY_COUNT = 100;
const LOW_PREKEY_THRESHOLD = 10;

// deviceId fixé à 1 (une seule session par utilisateur dans cette version)
const DEVICE_ID = 1;

// ——— Types pour le bundle de clés ———

export interface SignalKeyBundle {
  registrationId: number;
  identityKey: string;      // base64 clé publique d'identité
  ecdhKey?: string;         // base64 clé publique P-256 pour ECDH direct
  signedPrekey: {
    keyId: number;
    publicKey: string;      // base64
    signature: string;      // base64
  };
  prekeys: Array<{
    keyId: number;
    publicKey: string;      // base64
  }>;
}

export interface RemoteKeyBundle {
  userId: string;
  registrationId: number;
  identityKey: string;      // base64
  ecdhKey?: string;         // base64 clé publique P-256 pour ECDH direct
  signedPrekey: {
    keyId: number;
    publicKey: string;      // base64
    signature: string;      // base64
  };
  prekey?: {
    keyId: number;
    publicKey: string;      // base64
  };
}

export interface SignalEncryptedMessage {
  content: string;       // ciphertext base64 pour le destinataire
  senderContent: string; // ciphertext base64 pour l'expéditeur
  e2eeType: 1 | 3;       // 1 = WhisperMessage, 3 = PreKeyWhisperMessage
}

// ——— Helpers base64 / ArrayBuffer ———

function b64ToAb(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function abToB64(ab: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(ab)));
}

function strToAb(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer;
}

function abToStr(ab: ArrayBuffer): string {
  return new TextDecoder().decode(ab);
}

// ——— Service Signal ———

class SignalService {
  private initialized = false;
  private selfKey: CryptoKey | null = null;
  /** Cache en mémoire des bundles publics des destinataires */
  private bundleCache = new Map<string, RemoteKeyBundle>();

  getCachedBundle(recipientId: string): RemoteKeyBundle | null {
    return this.bundleCache.get(recipientId) ?? null;
  }

  setCachedBundle(recipientId: string, bundle: RemoteKeyBundle): void {
    this.bundleCache.set(recipientId, bundle);
  }

  // ——— ECDH direct (P-256 + AES-256-GCM) ———
  // Remplace le Double Ratchet : chaque message est indépendamment déchiffrable
  // avec la clé ECDH P-256 du destinataire. Aucun état de session requis.

  /** Dérive une clé AES-256-GCM depuis le secret ECDH via HKDF-SHA256 */
  private async deriveAESFromECDH(sharedBits: ArrayBuffer): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode('AlfyChat-E2EE-v2') },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Génère une paire de clés P-256 ECDH, la stocke dans IndexedDB,
   * et retourne la clé publique en base64 (format raw non compressé, 65 octets).
   */
  private async generateAndStoreECDHKeyPair(): Promise<string> {
    const kp = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
    );
    const pubRaw = await crypto.subtle.exportKey('raw', kp.publicKey);
    const privPkcs8 = await crypto.subtle.exportKey('pkcs8', kp.privateKey);
    const pubB64 = abToB64(pubRaw);
    const privB64 = abToB64(privPkcs8);
    await signalStore.saveECDHKeyPair(pubB64, privB64);
    return pubB64;
  }

  /**
   * Charge la clé privée ECDH P-256 depuis IndexedDB.
   */
  private async loadECDHPrivateKey(): Promise<CryptoKey> {
    const kp = await signalStore.getECDHKeyPair();
    if (!kp) throw new Error('[Signal] Clé ECDH P-256 introuvable dans le store');
    return crypto.subtle.importKey(
      'pkcs8',
      b64ToAb(kp.privKey),
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveBits']
    );
  }

  /**
   * Chiffre un message pour le destinataire via ECDH (P-256).
   * Format retourné : "ecdh:<ephPub_b64>:<iv_b64>:<ciphertext_b64>"
   * Le destinataire peut déchiffrer à tout moment avec sa clé ECDH privée P-256.
   */
  async encryptECDH(plaintext: string, recipientECDHKeyB64: string): Promise<string> {
    // Générer une paire de clés éphémère P-256
    const ephKP = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
    );

    // Importer la clé publique ECDH P-256 du destinataire (format raw, 65 octets)
    const recipientPub = await crypto.subtle.importKey(
      'raw',
      b64ToAb(recipientECDHKeyB64),
      { name: 'ECDH', namedCurve: 'P-256' },
      false, []
    );

    // ECDH → secret partagé (256 bits)
    const sharedBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: recipientPub },
      ephKP.privateKey,
      256
    );

    // AES-GCM
    const aesKey = await this.deriveAESFromECDH(sharedBits);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      strToAb(plaintext)
    );

    // Exporter la clé publique éphémère
    const ephPubRaw = await crypto.subtle.exportKey('raw', ephKP.publicKey);

    return `ecdh:${abToB64(ephPubRaw)}:${abToB64(iv.buffer)}:${abToB64(ciphertext)}`;
  }

  /**
   * Déchiffre un message ECDH reçu.
   * Utilise la clé ECDH privée P-256 locale + la clé éphémère de l'expéditeur (dans le message).
   */
  async decryptECDH(encoded: string): Promise<string> {
    const parts = encoded.split(':');
    // parts = ['ecdh', ephPub_b64, iv_b64, ciphertext_b64]

    // Charger notre clé privée ECDH P-256
    const privKey = await this.loadECDHPrivateKey();

    // Importer la clé publique éphémère P-256 de l'expéditeur
    const ephPub = await crypto.subtle.importKey(
      'raw',
      b64ToAb(parts[1]),
      { name: 'ECDH', namedCurve: 'P-256' },
      false, []
    );

    // ECDH → même secret partagé que l'expéditeur
    const sharedBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: ephPub },
      privKey,
      256
    );

    const aesKey = await this.deriveAESFromECDH(sharedBits);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(b64ToAb(parts[2])) },
      aesKey,
      b64ToAb(parts[3])
    );

    return abToStr(plaintext);
  }

  // ——— Chiffrement AES-GCM pour la copie expéditeur ———

  private async ensureSelfKey(): Promise<CryptoKey> {
    if (this.selfKey) return this.selfKey;
    const rawKey = await signalStore.getSelfEncryptionKeyRaw();
    if (rawKey) {
      this.selfKey = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
      return this.selfKey;
    }
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const exported = await crypto.subtle.exportKey('raw', key);
    await signalStore.saveSelfEncryptionKeyRaw(exported);
    this.selfKey = key;
    return this.selfKey;
  }

  private async encryptForSelf(plaintext: ArrayBuffer): Promise<string> {
    const key = await this.ensureSelfKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    return `aes:${abToB64(iv.buffer)}:${abToB64(ciphertext)}`;
  }

  private async decryptForSelf(encoded: string): Promise<string> {
    const parts = encoded.split(':');
    const key = await this.ensureSelfKey();
    const iv = b64ToAb(parts[1]);
    const ciphertext = b64ToAb(parts[2]);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, ciphertext);
    return abToStr(plaintext);
  }

  /**
   * Génère un bundle de clés Signal complet pour l'utilisateur courant.
   * À appeler une seule fois lors de l'inscription ou si aucun bundle n'existe.
   */
  async generateKeyBundle(): Promise<SignalKeyBundle> {
    // Générer la paire de clés d'identité
    const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
    const registrationId = await KeyHelper.generateRegistrationId();

    // Sauvegarder dans le store local
    await signalStore.saveIdentityKeyPair(identityKeyPair);
    await signalStore.saveLocalRegistrationId(registrationId);

    // Générer le signed prekey
    const signedPreKeyId = 1;
    const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, signedPreKeyId);
    await signalStore.storeSignedPreKey(signedPreKeyId, signedPreKey.keyPair);
    // Stocker la signature pour pouvoir re-publier le bundle sans mot de passe après reload
    await signalStore.storeSignedPreKeySignature(signedPreKeyId, abToB64(signedPreKey.signature));

    // Générer les one-time prekeys
    const prekeys = await this.generateOneTimePrekeys(1, ONE_TIME_PREKEY_COUNT);

    // Pré-générer la clé AES pour la copie expéditeur
    await this.ensureSelfKey();

    // Générer la paire de clés P-256 ECDH pour le chiffrement direct
    const ecdhKey = await this.generateAndStoreECDHKeyPair();

    this.initialized = true;

    return {
      registrationId,
      identityKey: abToB64(identityKeyPair.pubKey),
      ecdhKey,
      signedPrekey: {
        keyId: signedPreKeyId,
        publicKey: abToB64(signedPreKey.keyPair.pubKey),
        signature: abToB64(signedPreKey.signature),
      },
      prekeys,
    };
  }

  /**
   * Génère de nouvelles one-time prekeys, à appeler quand le stock est bas.
   */
  async generateOneTimePrekeys(
    startId: number,
    count: number
  ): Promise<Array<{ keyId: number; publicKey: string }>> {
    const result: Array<{ keyId: number; publicKey: string }> = [];

    for (let i = 0; i < count; i++) {
      const keyId = startId + i;
      const preKey = await KeyHelper.generatePreKey(keyId);
      await signalStore.storePreKey(keyId, preKey.keyPair);
      result.push({ keyId, publicKey: abToB64(preKey.keyPair.pubKey) });
    }

    return result;
  }

  /**
   * Vérifie si le store local contient déjà un bundle Signal valide.
   */
  async isInitialized(): Promise<boolean> {
    if (this.initialized) return true;
    const kp = await signalStore.getIdentityKeyPair();
    const rid = await signalStore.getLocalRegistrationId();
    this.initialized = !!(kp && rid !== undefined);
    return this.initialized;
  }

  /**
   * Établit une session X3DH avec un utilisateur distant à partir de son bundle de clés.
   * À appeler avant le premier message envoyé à cet utilisateur.
   */
  async processPreKeyBundle(remoteUserId: string, bundle: RemoteKeyBundle): Promise<void> {
    const address = new SignalProtocolAddress(remoteUserId, DEVICE_ID);
    const builder = new SessionBuilder(signalStore, address);

    await builder.processPreKey({
      registrationId: bundle.registrationId,
      identityKey: b64ToAb(bundle.identityKey),
      signedPreKey: {
        keyId: bundle.signedPrekey.keyId,
        publicKey: b64ToAb(bundle.signedPrekey.publicKey),
        signature: b64ToAb(bundle.signedPrekey.signature),
      },
      preKey: bundle.prekey
        ? {
            keyId: bundle.prekey.keyId,
            publicKey: b64ToAb(bundle.prekey.publicKey),
          }
        : undefined,
    });
  }

  /**
   * Chiffre un message pour un destinataire.
   * Produit DEUX ciphertexts : un pour le destinataire, un pour l'expéditeur.
   *
   * @param recipientId - userId du destinataire
   * @param plaintext   - texte clair à chiffrer
   * @param currentUserId - userId de l'expéditeur (pour sa propre copie)
   */
  async encrypt(
    recipientId: string,
    plaintext: string,
    currentUserId: string
  ): Promise<SignalEncryptedMessage> {
    const plaintextBuffer = strToAb(plaintext);

    // Récupérer le bundle du destinataire depuis le cache
    const bundle = this.bundleCache.get(recipientId);
    if (!bundle) throw new Error(`[Signal] Bundle introuvable en cache pour ${recipientId}`);
    if (!bundle.ecdhKey) throw new Error(`[Signal] Le destinataire ${recipientId} n'a pas de clé ECDH P-256`);

    // Chiffrer pour le destinataire via ECDH direct P-256 (pas de session Double Ratchet)
    const content = await this.encryptECDH(plaintext, bundle.ecdhKey);

    // Chiffrer pour l'expéditeur (AES-GCM avec clé locale)
    const senderContent = await this.encryptForSelf(plaintextBuffer);

    return {
      content,
      senderContent,
      e2eeType: 3, // type 3 = contient les clés → toujours déchiffrable
    };
  }

  /**
   * Déchiffre un message Signal reçu du serveur.
   *
   * @param senderId       - userId de l'expéditeur
   * @param currentUserId  - userId courant (pour savoir quel ciphertext utiliser)
   * @param content        - ciphertext pour le destinataire
   * @param senderContent  - ciphertext pour l'expéditeur
   * @param e2eeType       - 1 = WhisperMessage, 3 = PreKeyWhisperMessage
   */
  async decrypt(
    senderId: string,
    currentUserId: string,
    content: string,
    senderContent: string | undefined,
    e2eeType: 1 | 3
  ): Promise<string> {
    const isSender = senderId === currentUserId;

    if (isSender && senderContent) {
      // Format AES-GCM (senderContent)
      if (senderContent.startsWith('aes:')) {
        return this.decryptForSelf(senderContent);
      }
      // Ancien format Signal (messages envoyés avant la migration)
      return this.decryptSenderCopy(currentUserId, senderContent, e2eeType);
    }

    // Destinataire : nouveau format ECDH
    if (content.startsWith('ecdh:')) {
      return this.decryptECDH(content);
    }

    // Ancien format Signal (messages reçus avant la migration)
    return this.decryptRecipientCopy(senderId, content, e2eeType);
  }

  private async decryptRecipientCopy(
    senderId: string,
    ciphertext: string,
    e2eeType: 1 | 3
  ): Promise<string> {
    const address = new SignalProtocolAddress(senderId, DEVICE_ID);
    const cipher = new SessionCipher(signalStore, address);

    let decrypted: ArrayBuffer;
    if (e2eeType === 3) {
      // PreKeyWhisperMessage — établit la session Double Ratchet
      decrypted = await cipher.decryptPreKeyWhisperMessage(ciphertext, 'binary');
    } else {
      // WhisperMessage — session déjà établie
      decrypted = await cipher.decryptWhisperMessage(ciphertext, 'binary');
    }

    return abToStr(decrypted);
  }

  private async decryptSenderCopy(
    currentUserId: string,
    senderCiphertext: string,
    e2eeType: 1 | 3
  ): Promise<string> {
    const address = new SignalProtocolAddress(`${currentUserId}:self`, DEVICE_ID);
    const cipher = new SessionCipher(signalStore, address);

    try {
      let decrypted: ArrayBuffer;
      if (e2eeType === 3) {
        decrypted = await cipher.decryptPreKeyWhisperMessage(senderCiphertext, 'binary');
      } else {
        decrypted = await cipher.decryptWhisperMessage(senderCiphertext, 'binary');
      }
      return abToStr(decrypted);
    } catch {
      return '[Message chiffré — relecture non disponible]';
    }
  }

  /**
   * Vérifie si une session Signal est déjà établie avec un utilisateur.
   */
  async hasSession(userId: string): Promise<boolean> {
    const address = new SignalProtocolAddress(userId, DEVICE_ID);
    const session = await signalStore.loadSession(address.toString());
    return !!session;
  }

  /**
   * Ajoute une clé ECDH P-256 si elle manque (migration / backup incomplet).
   * Ne touche PAS à l'identity key ni aux sessions existantes.
   * Met à jour le bundle public sur le serveur et re-upload le backup chiffré.
   */
  async addMissingECDHKey(password: string): Promise<void> {
    const ecdhKey = await this.generateAndStoreECDHKeyPair();
    // Mettre à jour le bundle public sur le serveur (ajouter ecdhKey)
    const { api } = await import('./api');
    const identityKP = await signalStore.getIdentityKeyPair();
    const regId = await signalStore.getLocalRegistrationId();
    if (identityKP && regId !== undefined) {
      await api.updateSignalECDHKey(ecdhKey);
    }
    // Re-chiffrer et uploader le backup privé avec la nouvelle clé ECDH incluse
    const encryptedBlob = await this.encryptPrivateBundle(password);
    await api.uploadPrivateBundle(encryptedBlob);
    console.log('[Signal] Clé ECDH P-256 ajoutée et backup mis à jour ✓');
  }

  /**
   * Reconstruit le bundle public depuis IndexedDB (sans mot de passe).
   * Utilisé après un reload quand le serveur a perdu le bundle (restart DB).
   * Retourne null si la signature du signed prekey n'est pas disponible.
   */
  async rebuildPublicBundle(): Promise<SignalKeyBundle | null> {
    const identityKP = await signalStore.getIdentityKeyPair();
    const regId      = await signalStore.getLocalRegistrationId();
    const ecdhKP     = await signalStore.getECDHKeyPair();
    if (!identityKP || regId === undefined || !ecdhKP) return null;

    // Récupérer signed prekey (seul le keyId=1 est utilisé)
    const signedPreKeyId = 1;
    const signedPreKeyKP = await signalStore.loadSignedPreKey(signedPreKeyId);
    const signatureb64   = await signalStore.loadSignedPreKeySignature(signedPreKeyId);
    if (!signedPreKeyKP || !signatureb64) {
      console.warn('[Signal] Signature du signed prekey introuvable — rebuild impossible');
      return null;
    }

    // Récupérer les one-time prekeys restants
    const preKeyIds = await signalStore.getAllPreKeyIds();
    const prekeys: Array<{ keyId: number; publicKey: string }> = [];
    for (const id of preKeyIds) {
      const kp = await signalStore.loadPreKey(id);
      if (kp) prekeys.push({ keyId: id, publicKey: abToB64(kp.pubKey) });
    }

    return {
      registrationId: regId,
      identityKey: abToB64(identityKP.pubKey),
      ecdhKey: ecdhKP.pubKey,
      signedPrekey: {
        keyId:     signedPreKeyId,
        publicKey: abToB64(signedPreKeyKP.pubKey),
        signature: signatureb64,
      },
      prekeys,
    };
  }

  /**
   * Réinitialise toutes les données Signal locales.
   * À appeler lors de la déconnexion ou du changement de compte.
   */
  async reset(): Promise<void> {
    await signalStore.clear();
    this.initialized = false;
    this.selfKey = null;
    this.bundleCache.clear();
    sessionStorage.removeItem('alfychat_signal_bundle');
  }

  // ==========================================
  // SAUVEGARDE CHIFFRÉE DU BUNDLE PRIVÉ
  // Utilise WebCrypto : PBKDF2-SHA256 + AES-256-GCM
  // Le serveur reçoit un blob opaque qu'il ne peut pas déchiffrer.
  // ==========================================

  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer, hash: 'SHA-256', iterations: 600_000 },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Chiffre le bundle de clés privées avec le mot de passe de l'utilisateur.
   * Retourne un blob JSON base64 à stocker sur le serveur.
   * @param password - mot de passe en clair de l'utilisateur
   */
  async encryptPrivateBundle(password: string): Promise<string> {
    const bundleData: PrivateBundleData = await signalStore.exportPrivateBundle();
    const plaintext = new TextEncoder().encode(JSON.stringify(bundleData));

    const salt = crypto.getRandomValues(new Uint8Array(32));
    const iv   = crypto.getRandomValues(new Uint8Array(12));
    const key  = await this.deriveKey(password, salt);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintext
    );

    const payload = {
      version:    1,
      kdf:        'PBKDF2-SHA256',
      iterations: 600_000,
      salt:       abToB64(salt.buffer),
      iv:         abToB64(iv.buffer),
      ciphertext: abToB64(ciphertext),
    };

    return btoa(JSON.stringify(payload));
  }

  /**
   * Déchiffre un blob reçu du serveur et importe les clés dans IndexedDB.
   * Stocke aussi le blob original en sessionStorage pour la durée de la session.
   * @param encryptedBlob - la chaîne base64 renvoyée par le serveur
   * @param password      - mot de passe en clair de l'utilisateur
   */
  async decryptAndImportPrivateBundle(encryptedBlob: string, password: string): Promise<void> {
    const payload = JSON.parse(atob(encryptedBlob)) as {
      version: number;
      kdf: string;
      iterations: number;
      salt: string;
      iv: string;
      ciphertext: string;
    };

    if (payload.version !== 1 || payload.kdf !== 'PBKDF2-SHA256') {
      throw new Error('[Signal] Format de bundle privé non supporté');
    }

    const salt = b64ToAb(payload.salt);
    const iv   = b64ToAb(payload.iv);
    const key  = await this.deriveKey(password, new Uint8Array(salt));

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      b64ToAb(payload.ciphertext)
    );

    const bundleData: PrivateBundleData = JSON.parse(new TextDecoder().decode(plaintext));
    await signalStore.importPrivateBundle(bundleData);
    this.initialized = true;

    // Stocker le blob en sessionStorage pour éviter un déchiffrement à chaque rechargement
    sessionStorage.setItem('alfychat_signal_bundle', encryptedBlob);
  }

  /**
   * Retourne le prochain ID disponible pour les one-time prekeys.
   */
  async getNextPreKeyId(): Promise<number> {
    const ids = await signalStore.getAllPreKeyIds();
    return ids.length > 0 ? Math.max(...ids) + 1 : 1;
  }

  /**
   * Retourne le seuil de prékeys bas pour déclencher le rechargement.
   */
  get lowPrekeyThreshold(): number {
    return LOW_PREKEY_THRESHOLD;
  }

  /**
   * Retourne le nombre de prekeys à générer lors d'un rechargement.
   */
  get prekeyBatchSize(): number {
    return ONE_TIME_PREKEY_COUNT;
  }
}

// Singleton
export const signalService = new SignalService();
