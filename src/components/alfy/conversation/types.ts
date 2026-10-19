/**
 * Types du module conversation (MP et groupes).
 *
 * Un message affiché porte son état de chiffrement (`crypto`) et d'envoi
 * (`status`) : l'interface ne devine jamais à partir du texte (« 🔒 … ») si
 * un message est lisible, en attente ou en échec.
 */

import type { CryptoState, LockReason } from '@/lib/e2ee/codec';

export type ConversationKind = 'dm' | 'group';

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface ChatMessage {
  /** Id serveur, ou `local:<nonce>` tant que l'accusé n'est pas arrivé. */
  id: string;
  conversationId: string;
  authorId: string;
  content: string;
  createdAt: string;
  editedAt?: string;
  replyToId?: string;
  reactions: Reaction[];
  crypto: CryptoState;
  lockReason?: LockReason;
  status: 'sent' | 'sending' | 'failed';
  /** Message en attente / en échec : identifiant de corrélation avec l'accusé. */
  nonce?: string;
  /** Raison lisible d'un échec d'envoi. */
  error?: string;
}

export interface ThreadState {
  /** Triés du plus ancien au plus récent. */
  messages: ChatMessage[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** Affiché depuis le coffre local, en attente de la synchro réseau. */
  fromVault: boolean;
  hasMore: boolean;
  loadingOlder: boolean;
  error?: string;
  syncedAt?: number;
}

/** Ce qu'il faut pour chiffrer et afficher une conversation de groupe. */
export interface GroupMeta {
  id: string;
  name: string;
  avatarUrl?: string;
  ownerId?: string;
  isOpen: boolean;
  memberIds: string[];
  /** Rôles éventuels (owner / admin / member). */
  roles: Record<string, string>;
  loadedAt: number;
}

/** Cible d'une conversation, telle que la vue la connaît. */
export type ConversationRef =
  | { kind: 'dm'; conversationId: string; peerId: string }
  | { kind: 'group'; conversationId: string };

export const dmConversationId = (a: string, b: string) => {
  const [x, y] = [a, b].sort();
  return `dm_${x}_${y}`;
};

export const isLocalId = (id: string) => id.startsWith('local:');
