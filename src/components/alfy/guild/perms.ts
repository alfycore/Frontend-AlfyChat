/**
 * Permissions de serveur — bitmask v2 (« façon Discord »).
 *
 * ⚠ Miroir de gateway/src/utils/permissions.ts et servers/src/permissions.ts :
 *   toute modification doit être reportée dans les trois.
 *
 * KICK/BAN (0x10/0x20) sont l'ancienne paire du microservice, conservée pour
 * les rôles déjà créés : l'interface ne propose que KICK_MEMBERS/BAN_MEMBERS
 * mais lit l'une ou l'autre (voir `hasKick` / `hasBan`).
 */

export const P = {
  READ: 0x1,
  SEND: 0x2,
  REACT: 0x4,
  MANAGE_MESSAGES: 0x8,
  KICK: 0x10,
  BAN: 0x20,
  ADMIN: 0x40,
  MANAGE_CHANNELS: 0x80,
  MANAGE_ROLES: 0x100,
  KICK_MEMBERS: 0x400,
  BAN_MEMBERS: 0x800,
  CONNECT: 0x1000,
  SPEAK: 0x2000,
  VIDEO: 0x4000,
  CREATE_INVITE: 0x8000,
  MANAGE_SERVER: 0x10000,
  MENTION_EVERYONE: 0x20000,
  ATTACH_FILES: 0x40000,
  CHANGE_NICKNAME: 0x80000,
  MANAGE_NICKNAMES: 0x100000,
  MUTE_MEMBERS: 0x200000,
  MOVE_MEMBERS: 0x400000,
  VIEW_AUDIT_LOG: 0x800000,
  MANAGE_EMOJIS: 0x1000000,
  MANAGE_WEBHOOKS: 0x2000000,
  MANAGE_EVENTS: 0x4000000,
} as const;

export type PermKey = keyof typeof P;

/** Tous les bits valides. */
export const ALL_PERMS = 0x7ffffff;
export const KICK_ANY = P.KICK | P.KICK_MEMBERS;
export const BAN_ANY = P.BAN | P.BAN_MEMBERS;

export type PermGroupId = 'general' | 'membership' | 'text' | 'voice' | 'events' | 'advanced';

/** Groupes du sélecteur de permissions, dans l'ordre de Discord. */
export const PERM_GROUPS: { id: PermGroupId; keys: PermKey[] }[] = [
  { id: 'general', keys: ['READ', 'MANAGE_CHANNELS', 'MANAGE_ROLES', 'MANAGE_EMOJIS', 'VIEW_AUDIT_LOG', 'MANAGE_WEBHOOKS', 'MANAGE_SERVER'] },
  { id: 'membership', keys: ['CREATE_INVITE', 'CHANGE_NICKNAME', 'MANAGE_NICKNAMES', 'KICK_MEMBERS', 'BAN_MEMBERS'] },
  { id: 'text', keys: ['SEND', 'ATTACH_FILES', 'REACT', 'MENTION_EVERYONE', 'MANAGE_MESSAGES'] },
  { id: 'voice', keys: ['CONNECT', 'SPEAK', 'VIDEO', 'MUTE_MEMBERS', 'MOVE_MEMBERS'] },
  { id: 'events', keys: ['MANAGE_EVENTS'] },
  { id: 'advanced', keys: ['ADMIN'] },
];

/**
 * Bits qui ont un sens dans une surcharge de salon. Les droits de serveur
 * (gérer le serveur, bannir, pseudos…) n'y figurent pas, comme sur Discord.
 */
export const CHANNEL_SCOPED_KEYS: PermKey[] = [
  'READ', 'MANAGE_CHANNELS', 'MANAGE_ROLES', 'MANAGE_WEBHOOKS', 'CREATE_INVITE',
  'SEND', 'ATTACH_FILES', 'REACT', 'MENTION_EVERYONE', 'MANAGE_MESSAGES',
  'CONNECT', 'SPEAK', 'VIDEO', 'MUTE_MEMBERS', 'MOVE_MEMBERS', 'MANAGE_EVENTS',
];

/** Bits « dangereux » signalés en rouge dans l'éditeur. */
export const DANGEROUS: PermKey[] = ['ADMIN', 'MANAGE_SERVER', 'MANAGE_ROLES', 'BAN_MEMBERS', 'KICK_MEMBERS', 'MANAGE_CHANNELS'];

/** Droits d'un rôle @everyone fraîchement créé. */
export const DEFAULT_EVERYONE =
  P.READ | P.SEND | P.REACT | P.CONNECT | P.SPEAK | P.VIDEO | P.CREATE_INVITE
  | P.ATTACH_FILES | P.CHANGE_NICKNAME | P.MENTION_EVERYONE;

/** Lecture d'un bit en tenant compte d'ADMIN et des paires historiques. */
export function hasPerm(bits: number, key: PermKey): boolean {
  if (bits & P.ADMIN) return true;
  if (key === 'KICK_MEMBERS') return (bits & KICK_ANY) !== 0;
  if (key === 'BAN_MEMBERS') return (bits & BAN_ANY) !== 0;
  return (bits & P[key]) === P[key];
}

/** Bit brut, sans le raccourci ADMIN (pour l'affichage d'un éditeur de rôle). */
export function rawHas(bits: number, key: PermKey): boolean {
  if (key === 'KICK_MEMBERS') return (bits & KICK_ANY) !== 0;
  if (key === 'BAN_MEMBERS') return (bits & BAN_ANY) !== 0;
  return (bits & P[key]) === P[key];
}

/** Active ou coupe un bit (coupe aussi la paire historique). */
export function togglePerm(bits: number, key: PermKey, on: boolean): number {
  const mask = key === 'KICK_MEMBERS' ? KICK_ANY : key === 'BAN_MEMBERS' ? BAN_ANY : P[key];
  return on ? (bits | P[key]) : (bits & ~mask);
}

export function normalizeBits(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw & ALL_PERMS : 0;
  if (Array.isArray(raw)) {
    let bits = 0;
    for (const name of raw) {
      const bit = (P as Record<string, number>)[String(name)];
      if (typeof bit === 'number') bits |= bit;
    }
    return bits;
  }
  if (typeof raw === 'string') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n & ALL_PERMS;
    try {
      return normalizeBits(JSON.parse(raw));
    } catch {
      return 0;
    }
  }
  return 0;
}
