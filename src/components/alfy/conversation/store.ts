'use client';

/**
 * Store central des MP et groupes (zustand).
 *
 * Une seule source de vérité, alimentée par `realtime.ts` (un unique jeu
 * d'écouteurs socket, monté par la coquille) et par `engine.ts`. Revenir sur
 * une conversation déjà ouverte est instantané ; un message qui arrive dans
 * une conversation fermée est déjà déchiffré quand on l'ouvre.
 */

import { create } from 'zustand';

import type { ChatMessage, GroupMeta, ThreadState } from '@/components/alfy/conversation/types';

interface ConversationState {
  threads: Record<string, ThreadState>;
  groups: Record<string, GroupMeta>;
  /** conversationId → userId → instant d'expiration de l'indicateur. */
  typing: Record<string, Record<string, number>>;
}

export const useConversationStore = create<ConversationState>()(() => ({
  threads: {},
  groups: {},
  typing: {},
}));

const set = useConversationStore.setState;
const get = useConversationStore.getState;

export const EMPTY_THREAD: ThreadState = {
  messages: [],
  status: 'idle',
  fromVault: false,
  hasMore: false,
  loadingOlder: false,
};

const byTime = (a: ChatMessage, b: ChatMessage) =>
  a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1;

function withThread(id: string, update: (t: ThreadState) => ThreadState) {
  set((s) => ({ threads: { ...s.threads, [id]: update(s.threads[id] ?? EMPTY_THREAD) } }));
}

export const conversationStore = {
  get,
  thread: (id: string): ThreadState => get().threads[id] ?? EMPTY_THREAD,

  patchThread(id: string, patch: Partial<ThreadState>) {
    withThread(id, (t) => ({ ...t, ...patch }));
  },

  /**
   * Fusionne des messages par id. Le plus récent gagne, sauf qu'un message
   * déjà lisible n'est jamais remplacé par une version verrouillée (une
   * synchro sans clé ne doit pas effacer ce que le coffre avait lu).
   */
  mergeMessages(id: string, incoming: ChatMessage[], extra?: Partial<ThreadState>) {
    withThread(id, (t) => {
      const map = new Map(t.messages.map((m) => [m.id, m]));
      for (const m of incoming) {
        const prev = map.get(m.id);
        if (prev && prev.crypto !== 'locked' && m.crypto === 'locked') {
          map.set(m.id, { ...m, content: prev.content, crypto: prev.crypto, lockReason: undefined });
        } else {
          map.set(m.id, prev ? { ...prev, ...m } : m);
        }
      }
      return { ...t, ...extra, messages: [...map.values()].sort(byTime) };
    });
  },

  /** Retire des messages (supprimés côté serveur, ou disparus de la page). */
  removeMessages(id: string, ids: string[]) {
    if (ids.length === 0) return;
    const drop = new Set(ids);
    withThread(id, (t) => ({ ...t, messages: t.messages.filter((m) => !drop.has(m.id)) }));
  },

  patchMessage(id: string, messageId: string, patch: Partial<ChatMessage>) {
    withThread(id, (t) => ({
      ...t,
      messages: t.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)).sort(byTime),
    }));
  },

  /** Remplace le message en attente `nonce` par sa version confirmée. */
  confirmLocal(id: string, nonce: string, confirmed: ChatMessage) {
    withThread(id, (t) => {
      const rest = t.messages.filter((m) => m.nonce !== nonce && m.id !== confirmed.id);
      return { ...t, messages: [...rest, confirmed].sort(byTime) };
    });
  },

  /** Message en attente, où qu'il soit. */
  findByNonce(nonce: string): { conversationId: string; message: ChatMessage } | null {
    for (const [conversationId, t] of Object.entries(get().threads)) {
      const message = t.messages.find((m) => m.nonce === nonce);
      if (message) return { conversationId, message };
    }
    return null;
  },

  /** Conversation d'un message déjà connu. */
  conversationOf(messageId: string): string | null {
    for (const [conversationId, t] of Object.entries(get().threads)) {
      if (t.messages.some((m) => m.id === messageId)) return conversationId;
    }
    return null;
  },

  /** Plus ancien message encore « en cours d'envoi » (erreurs sans corrélation). */
  oldestSending(): { conversationId: string; message: ChatMessage } | null {
    let best: { conversationId: string; message: ChatMessage } | null = null;
    for (const [conversationId, t] of Object.entries(get().threads)) {
      for (const m of t.messages) {
        if (m.status === 'sending' && (!best || m.createdAt < best.message.createdAt)) best = { conversationId, message: m };
      }
    }
    return best;
  },

  /* ── Groupes ─────────────────────────────────────────────────────────── */
  setGroup(meta: GroupMeta) {
    set((s) => ({ groups: { ...s.groups, [meta.id]: meta } }));
  },
  forgetGroup(id: string) {
    set((s) => {
      const groups = { ...s.groups };
      delete groups[id];
      const threads = { ...s.threads };
      delete threads[id];
      return { groups, threads };
    });
  },

  /* ── Frappe ──────────────────────────────────────────────────────────── */
  setTyping(conversationId: string, userId: string, on: boolean) {
    set((s) => {
      const current = { ...(s.typing[conversationId] ?? {}) };
      if (on) current[userId] = Date.now() + 8000;
      else if (!(userId in current)) return s;
      else delete current[userId];
      return { typing: { ...s.typing, [conversationId]: current } };
    });
  },
  /** Retire les indicateurs expirés (un STOP perdu ne fige rien). */
  sweepTyping() {
    const now = Date.now();
    set((s) => {
      let changed = false;
      const typing: ConversationState['typing'] = {};
      for (const [conv, users] of Object.entries(s.typing)) {
        const kept = Object.fromEntries(Object.entries(users).filter(([, until]) => until > now));
        if (Object.keys(kept).length !== Object.keys(users).length) changed = true;
        typing[conv] = kept;
      }
      return changed ? { typing } : s;
    });
  },

  /** Déconnexion : tout oublier. */
  reset() {
    set({ threads: {}, groups: {}, typing: {} });
  },
};
