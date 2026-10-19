/**
 * Coffre local des messages déjà déchiffrés (IndexedDB, chiffré au repos).
 *
 * Pourquoi : déchiffrer coûte (ECDH + AES par message), et l'ancien format
 * Signal Double Ratchet ne se lit qu'UNE fois — sans copie locale, ces
 * messages devenaient illisibles au rechargement. Ici, tout message lu une
 * fois est gardé, et le fil s'affiche avant même la première requête réseau.
 *
 * Pourquoi c'est sûr : rien n'est écrit en clair sur le disque. Chaque entrée
 * est chiffrée AES-256-GCM avec une clé NON EXTRACTIBLE générée sur l'appareil
 * (un `CryptoKey` conservé tel quel dans IndexedDB : même un script de la page
 * ne peut pas en lire les octets). L'identifiant du message est la donnée
 * associée de chaque entrée : impossible d'en échanger deux. Une base par
 * compte, effacée à la déconnexion (`vault.wipe()`).
 *
 * Sans IndexedDB (navigation privée stricte, quota) : tout devient un no-op,
 * l'application redéchiffre simplement depuis le réseau.
 */

import { fromUtf8, utf8 } from '@/lib/e2ee/bytes';

/** Ce qu'on garde d'un message déchiffré — de quoi le réafficher sans réseau. */
export interface VaultMessage {
  id: string;
  conversationId: string;
  authorId: string;
  content: string;
  createdAt: string;
  editedAt?: string;
  replyToId?: string;
  /** Empreinte du ciphertext serveur : si elle change (édition), on redéchiffre. */
  sig: string;
}

/** Clé de contact vue pour la première fois (détection d'un changement de clé). */
export interface TrustRecord {
  userId: string;
  ecdhKey: string;
  firstSeenAt: number;
  /** Empreinte comparée de vive voix / par QR. */
  verifiedAt?: number;
}

interface StoredMessage {
  id: string;
  c: string;
  t: number;
  iv: Uint8Array<ArrayBuffer>;
  d: ArrayBuffer;
}

const DB_PREFIX = 'alfychat-vault-v1:';
const MAX_PER_CONVERSATION = 5000;

let db: IDBDatabase | null = null;
let dbName: string | null = null;
let vaultKey: CryptoKey | null = null;
let opening: Promise<boolean> | null = null;
/** Lectures déjà faites pendant la session (évite de redéchiffrer depuis IDB). */
const memory = new Map<string, VaultMessage>();

const req = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

const txDone = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('keys', { keyPath: 'name' });
      const m = d.createObjectStore('messages', { keyPath: 'id' });
      m.createIndex('byConv', ['c', 't']);
      d.createObjectStore('trust', { keyPath: 'userId' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function seal(id: string, value: Omit<VaultMessage, 'id'>): Promise<Pick<StoredMessage, 'iv' | 'd'>> {
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const d = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: utf8(id) }, vaultKey!, utf8(JSON.stringify(value)));
  return { iv, d };
}

async function unseal(row: StoredMessage): Promise<VaultMessage | null> {
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: row.iv, additionalData: utf8(row.id) }, vaultKey!, row.d);
    return { id: row.id, ...(JSON.parse(fromUtf8(plain)) as Omit<VaultMessage, 'id'>) };
  } catch {
    return null; // entrée corrompue ou d'une autre clé : ignorée
  }
}

