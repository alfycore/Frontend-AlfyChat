// ==========================================
// ALFYCHAT - SIGNAL PROTOCOL STORE (IndexedDB)
// Stockage des clés Signal côté client UNIQUEMENT.
// Implémente l'interface StorageType de @privacyresearch/libsignal-protocol-typescript
// ==========================================

import {
  StorageType,
  KeyPairType,
  SessionRecordType,
  Direction,
} from '@privacyresearch/libsignal-protocol-typescript';

const DB_NAME = 'alfychat-signal';
const DB_VERSION = 1;

// Noms des object stores IndexedDB
const STORES = {
  identityKeys: 'identity_keys',
  sessions: 'sessions',
  preKeys: 'pre_keys',
  signedPreKeys: 'signed_pre_keys',
  config: 'config',
} as const;

let _db: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (_db) return _db;

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (ev) => {
      const db = (ev.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.identityKeys)) {
        db.createObjectStore(STORES.identityKeys, { keyPath: 'identifier' });
      }
      if (!db.objectStoreNames.contains(STORES.sessions)) {
        db.createObjectStore(STORES.sessions, { keyPath: 'identifier' });
      }
      if (!db.objectStoreNames.contains(STORES.preKeys)) {
        db.createObjectStore(STORES.preKeys, { keyPath: 'keyId' });
      }
      if (!db.objectStoreNames.contains(STORES.signedPreKeys)) {
        db.createObjectStore(STORES.signedPreKeys, { keyPath: 'keyId' });
      }
      if (!db.objectStoreNames.contains(STORES.config)) {
        db.createObjectStore(STORES.config, { keyPath: 'key' });
      }
    };

    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

