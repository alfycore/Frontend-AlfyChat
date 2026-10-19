/**
 * Frontière réseau → types guild. Tolérant aux variantes camelCase /
 * snake_case et aux enveloppes `{ payload }` de la passerelle.
 */

import { resolveMediaUrl } from '@/lib/api';
import { toAlfyUser, toPresence } from '@/components/alfy/live/map';
import { normalizeBits } from '@/components/alfy/guild/perms';
import type {
  GuildChannel,
  GuildChannelType,
  GuildInfo,
  GuildMember,
  GuildRole,
  VoiceMember,
} from '@/components/alfy/guild/types';

// Charges réseau hétérogènes (camelCase / snake_case) : lues champ par champ.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

const pick = <T,>(o: Raw | null | undefined, ...keys: string[]): T | undefined => {
  if (!o) return undefined;
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k] as T;
  return undefined;
};

export const unwrapPayload = (data: unknown): Raw => {
  const o = data as Raw;
  return (o?.payload ?? o) as Raw;
};

/** Liste d'une réponse `{ channels: [...] }`, `{ roles }`… ou d'un tableau nu. */
export function listOf(data: unknown, key: string): Raw[] {
  if (Array.isArray(data)) return data as Raw[];
  const o = data as Raw | null;
  const inner = o?.[key] ?? o?.data?.[key] ?? o?.data;
  return Array.isArray(inner) ? (inner as Raw[]) : [];
}

const KNOWN_TYPES: GuildChannelType[] = [
  'text', 'voice', 'announcement', 'forum', 'stage', 'gallery', 'media', 'doc',
  'poll', 'counting', 'minigame', 'trivia', 'suggestion', 'vent', 'thread', 'category',
];

export function normalizeChannel(raw: Raw, serverId: string): GuildChannel {
  const type = pick<string>(raw, 'type') ?? 'text';
  return {
    id: pick<string>(raw, 'id', 'channelId') ?? '',
    serverId: pick<string>(raw, 'serverId', 'server_id') ?? serverId,
    name: pick<string>(raw, 'name') ?? '',
    type: (KNOWN_TYPES.includes(type as GuildChannelType) ? type : 'text') as GuildChannelType,
    position: Number(pick(raw, 'position') ?? 0),
    parentId: pick<string>(raw, 'parentId', 'parent_id') ?? null,
    topic: pick<string>(raw, 'topic') ?? undefined,
    isNsfw: Boolean(pick(raw, 'isNsfw', 'is_nsfw', 'nsfw')),
    slowMode: Number(pick(raw, 'slowMode', 'slow_mode') ?? 0) || 0,
    userLimit: Number(pick(raw, 'userLimit', 'user_limit') ?? 0) || 0,
  };
}

/** Fusionne un patch (évènement partiel) dans un salon connu. */
export function mergeChannel(prev: GuildChannel, raw: Raw): GuildChannel {
  const next = normalizeChannel({ ...prev, ...raw }, prev.serverId);
  return { ...prev, ...next };
}

export function normalizeRole(raw: Raw, index = 0): GuildRole {
  const name = pick<string>(raw, 'name') ?? 'Rôle';
  const isDefault = Boolean(pick(raw, 'isDefault', 'is_default')) || name === '@everyone';
  return {
    id: pick<string>(raw, 'id', 'roleId') ?? '',
    name: isDefault ? '@everyone' : name,
    color: (pick<string>(raw, 'color') ?? '#99aab5').toLowerCase(),
    permissions: normalizeBits(pick(raw, 'permissions')),
    position: Number(pick(raw, 'position') ?? index),
    isDefault,
    hoist: Boolean(pick(raw, 'hoist', 'hoisted', 'displaySeparately')),
    mentionable: Boolean(pick(raw, 'mentionable')),
    iconEmoji: pick<string>(raw, 'iconEmoji', 'icon_emoji', 'emoji') ?? null,
  };
}

function parseIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeMember(raw: Raw, defaultRoleId?: string | null): GuildMember {
  const id = pick<string>(raw, 'userId', 'user_id', 'id') ?? '';
  const user = toAlfyUser(raw, id);
  user.id = id;
  user.status = toPresence(pick(raw, 'status') ?? (pick(raw, 'isOnline', 'is_online') ? 'online' : 'offline'));
  const nickname = pick<string>(raw, 'nickname') ?? undefined;
  // `toAlfyUser` prend le pseudo de serveur comme nom affiché : on garde le
  // nom global, le pseudo vit à part (comme Discord).
  user.displayName = pick<string>(raw, 'displayName', 'display_name') ?? user.username;
  return {
    userId: id,
    roleIds: parseIds(pick(raw, 'roleIds', 'role_ids')).filter((r) => r !== defaultRoleId),
    nickname: nickname || undefined,
    joinedAt: pick<string>(raw, 'joinedAt', 'joined_at') ?? new Date().toISOString(),
    user,
  };
}

export function normalizeInfo(raw: Raw, serverId: string, previous?: GuildInfo): GuildInfo {
  const icon = pick<string>(raw, 'iconUrl', 'icon_url');
  const banner = pick<string>(raw, 'bannerUrl', 'banner_url');
  const online = pick<boolean>(raw, 'nodeOnline', 'node_online');
  return {
    id: serverId,
    name: pick<string>(raw, 'name') ?? previous?.name ?? '',
    iconUrl: icon ? resolveMediaUrl(icon) : previous?.iconUrl,
    bannerUrl: banner ? resolveMediaUrl(banner) : previous?.bannerUrl,
    description: pick<string>(raw, 'description') ?? previous?.description,
    ownerId: pick<string>(raw, 'ownerId', 'owner_id') ?? previous?.ownerId ?? '',
    isPublic: Boolean(pick(raw, 'isPublic', 'is_public') ?? previous?.isPublic ?? false),
    nodeOnline: typeof online === 'boolean' ? online : (previous?.nodeOnline ?? null),
    selfHosted:
      pick<string>(raw, 'hostingType', 'hosting_type') === 'self_hosted' ||
      Boolean(pick(raw, 'selfHosted', 'self_hosted') ?? previous?.selfHosted),
    hostingType: pick(raw, 'hostingType', 'hosting_type') ?? previous?.hostingType,
    hostingCategory: pick(raw, 'category') ?? previous?.hostingCategory,
    maxMembers: pick<number>(raw, 'maxMembers', 'max_members') ?? previous?.maxMembers,
    verificationLevel: pick(raw, 'verificationLevel', 'verification_level') ?? previous?.verificationLevel,
    memberCount: Array.isArray(raw?.members) ? raw.members.length : previous?.memberCount,
  };
}

export function normalizeVoiceMember(raw: Raw): VoiceMember {
  const avatar = pick<string>(raw, 'avatarUrl', 'avatar_url');
  const username = pick<string>(raw, 'username') ?? '';
  return {
    userId: pick<string>(raw, 'userId', 'id') ?? '',
    username,
    displayName: pick<string>(raw, 'displayName', 'display_name') ?? username,
    avatarUrl: avatar ? resolveMediaUrl(avatar) : undefined,
    muted: Boolean(pick(raw, 'muted')),
    deafened: Boolean(pick(raw, 'deafened')),
    video: Boolean(pick(raw, 'video')),
    streaming: Boolean(pick(raw, 'streaming')),
    serverMuted: Boolean(pick(raw, 'serverMuted')),
    serverDeafened: Boolean(pick(raw, 'serverDeafened')),
    joinedAt: Number(pick(raw, 'joinedAt')) || null,
  };
}
