/**
 * Vérifie la mutualisation des requêtes d'amorçage.
 *
 * Le point critique : six composants appellent `loadBootstrap()` au montage
 * (coquille, barre latérale, amis, serveurs, notifications, préchargement).
 * S'ils ne partagent pas la requête en vol, on retombe sur six requêtes — soit
 * exactement le problème que l'amorçage devait supprimer.
 *
 * Lancer : bun test
 */
import { describe, expect, it, beforeEach, mock } from 'bun:test';

let getCalls: string[] = [];

// Stub du client HTTP — on compte les appels réseau réellement émis.
mock.module('@/lib/api', () => ({
  api: {
    get: async (endpoint: string) => {
      getCalls.push(endpoint);
      // Latence simulée : sans elle, les appels « concurrents » se
      // résoudraient séquentiellement et le test ne prouverait rien.
      await new Promise((r) => setTimeout(r, 20));
      if (endpoint.startsWith('/api/bootstrap/dm/')) {
        return {
          success: true,
          data: {
            recipient: { id: 'r1', username: 'bob' },
            blockStatus: { iBlockedThem: false, theyBlockedMe: false },
            keyBundle: { ecdhKey: 'k' },
            messages: [{ id: 'm1' }],
            fetchedAt: Date.now(),
          },
        };
      }
      return {
        success: true,
        data: {
          user: { id: 'u1' },
          servers: [{ id: 's1' }],
          conversations: [
            { id: 'dm_a_b', type: 'dm', recipientId: 'r1', recipientName: 'Bob' },
          ],
          friends: [],
          friendRequests: { received: [], sent: [] },
          blocked: [],
          notifications: {},
          notificationSettings: {},
          preferences: {},
          fetchedAt: Date.now(),
        },
      };
    },
  },
}));

const { loadBootstrap, getBootstrap, clearBootstrap } = await import('../bootstrap-store');
const { loadDmBootstrap, invalidateDmBootstrap } = await import('../dm-bootstrap');

beforeEach(() => {
  getCalls = [];
  clearBootstrap();
});

describe('amorçage de la coquille', () => {
  it('six appels concurrents ne produisent QU’UNE requête', async () => {
    await Promise.all([
      loadBootstrap(),
      loadBootstrap(),
      loadBootstrap(),
      loadBootstrap(),
      loadBootstrap(),
      loadBootstrap(),
    ]);
    expect(getCalls.filter((u) => u === '/api/bootstrap/me')).toHaveLength(1);
  });

  it('un appel ultérieur est servi par le cache, sans requête', async () => {
    await loadBootstrap();
    expect(getCalls).toHaveLength(1);
    await loadBootstrap();
    await loadBootstrap();
    expect(getCalls).toHaveLength(1);
  });

  it('force = true refait bien la requête', async () => {
    await loadBootstrap();
    await loadBootstrap(true);
    expect(getCalls).toHaveLength(2);
  });

  it('expose le profil du destinataire sans appel supplémentaire', async () => {
    await loadBootstrap();
    const boot = getBootstrap();
    expect(boot?.conversations[0].recipientName).toBe('Bob');
    // Aucun getUser : c'est tout l'intérêt.
    expect(getCalls).toHaveLength(1);
  });

  it('clearBootstrap purge le cache', async () => {
    await loadBootstrap();
    clearBootstrap();
    expect(getBootstrap()).toBeNull();
  });
});

describe('amorçage d’une conversation', () => {
  it('quatre consommateurs concurrents ne produisent QU’UNE requête', async () => {
    await Promise.all([
      loadDmBootstrap('r1'),
      loadDmBootstrap('r1'),
      loadDmBootstrap('r1'),
      loadDmBootstrap('r1'),
    ]);
    expect(getCalls.filter((u) => u === '/api/bootstrap/dm/r1')).toHaveLength(1);
  });

  it('porte profil, blocage, trousseau et messages en une fois', async () => {
    const boot = await loadDmBootstrap('r2');
    expect(boot?.recipient).toBeTruthy();
    expect(boot?.blockStatus).toEqual({ iBlockedThem: false, theyBlockedMe: false });
    expect(boot?.keyBundle).toBeTruthy();
    expect(boot?.messages).toHaveLength(1);
    expect(getCalls).toHaveLength(1);
  });

  it('deux destinataires différents = deux requêtes', async () => {
    await Promise.all([loadDmBootstrap('r3'), loadDmBootstrap('r4')]);
    expect(getCalls).toHaveLength(2);
  });

  it('invalidateDmBootstrap force un rechargement après un envoi', async () => {
    await loadDmBootstrap('r5');
    await loadDmBootstrap('r5');
    expect(getCalls).toHaveLength(1);
    invalidateDmBootstrap('r5');
    await loadDmBootstrap('r5');
    expect(getCalls).toHaveLength(2);
  });
});
