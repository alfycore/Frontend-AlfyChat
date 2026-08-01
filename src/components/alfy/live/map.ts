/**
 * Mappers « données réelles → types alfy ».
 * Unique frontière entre les shapes de l'API/WS et les composants
 * présentationnels alfy. Tolérant aux variantes camelCase / snake_case
 * renvoyées par la passerelle.
 */

import { resolveMediaUrl } from '@/lib/api';
import type { CachedConversation } from '@/lib/conversations-store';
import type {
  AlfyAttachment,
  AlfyBadge,
  AlfyChannel,
  AlfyChannelType,
  AlfyDM,
  AlfyMessage,
  AlfyPresence,
  AlfyReaction,
  AlfyRole,
  AlfyUser,
} from '@/components/alfy/mock/types';

/* ── Utilitaires ─────────────────────────────────────────────────────────── */

type Raw = Record<string, any>;

/** Lit la première clé présente (gère camelCase / snake_case). */
const pick = <T,>(o: Raw | null | undefined, ...keys: string[]): T | undefined => {
  if (!o) return undefined;
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k] as T;
  return undefined;
};

/** Déballe les enveloppes `{ payload: … }` des events WS. */
export const unwrap = (data: unknown): Raw => {
  const o = data as Raw;
  return (o?.payload ?? o) as Raw;
};

const PRESENCES: AlfyPresence[] = ['online', 'idle', 'dnd', 'invisible', 'offline'];
export const toPresence = (s: unknown): AlfyPresence =>
  PRESENCES.includes(s as AlfyPresence) ? (s as AlfyPresence) : 'offline';

/** Types de salon connus côté alfy ; tout le reste retombe sur `text`. */
const CHANNEL_TYPES: AlfyChannelType[] = [
  'text', 'voice', 'announcement', 'forum', 'gallery', 'media', 'doc',
  'poll', 'counting', 'minigame', 'trivia', 'suggestion', 'vent',
];
export const toChannelType = (t: unknown): AlfyChannelType =>
  CHANNEL_TYPES.includes(t as AlfyChannelType) ? (t as AlfyChannelType) : 'text';

/* ── Utilisateurs ────────────────────────────────────────────────────────── */

function toAlfyBadges(raw: unknown): AlfyBadge[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((b: Raw) => ({
      id: pick<string>(b, 'id') ?? '',
      name: pick<string>(b, 'name') ?? '',
      icon: pick<string>(b, 'icon') ?? '🏅',
      iconType: pick<AlfyBadge['iconType']>(b, 'iconType', 'icon_type'),
      iconValue: pick<string>(b, 'iconValue', 'icon_value'),
      color: pick<string>(b, 'color') ?? '#94a3b8',
    }))
    .filter((b) => b.id);
}

export function toAlfyUser(raw: Raw | null | undefined, fallbackId = 'unknown'): AlfyUser {
  const id = pick<string>(raw, 'id', 'userId', 'user_id') ?? fallbackId;
  const username = pick<string>(raw, 'username') ?? 'inconnu';
  const avatar = pick<string>(raw, 'avatarUrl', 'avatar_url', 'avatar');
  const bannerRaw = pick<string>(raw, 'bannerUrl', 'banner_url');
  return {
    id,
    username,
    displayName: pick<string>(raw, 'displayName', 'display_name', 'nickname') ?? username,
    avatarUrl: avatar ? resolveMediaUrl(avatar) : undefined,
    bannerUrl: bannerRaw ? resolveMediaUrl(bannerRaw) : undefined,
    bannerColor: pick<string>(raw, 'bannerColor', 'cardColor', 'card_color'),
    bio: pick<string>(raw, 'bio'),
    status: toPresence(pick(raw, 'status', 'presence')),
    customStatus: pick<string>(raw, 'customStatus', 'custom_status') ?? undefined,
    statusEmoji: pick<string>(raw, 'emoji', 'statusEmoji') ?? undefined,
    lastSeenAt: pick<string>(raw, 'lastSeenAt', 'last_seen_at'),
    isBot: Boolean(pick(raw, 'isBot', 'is_bot')),
    isVerifiedBot: Boolean(pick(raw, 'isVerifiedBot', 'is_verified_bot')),
    badges: toAlfyBadges(pick(raw, 'badges')),
    createdAt: pick<string>(raw, 'createdAt', 'created_at') ?? new Date().toISOString(),
  };
}

/* ── Salons ──────────────────────────────────────────────────────────────── */

export interface RawChannel {
  id: string;
  name: string;
  type: string;
  position?: number;
  parentId?: string | null;
}

/** Normalise un salon brut (WS ou REST) — conserve `type` tel quel. */
export function normalizeChannel(raw: Raw): RawChannel {
  return {
    id: pick<string>(raw, 'id') ?? '',
    name: pick<string>(raw, 'name') ?? '',
    type: pick<string>(raw, 'type') ?? 'text',
    position: pick<number>(raw, 'position') ?? 0,
    parentId: pick<string>(raw, 'parentId', 'parent_id') ?? null,
  };
}

export function toAlfyChannel(
  ch: RawChannel,
  serverId: string,
  counters?: { unread?: number; mentions?: number },
): AlfyChannel {
  return {
    id: ch.id,
    serverId,
    name: ch.name,
    type: toChannelType(ch.type),
    categoryId: ch.parentId ?? null,
    unreadCount: counters?.unread ?? 0,
    mentionCount: counters?.mentions ?? 0,
  };
}