async function dbGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ?? undefined);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store: string, value: object): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(store: string, key: IDBValidKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll<T>(store: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

// Sérialiser ArrayBuffer en base64 pour IndexedDB
function ab2b64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b642ab(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function serializeKeyPair(kp: KeyPairType): object {
  return {
    pubKey: ab2b64(kp.pubKey),
    privKey: ab2b64(kp.privKey),
  };
}

function deserializeKeyPair(raw: any): KeyPairType {
  return {
    pubKey: b642ab(raw.pubKey),
    privKey: b642ab(raw.privKey),
  };
}

/**
 * Implémentation IndexedDB de StorageType Signal Protocol.
 * Toutes les données restent sur l'appareil de l'utilisateur.
 */
export class SignalProtocolStore implements StorageType {
  // ——— Clé d'identité ———

  async getIdentityKeyPair(): Promise<KeyPairType | undefined> {
    const row = await dbGet<any>(STORES.config, 'identityKeyPair');
    if (!row) return undefined;
    return deserializeKeyPair(row.value);
  }

  async saveIdentityKeyPair(kp: KeyPairType): Promise<void> {
    await dbPut(STORES.config, { key: 'identityKeyPair', value: serializeKeyPair(kp) });
  }

  // ——— Registration ID ———

  async getLocalRegistrationId(): Promise<number | undefined> {
    const row = await dbGet<any>(STORES.config, 'registrationId');
    return row?.value;
  }

  async saveLocalRegistrationId(id: number): Promise<void> {
    await dbPut(STORES.config, { key: 'registrationId', value: id });
  }

  // ——— Confiance en l'identité ———

  async isTrustedIdentity(
    identifier: string,
    identityKey: ArrayBuffer,
    _direction: Direction
  ): Promise<boolean> {
    const existing = await this.loadIdentityKey(identifier);
    if (!existing) return true; // Premier contact → accepter
    // Comparer les clés
    const a = new Uint8Array(existing);
    const b = new Uint8Array(identityKey);
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }

  async loadIdentityKey(identifier: string): Promise<ArrayBuffer | undefined> {
    const row = await dbGet<any>(STORES.identityKeys, identifier);
    return row ? b642ab(row.identityKey) : undefined;
  }

  async saveIdentity(identifier: string, identityKey: ArrayBuffer): Promise<boolean> {
    const existing = await this.loadIdentityKey(identifier);
    const isNew = !existing;
    await dbPut(STORES.identityKeys, { identifier, identityKey: ab2b64(identityKey) });
    return isNew;
  }

  // ——— API de stockage générique (requis par certains helpers) ———

  async put(key: string, value: unknown): Promise<void> {
    await dbPut(STORES.config, { key, value });
  }

  async get(key: string, defaultValue?: unknown): Promise<unknown> {
    const row = await dbGet<any>(STORES.config, key);
    return row?.value ?? defaultValue;
  }

  async remove(key: string): Promise<void> {
    await dbDelete(STORES.config, key);
  }

  // ——— PreKeys one-time ———

  async loadPreKey(keyId: string | number): Promise<KeyPairType | undefined> {
    const row = await dbGet<any>(STORES.preKeys, Number(keyId));
    return row ? deserializeKeyPair(row) : undefined;
  }

  async storePreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    await dbPut(STORES.preKeys, { keyId: Number(keyId), ...serializeKeyPair(keyPair) });
  }

  async removePreKey(keyId: string | number): Promise<void> {
    await dbDelete(STORES.preKeys, typeof keyId === 'string' ? parseInt(keyId, 10) : keyId);
  }

  async getAllPreKeyIds(): Promise<number[]> {
    const rows = await dbGetAll<any>(STORES.preKeys);
    return rows.map(r => r.keyId);
  }

  // ——— Signed PreKeys ———

  async loadSignedPreKey(keyId: string | number): Promise<KeyPairType | undefined> {
    const row = await dbGet<any>(STORES.signedPreKeys, Number(keyId));
    return row ? deserializeKeyPair(row) : undefined;
  }

  async storeSignedPreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    // Preserve existing signature if present
    const existing = await dbGet<any>(STORES.signedPreKeys, Number(keyId));
    await dbPut(STORES.signedPreKeys, {
      keyId: Number(keyId),
      ...serializeKeyPair(keyPair),
      signature: existing?.signature,
    });
  }

  /** Stores the base64 signature of a signed prekey alongside its keypair. */
  async storeSignedPreKeySignature(keyId: number, signatureB64: string): Promise<void> {
    const existing = await dbGet<any>(STORES.signedPreKeys, keyId);
    if (existing) {
      await dbPut(STORES.signedPreKeys, { ...existing, signature: signatureB64 });
    } else {
      await dbPut(STORES.config, { key: `spk_sig_${keyId}`, value: signatureB64 });
    }
  }

  /** Loads a stored signed prekey signature (base64). */
  async loadSignedPreKeySignature(keyId: number): Promise<string | null> {
    const row = await dbGet<any>(STORES.signedPreKeys, keyId);
    if (row?.signature) return row.signature;
    // Fallback: check config store (pre-migration)
    const cfg = await dbGet<any>(STORES.config, `spk_sig_${keyId}`);
    return cfg?.value ?? null;
  }

  async removeSignedPreKey(keyId: string | number): Promise<void> {
    await dbDelete(STORES.signedPreKeys, typeof keyId === 'string' ? parseInt(keyId, 10) : keyId);
  }

  // ——— Sessions Double Ratchet ———

  async loadSession(identifier: string): Promise<SessionRecordType | undefined> {
    const row = await dbGet<any>(STORES.sessions, identifier);
    return row?.session as SessionRecordType | undefined;
  }

  async storeSession(identifier: string, record: SessionRecordType): Promise<void> {
    await dbPut(STORES.sessions, { identifier, session: record });
  }

  async removeSession(identifier: string): Promise<void> {
    await dbDelete(STORES.sessions, identifier);
  }

  async removeAllSessions(identifier: string): Promise<void> {
    // Supprimer toutes les sessions dont l'identifiant commence par `identifier`
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.sessions, 'readwrite');
      const store = tx.objectStore(STORES.sessions);
      const req = store.openCursor();
      req.onsuccess = (ev) => {
        const cursor = (ev.target as IDBRequest<IDBCursorWithValue>).result;
        if (!cursor) return resolve();
        if ((cursor.key as string).startsWith(identifier)) {
          cursor.delete();
        }
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  }

  // ——— Export / Import du bundle privé (pour sauvegarde chiffrée côté serveur) ———

  /**
   * Exporte toutes les clés privées sous forme d'un objet JSON-sérialisable.
   * Ce blob sera chiffré (AES-256-GCM) avant envoi au serveur.
   */
  async exportPrivateBundle(): Promise<PrivateBundleData> {
    const identityKeyPair = await this.getIdentityKeyPair();
    const registrationId  = await this.getLocalRegistrationId();
    if (!identityKeyPair || registrationId === undefined) {
      throw new Error('[SignalStore] Aucune clé locale à exporter');
    }

    const signedPreKeyRows = await dbGetAll<any>(STORES.signedPreKeys);
    const preKeyRows       = await dbGetAll<any>(STORES.preKeys);
    const sessionRows      = await dbGetAll<any>(STORES.sessions);

    const selfKeyRaw = await this.getSelfEncryptionKeyRaw();
    const ecdhKeyPair = await this.getECDHKeyPair();

    return {
      identityKeyPair: {
        pubKey:  ab2b64(identityKeyPair.pubKey),
        privKey: ab2b64(identityKeyPair.privKey),
      },
      registrationId,
      signedPreKeys: signedPreKeyRows.map(r => ({
        keyId:     r.keyId,
        pubKey:    r.pubKey,
        privKey:   r.privKey,
        signature: r.signature ?? undefined,
      })),
      preKeys: preKeyRows.map(r => ({
        keyId:   r.keyId,
        pubKey:  r.pubKey,
        privKey: r.privKey,
      })),
      sessions: sessionRows.map(r => ({
        identifier: r.identifier,
        session:    r.session,
      })),
      selfEncryptionKey: selfKeyRaw ? ab2b64(selfKeyRaw) : undefined,
      ecdhKeyPair: ecdhKeyPair ?? undefined,
    };
  }

  /**
   * Importe un bundle privé (après déchiffrement AES-256-GCM côté client).
   * Remplace entièrement les données Signal locales.
   */
  async importPrivateBundle(data: PrivateBundleData): Promise<void> {
    await dbPut(STORES.config, {
      key: 'identityKeyPair',
      value: { pubKey: data.identityKeyPair.pubKey, privKey: data.identityKeyPair.privKey },
    });
    await dbPut(STORES.config, { key: 'registrationId', value: data.registrationId });

    for (const spk of data.signedPreKeys) {
      await dbPut(STORES.signedPreKeys, {
        keyId:     spk.keyId,
        pubKey:    spk.pubKey,
        privKey:   spk.privKey,
        signature: spk.signature ?? undefined,
      });
    }
    for (const pk of data.preKeys) {
      await dbPut(STORES.preKeys, pk);
    }
    for (const s of data.sessions) {
      await dbPut(STORES.sessions, s);
    }
    if (data.selfEncryptionKey) {
      await this.saveSelfEncryptionKeyRaw(b642ab(data.selfEncryptionKey));
    }
    if (data.ecdhKeyPair) {
      await this.saveECDHKeyPair(data.ecdhKeyPair.pubKey, data.ecdhKeyPair.privKey);
    }
  }

  // ——— Paire de clés P-256 ECDH (chiffrement direct) ———

  async getECDHKeyPair(): Promise<{ pubKey: string; privKey: string } | null> {
    const row = await dbGet<any>(STORES.config, 'ecdhKeyPair');
    return row?.value ?? null;
  }

  async saveECDHKeyPair(pubKeyB64: string, privKeyB64: string): Promise<void> {
    await dbPut(STORES.config, { key: 'ecdhKeyPair', value: { pubKey: pubKeyB64, privKey: privKeyB64 } });
  }

  // ——— Clé AES-GCM pour la copie expéditeur (senderContent) ———

  async getSelfEncryptionKeyRaw(): Promise<ArrayBuffer | null> {
    const row = await dbGet<any>(STORES.config, 'selfEncryptionKey');
    if (!row?.value) return null;
    return b642ab(row.value);
  }

  async saveSelfEncryptionKeyRaw(rawKey: ArrayBuffer): Promise<void> {
    await dbPut(STORES.config, { key: 'selfEncryptionKey', value: ab2b64(rawKey) });
  }

  // ——— Nettoyage complet (déconnexion / changement de compte) ———

  async clear(): Promise<void> {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(Object.values(STORES), 'readwrite');
      let pending = Object.values(STORES).length;
      const done = () => { if (--pending === 0) resolve(); };
      for (const store of Object.values(STORES)) {
        const req = tx.objectStore(store).clear();
        req.onsuccess = done;
        req.onerror = () => reject(req.error);
      }
    });
    _db = null;
  }
}

// Singleton partagé dans toute l'application
export const signalStore = new SignalProtocolStore();

// ——— Type exporté utilisé par signal-service.ts ———
export interface PrivateBundleData {
  identityKeyPair: { pubKey: string; privKey: string };
  registrationId: number;
  /** signature?: base64 de la signature du signed prekey (pour re-publication sans mot de passe) */
  signedPreKeys: Array<{ keyId: number; pubKey: string; privKey: string; signature?: string }>;
  preKeys: Array<{ keyId: number; pubKey: string; privKey: string }>;
  sessions: Array<{ identifier: string; session: unknown }>;
  selfEncryptionKey?: string; // base64 AES-256-GCM raw key
  ecdhKeyPair?: { pubKey: string; privKey: string }; // base64 P-256 keypair
}