export const vault = {
  /** Ouvre le coffre du compte (idempotent). Renvoie false si IndexedDB est indisponible. */
  open(userId: string): Promise<boolean> {
    const name = DB_PREFIX + userId;
    if (db && dbName === name && vaultKey) return Promise.resolve(true);
    if (opening && dbName === name) return opening;
    dbName = name;
    memory.clear();
    opening = (async () => {
      try {
        if (typeof indexedDB === 'undefined') return false;
        db?.close();
        db = await openDb(name);
        const tx = db.transaction('keys', 'readwrite');
        const store = tx.objectStore('keys');
        const row = (await req(store.get('vault'))) as { name: string; key: CryptoKey } | undefined;
        if (row?.key) {
          vaultKey = row.key;
        } else {
          vaultKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
          // Nouvelle transaction : l'attente de generateKey a refermé la précédente.
          const tx2 = db.transaction('keys', 'readwrite');
          tx2.objectStore('keys').put({ name: 'vault', key: vaultKey });
          await txDone(tx2);
        }
        return true;
      } catch {
        db = null;
        vaultKey = null;
        return false;
      } finally {
        opening = null;
      }
    })();
    return opening;
  },

  get ready(): boolean {
    return Boolean(db && vaultKey);
  },

  /** Messages connus parmi `ids` (mémoire d'abord, puis disque). */
  async getMany(ids: string[]): Promise<Map<string, VaultMessage>> {
    const out = new Map<string, VaultMessage>();
    const missing: string[] = [];
    for (const id of ids) {
      const m = memory.get(id);
      if (m) out.set(id, m);
      else missing.push(id);
    }
    if (!db || !vaultKey || missing.length === 0) return out;
    try {
      const tx = db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const rows = await Promise.all(missing.map((id) => req(store.get(id) as IDBRequest<StoredMessage | undefined>)));
      const opened = await Promise.all(rows.map((r) => (r ? unseal(r) : Promise.resolve(null))));
      for (const m of opened) {
        if (!m) continue;
        memory.set(m.id, m);
        out.set(m.id, m);
      }
    } catch {
      /* lecture impossible : on redéchiffrera */
    }
    return out;
  },

  /**
   * Les `limit` derniers messages d'une conversation (ou ceux d'avant
   * `beforeIso`), du plus ancien au plus récent. Sert aussi d'archive : un
   * message que le serveur ne renvoie plus reste lisible sur cet appareil.
   */
  async recent(conversationId: string, limit = 50, beforeIso?: string): Promise<VaultMessage[]> {
    if (!db || !vaultKey) return [];
    try {
      const tx = db.transaction('messages', 'readonly');
      const index = tx.objectStore('messages').index('byConv');
      const upper = beforeIso ? (Date.parse(beforeIso) || 0) - 1 : Infinity;
      const range = IDBKeyRange.bound([conversationId, -Infinity], [conversationId, upper]);
      const rows: StoredMessage[] = [];
      await new Promise<void>((resolve, reject) => {
        const cursor = index.openCursor(range, 'prev');
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (!c || rows.length >= limit) return resolve();
          rows.push(c.value as StoredMessage);
          c.continue();
        };
        cursor.onerror = () => reject(cursor.error);
      });
      const opened = (await Promise.all(rows.map(unseal))).filter((m): m is VaultMessage => Boolean(m));
      for (const m of opened) memory.set(m.id, m);
      return opened.reverse();
    } catch {
      return [];
    }
  },

  async putMany(messages: VaultMessage[]): Promise<void> {
    for (const m of messages) memory.set(m.id, m);
    if (!db || !vaultKey || messages.length === 0) return;
    try {
      const sealed = await Promise.all(
        messages.map(async ({ id, ...rest }) => ({ id, c: rest.conversationId, t: Date.parse(rest.createdAt) || 0, ...(await seal(id, rest)) })),
      );
      const tx = db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');
      for (const row of sealed) store.put(row);
      await txDone(tx);
    } catch {
      /* quota / base fermée : la mémoire suffit pour la session */
    }
  },

  async remove(ids: string[]): Promise<void> {
    for (const id of ids) memory.delete(id);
    if (!db || ids.length === 0) return;
    try {
      const tx = db.transaction('messages', 'readwrite');
      for (const id of ids) tx.objectStore('messages').delete(id);
      await txDone(tx);
    } catch {
      /* ignoré */
    }
  },

  /** Garde au plus MAX_PER_CONVERSATION messages par conversation (les plus récents). */
  async prune(conversationId: string): Promise<void> {
    if (!db) return;
    try {
      const tx = db.transaction('messages', 'readwrite');
      const done = txDone(tx);
      const index = tx.objectStore('messages').index('byConv');
      const range = IDBKeyRange.bound([conversationId, -Infinity], [conversationId, Infinity]);
      let seen = 0;
      await new Promise<void>((resolve, reject) => {
        const cursor = index.openCursor(range, 'prev');
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (!c) return resolve();
          if (++seen > MAX_PER_CONVERSATION) {
            memory.delete((c.value as StoredMessage).id);
            c.delete();
          }
          c.continue();
        };
        cursor.onerror = () => reject(cursor.error);
      });
      await done;
    } catch {
      /* ignoré */
    }
  },

  /* ── Clés de contact vues (confiance au premier usage) ─────────────────── */

  async trustGet(userId: string): Promise<TrustRecord | null> {
    if (!db) return null;
    try {
      const tx = db.transaction('trust', 'readonly');
      return ((await req(tx.objectStore('trust').get(userId))) as TrustRecord | undefined) ?? null;
    } catch {
      return null;
    }
  },

  async trustPut(record: TrustRecord): Promise<void> {
    if (!db) return;
    try {
      const tx = db.transaction('trust', 'readwrite');
      tx.objectStore('trust').put(record);
      await txDone(tx);
    } catch {
      /* ignoré */
    }
  },

  /** Efface TOUT le coffre de ce compte (déconnexion). */
  async wipe(): Promise<void> {
    memory.clear();
    const name = dbName;
    db?.close();
    db = null;
    vaultKey = null;
    dbName = null;
    if (!name || typeof indexedDB === 'undefined') return;
    await new Promise<void>((resolve) => {
      const r = indexedDB.deleteDatabase(name);
      r.onsuccess = r.onerror = r.onblocked = () => resolve();
    });
  },
};