/* ── Rôles & membres ─────────────────────────────────────────────────────── */

export function toAlfyRole(raw: Raw, index = 0): AlfyRole {
  return {
    id: pick<string>(raw, 'id') ?? '',
    name: pick<string>(raw, 'name') ?? 'Rôle',
    color: pick<string>(raw, 'color') ?? '#94a3b8',
    emoji: pick<string>(raw, 'emoji') ?? undefined,
    permissions: Number(pick(raw, 'permissions') ?? 0),
    hoisted: Boolean(pick(raw, 'hoisted', 'hoist', 'displaySeparately')),
    position: Number(pick(raw, 'position') ?? index),
  };
}

/* ── Messages ────────────────────────────────────────────────────────────── */

function toReactions(raw: unknown, currentUserId: string): AlfyReaction[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: Raw) => {
      const userIds: string[] = pick<string[]>(r, 'userIds', 'user_ids') ?? [];
      const count = Number(pick(r, 'count') ?? userIds.length ?? 0);
      return {
        emoji: pick<string>(r, 'emoji') ?? '',
        count,
        me: userIds.includes(currentUserId),
      };
    })
    .filter((r) => r.emoji && r.count > 0);
}

/**
 * Extrait les lignes `[attach:img]:<url>` / `[attach:file]:<nom>|<url>` du
 * contenu (convention partagée avec components/chat/message-item.tsx) et
 * renvoie le texte restant + les pièces jointes typées.
 */
function extractAttachments(content: string, messageId: string): { text: string; attachments: AlfyAttachment[] } {
  const lines = content.split('\n');
  const textLines: string[] = [];
  const attachments: AlfyAttachment[] = [];
  let i = 0;
  for (const line of lines) {
    if (line.startsWith('[attach:img]:')) {
      const url = line.slice('[attach:img]:'.length).trim();
      attachments.push({
        id: `${messageId}-att-${i++}`,
        name: url.split('/').pop() || 'image',
        size: 0,
        mimeType: 'image/*',
        url: resolveMediaUrl(url),
      });
    } else if (line.startsWith('[attach:file]:')) {
      const rest = line.slice('[attach:file]:'.length);
      const pipeIdx = rest.indexOf('|');
      const name = pipeIdx >= 0 ? rest.slice(0, pipeIdx) : rest;
      const url = pipeIdx >= 0 ? rest.slice(pipeIdx + 1) : rest;
      attachments.push({
        id: `${messageId}-att-${i++}`,
        name,
        size: 0,
        mimeType: 'application/octet-stream',
        url: resolveMediaUrl(url),
      });
    } else {
      textLines.push(line);
    }
  }
  return { text: textLines.join('\n').trim(), attachments };
}

/**
 * Message réel → `AlfyMessage`. Couvre les messages de serveur
 * (SERVER_MESSAGE_*) et de DM/groupe (hook use-messages).
 */
export function toAlfyMessage(raw: Raw, currentUserId: string, channelId: string): AlfyMessage {
  const sender = pick<Raw>(raw, 'sender', 'author');
  const authorId =
    pick<string>(raw, 'authorId', 'author_id', 'senderId', 'sender_id') ??
    pick<string>(sender, 'id') ??
    '';
  // `updatedAt` est un timestamp générique (bouge aussi sur réactions, pin…) :
  // seul le flag explicite `isEdited` doit décider de l'affichage « (modifié) ».
  const isEdited = Boolean(pick(raw, 'isEdited', 'is_edited'));
  const editedAt = pick<string>(raw, 'updatedAt', 'updated_at', 'editedAt');
  const id = pick<string>(raw, 'id') ?? '';
  const { text, attachments } = extractAttachments(pick<string>(raw, 'content') ?? '', id);

  return {
    id,
    channelId: pick<string>(raw, 'channelId', 'channel_id') ?? channelId,
    authorId,
    content: text,
    createdAt: pick<string>(raw, 'createdAt', 'created_at') ?? new Date().toISOString(),
    editedAt: isEdited ? editedAt : undefined,
    // Le flag vient du déchiffrement Signal (use-messages) ; sinon non chiffré.
    encrypted: Boolean(pick(raw, 'e2ee')),
    reactions: toReactions(pick(raw, 'reactions'), currentUserId),
    replyToId: pick<string>(raw, 'replyToId', 'reply_to_id') ?? undefined,
    pinned: Boolean(pick(raw, 'pinned', 'isPinned')),
    attachments,
    mentions: [],
  };
}

/* ── Conversations (DM) ──────────────────────────────────────────────────── */

export function toAlfyDM(c: CachedConversation, unread = 0): AlfyDM {
  return {
    id: c.id,
    recipientId: c.recipientId,
    lastMessage: c.lastMessage ?? '',
    lastMessageAt: c.lastMessageAt ?? new Date().toISOString(),
    unreadCount: unread,
  };
}

/**
 * Utilisateur alfy dérivé d'une conversation.
 * `recipientName` peut manquer tant que le profil n'est pas résolu :
 * on garantit toujours un nom affichable.
 */
export function conversationUser(c: CachedConversation, status: AlfyPresence): AlfyUser {
  const name = c.recipientName?.trim() || 'Utilisateur';
  return {
    id: c.recipientId,
    username: name,
    displayName: name,
    avatarUrl: c.recipientAvatar ? resolveMediaUrl(c.recipientAvatar) : undefined,
    status,
    badges: [],
    createdAt: new Date().toISOString(),
  };
}
