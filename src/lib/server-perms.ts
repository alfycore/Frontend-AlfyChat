/**
 * server-perms
 * ────────────────────────────────────────────────────────────────────────────
 * Calcul des permissions d'un membre sur un serveur, à partir des rôles et
 * des membres DÉJÀ chargés — aucune requête réseau.
 *
 * ⚠️ Le bitmask ci-dessous est la copie front de la table qui fait autorité :
 *    servers/src/index.ts (PERM)  et  gateway/src/utils/validation.ts (0xFFF).
 *    Toute modification doit être faite dans les trois à la fois.
 *
 * KICK/BAN (0x10/0x20) et KICK_MEMBERS/BAN_MEMBERS (0x400/0x800) sont deux paires
 * historiques pour la même action. Le backend accepte désormais l'une ou l'autre ;
 * `canKick` / `canBan` testent donc les deux.
 */

import { PERMISSIONS } from '@/components/alfy/mock/types';

export { PERMISSIONS };

/** Expulser : l'une ou l'autre des deux paires historiques suffit. */
export const KICK_ANY = PERMISSIONS.KICK | PERMISSIONS.KICK_MEMBERS;
/** Bannir : idem. */
export const BAN_ANY = PERMISSIONS.BAN | PERMISSIONS.BAN_MEMBERS;

/** Tous les bits valides — doit rester égal à PERM.ALL côté microservice. */
export const ALL_PERMS = 0xfff;

interface RoleLike {
  id: string;
  permissions: number | string | string[];
}

interface MemberLike {
  userId: string;
  roleIds: string[];
}

export interface MemberPerms {
  isOwner: boolean;
  /** Bitmask cumulé de tous les rôles du membre (ADMIN étendu à tout). */
  bits: number;
  isAdmin: boolean;
  canManageChannels: boolean;
  canManageRoles: boolean;
  canManageMessages: boolean;
  canKick: boolean;
  canBan: boolean;
  canSend: boolean;
  canReact: boolean;
  /** Au moins un droit qui justifie l'accès aux réglages du serveur. */
  canOpenSettings: boolean;
}

const NONE: MemberPerms = {
  isOwner: false,
  bits: 0,
  isAdmin: false,
  canManageChannels: false,
  canManageRoles: false,
  canManageMessages: false,
  canKick: false,
  canBan: false,
  canSend: false,
  canReact: false,
  canOpenSettings: false,
};

/** Normalise le champ `permissions` d'un rôle, quel que soit son format de stockage. */
function roleBits(permissions: RoleLike['permissions']): number {
  if (Array.isArray(permissions)) {
    // Ancien format tableau de chaînes (['ADMIN', 'MANAGE_CHANNELS', …]).
    let bits = 0;
    for (const name of permissions) {
      const bit = (PERMISSIONS as Record<string, number>)[name];
      if (typeof bit === 'number') bits |= bit;
    }
    return bits;
  }
  const n = typeof permissions === 'number' ? permissions : parseInt(String(permissions ?? '0'), 10);
  return Number.isFinite(n) ? n & ALL_PERMS : 0;
}

export function computeMemberPerms(
  server: { ownerId: string; roles: RoleLike[]; members: MemberLike[] } | null | undefined,
  userId: string | undefined,
): MemberPerms {
  if (!server || !userId) return NONE;
  if (server.ownerId === userId) {
    return {
      isOwner: true,
      bits: ALL_PERMS,
      isAdmin: true,
      canManageChannels: true,
      canManageRoles: true,
      canManageMessages: true,
      canKick: true,
      canBan: true,
      canSend: true,
      canReact: true,
      canOpenSettings: true,
    };
  }

  const member = server.members.find((m) => m.userId === userId);
  if (!member) return NONE;

  const roleIds = Array.isArray(member.roleIds) ? member.roleIds : [];
  let bits = 0;
  for (const role of server.roles) {
    if (roleIds.includes(role.id)) bits |= roleBits(role.permissions);
  }
  // ADMIN vaut tout : l'expliciter évite de le retester à chaque droit.
  if (bits & PERMISSIONS.ADMIN) bits = ALL_PERMS;

  const canManageChannels = (bits & PERMISSIONS.MANAGE_CHANNELS) !== 0;
  const canManageRoles = (bits & PERMISSIONS.MANAGE_ROLES) !== 0;
  const canKick = (bits & KICK_ANY) !== 0;
  const canBan = (bits & BAN_ANY) !== 0;

  return {
    isOwner: false,
    bits,
    isAdmin: (bits & PERMISSIONS.ADMIN) !== 0,
    canManageChannels,
    canManageRoles,
    canManageMessages: (bits & PERMISSIONS.MANAGE_MESSAGES) !== 0,
    canKick,
    canBan,
    canSend: (bits & PERMISSIONS.SEND) !== 0,
    canReact: (bits & PERMISSIONS.REACT) !== 0,
    canOpenSettings: canManageChannels || canManageRoles || canKick || canBan,
  };
}

/**
 * Un modérateur ne peut agir que sur un membre dont les droits sont inclus dans les
 * siens — même règle que `canActOn` côté microservice, appliquée ici pour ne pas
 * afficher un bouton que le serveur refusera.
 */
export function canActOnMember(
  server: { ownerId: string; roles: RoleLike[]; members: MemberLike[] } | null | undefined,
  actorId: string | undefined,
  targetUserId: string,
): boolean {
  if (!server || !actorId || actorId === targetUserId) return false;
  if (server.ownerId === targetUserId) return false;
  const actor = computeMemberPerms(server, actorId);
  if (actor.isOwner) return true;
  const target = computeMemberPerms(server, targetUserId);
  return (target.bits & ~actor.bits) === 0;
}
