/**
 * Enveloppe multi-destinataires `e2e1:` (groupes chiffrés de bout en bout).
 *
 * Vraie WebCrypto, trousseaux générés : seul le magasin de clés est simulé
 * (on « change d'appareil » en changeant la clé locale renvoyée).
 *
 * Lancer : bun test
 */
import { beforeAll, describe, expect, it, mock } from 'bun:test';

type Pair = { pubKey: string; privKey: string };
let localPair: Pair | null = null;

mock.module('@/lib/signal-store', () => ({
  signalStore: { getECDHKeyPair: async () => localPair },
}));

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));

async function newPair(): Promise<Pair> {
  const kp = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  return { pubKey: b64(await crypto.subtle.exportKey('raw', kp.publicKey)), privKey: b64(await crypto.subtle.exportKey('pkcs8', kp.privateKey)) };
}

const { sealEnvelope, openEnvelope, envelopeRecipients, isEnvelope, forgetLocalKey, EnvelopeError } = await import('../e2ee/envelope');

const CONV = 'group-1';
let alice: Pair, bob: Pair, carol: Pair;

beforeAll(async () => {
  [alice, bob, carol] = await Promise.all([newPair(), newPair(), newPair()]);
});

async function as(pair: Pair, fn: () => Promise<string>) {
  localPair = pair;
  forgetLocalKey();
  return fn();
}

async function sealed(text = 'salut le groupe') {
  return sealEnvelope(text, {
    conversationId: CONV,
    senderId: 'alice',
    recipients: [
      { userId: 'alice', ecdhKey: alice.pubKey },
      { userId: 'bob', ecdhKey: bob.pubKey },
    ],
  });
}

describe('aller-retour', () => {
  it('chaque destinataire lit le message, l’expéditeur aussi', async () => {
    const env = await sealed('message secret — accents éàç 🎉');
    expect(isEnvelope(env)).toBe(true);
    expect(envelopeRecipients(env).sort()).toEqual(['alice', 'bob']);
    expect(await as(bob, () => openEnvelope(env, { conversationId: CONV, senderId: 'alice', me: 'bob' }))).toBe('message secret — accents éàç 🎉');
    expect(await as(alice, () => openEnvelope(env, { conversationId: CONV, senderId: 'alice', me: 'alice' }))).toBe('message secret — accents éàç 🎉');
  });

  it('le texte clair n’apparaît nulle part dans l’enveloppe', async () => {
    const env = await sealed('motdepasse-tres-secret');
    expect(env.includes('motdepasse')).toBe(false);
    expect(atob(env.slice(5)).includes('motdepasse')).toBe(false);
  });

  it('deux envois du même texte donnent deux enveloppes différentes', async () => {
    expect(await sealed('pareil')).not.toBe(await sealed('pareil'));
  });
});

describe('refus', () => {
  it('non-membre au moment de l’envoi → not-for-me', async () => {
    const env = await sealed();
    const err = await as(carol, () => openEnvelope(env, { conversationId: CONV, senderId: 'alice', me: 'carol' })).catch((e) => e);
    expect(err).toBeInstanceOf(EnvelopeError);
    expect(err.reason).toBe('not-for-me');
  });

  it('clé locale différente (trousseau régénéré) → tampered', async () => {
    const env = await sealed();
    const err = await as(carol, () => openEnvelope(env, { conversationId: CONV, senderId: 'alice', me: 'bob' })).catch((e) => e);
    expect(err.reason).toBe('tampered');
  });

  it('recollée dans une autre conversation → rejetée', async () => {
    const env = await sealed();
    const err = await as(bob, () => openEnvelope(env, { conversationId: 'group-2', senderId: 'alice', me: 'bob' })).catch((e) => e);
    expect(err.reason).toBe('tampered');
  });

  it('attribuée à un autre auteur → rejetée', async () => {
    const env = await sealed();
    const err = await as(bob, () => openEnvelope(env, { conversationId: CONV, senderId: 'mallory', me: 'bob' })).catch((e) => e);
    expect(err.reason).toBe('tampered');
  });

  it('un octet modifié dans le contenu → rejeté', async () => {
    const env = await sealed();
    const json = JSON.parse(atob(env.slice(5)));
    const ct = atob(json.ct);
    json.ct = btoa(String.fromCharCode(ct.charCodeAt(0) ^ 1) + ct.slice(1));
    const forged = 'e2e1:' + btoa(JSON.stringify(json));
    const err = await as(bob, () => openEnvelope(forged, { conversationId: CONV, senderId: 'alice', me: 'bob' })).catch((e) => e);
    expect(err.reason).toBe('tampered');
  });

  it('sans clé locale → no-key', async () => {
    const env = await sealed();
    localPair = null;
    forgetLocalKey();
    const err = await openEnvelope(env, { conversationId: CONV, senderId: 'alice', me: 'bob' }).catch((e) => e);
    expect(err.reason).toBe('no-key');
  });

  it('charabia → malformed', async () => {
    const err = await as(bob, () => openEnvelope('e2e1:%%%', { conversationId: CONV, senderId: 'alice', me: 'bob' })).catch((e) => e);
    expect(err.reason).toBe('malformed');
  });
});
