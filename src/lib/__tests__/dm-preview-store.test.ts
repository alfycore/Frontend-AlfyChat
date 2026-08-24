/**
 * Aperçus déchiffrés de la liste de MP.
 *
 * L'invariant le plus important est le troisième bloc : le format Signal
 * Double Ratchet ne doit JAMAIS être déchiffré ici. Chaque déchiffrement y
 * consomme un pas de ratchet, donc un aperçu rendrait le message illisible à
 * l'ouverture de la conversation — une perte de données irréversible.
 *
 * Lancer : bun test
 */
import { describe, expect, it, beforeEach, mock } from 'bun:test';

let appels: Array<{ senderId: string; content: string; senderContent?: string }> = [];

mock.module('@/lib/signal-service', () => ({
  signalService: {
    decrypt: async (
      senderId: string,
      _currentUserId: string,
      content: string,
      senderContent: string | undefined,
    ) => {
      appels.push({ senderId, content, senderContent });
      await new Promise((r) => setTimeout(r, 1));
      const utilise = senderContent ?? content;
      if (utilise.includes('sanscle')) return '[Message non disponible — clé ECDH introuvable]';
      return `clair(${utilise})`;
    },
  },
}));

const { ensurePreviews, getPreview, clearPreviews, subscribePreviews } = await import(
  '../dm-preview-store'
);

const MOI = 'moi-11111111';
const AUTRE = 'autre-22222222';

const source = (over: Partial<Parameters<typeof ensurePreviews>[0][number]> = {}) => ({
  messageId: `m-${Math.random().toString(36).slice(2)}`,
  senderId: AUTRE,
  content: 'ecdh:eph:iv:ct',
  senderContent: null,
  e2eeType: 1,
  ...over,
});

beforeEach(() => {
  appels = [];
  clearPreviews();
});

describe('choix de la copie à déchiffrer', () => {
  it('message reçu → utilise `content`', async () => {
    const s = source({ senderId: AUTRE, content: 'ecdh:recu' });
    await ensurePreviews([s], MOI);
    expect(getPreview(s.messageId)).toBe('clair(ecdh:recu)');
  });

  it('message envoyé par moi → utilise `senderContent`', async () => {
    const s = source({
      senderId: MOI,
      content: 'ecdh:pour-lautre',
      senderContent: 'ecdh:pour-moi',
    });
    await ensurePreviews([s], MOI);
    expect(getPreview(s.messageId)).toBe('clair(ecdh:pour-moi)');
  });

  it('copie expéditeur au format aes: acceptée aussi', async () => {
    const s = source({ senderId: MOI, content: 'ecdh:x', senderContent: 'aes:local' });
    await ensurePreviews([s], MOI);
    expect(getPreview(s.messageId)).toBe('clair(aes:local)');
  });
});

describe('formats à état — jamais déchiffrés', () => {
  it('ancien format Signal reçu : aucun appel de déchiffrement', async () => {
    const s = source({ senderId: AUTRE, content: 'MwohBXk1c2lnbmFsLWxlZ2FjeQ==', e2eeType: 3 });
    await ensurePreviews([s], MOI);
    expect(appels).toHaveLength(0);
    expect(getPreview(s.messageId)).toBeNull();
  });

  it('message envoyé sans copie expéditeur : aucun appel', async () => {
    const s = source({ senderId: MOI, content: 'ecdh:pour-lautre', senderContent: null });
    await ensurePreviews([s], MOI);
    expect(appels).toHaveLength(0);
  });

  it('contenu vide : aucun appel', async () => {
    const s = source({ content: '' });
    await ensurePreviews([s], MOI);
    expect(appels).toHaveLength(0);
  });
});

describe('lots de 10', () => {
  it('25 conversations → 3 lots, tout est déchiffré', async () => {
    const lots: number[] = [];
    const stop = subscribePreviews(() => lots.push(appels.length));

    const sources = Array.from({ length: 25 }, (_, i) =>
      source({ messageId: `m${i}`, content: `ecdh:msg${i}` }),
    );
    await ensurePreviews(sources, MOI);
    stop();

    // Une notification par lot : 10 + 10 + 5.
    expect(lots).toEqual([10, 20, 25]);
    expect(appels).toHaveLength(25);
    expect(getPreview('m0')).toBe('clair(ecdh:msg0)');
    expect(getPreview('m24')).toBe('clair(ecdh:msg24)');
  });
});

describe('cache', () => {
  it('un deuxième passage ne redéchiffre rien', async () => {
    const s = source({ messageId: 'stable' });
    await ensurePreviews([s], MOI);
    expect(appels).toHaveLength(1);
    await ensurePreviews([s], MOI);
    expect(appels).toHaveLength(1);
  });

  it('un échec n’est pas retenté indéfiniment', async () => {
    const s = source({ messageId: 'ko', content: 'ecdh:sanscle' });
    await ensurePreviews([s], MOI);
    expect(getPreview('ko')).toBeNull();
    await ensurePreviews([s], MOI);
    expect(appels).toHaveLength(1);
  });

  it('clearPreviews purge tout', async () => {
    const s = source({ messageId: 'purge' });
    await ensurePreviews([s], MOI);
    expect(getPreview('purge')).toBeTruthy();
    clearPreviews();
    expect(getPreview('purge')).toBeNull();
  });

  it('sans utilisateur courant, rien ne part', async () => {
    await ensurePreviews([source()], '');
    expect(appels).toHaveLength(0);
  });
});
