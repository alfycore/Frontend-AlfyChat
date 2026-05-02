'use client';

/**
 * use-server-permissions
 * ────────────────────────────────────────────────────────────────────────────
 * Retourne les droits du membre courant dans un serveur donné.
 *
 * Droits (bitfield Discord-like) :
 *   ADMIN           = 0x40  (peut tout faire)
 *   MANAGE_CHANNELS = 0x80  (créer/modifier/supprimer des salons)
 *   MANAGE_ROLES    = 0x100 (créer/modifier des rôles)
 *   SEND_MESSAGES   = 0x01  (envoyer des messages)
 *   KICK_MEMBERS    = 0x02  (expulser)
 *   BAN_MEMBERS     = 0x04  (bannir)
 *   MANAGE_MESSAGES = 0x08  (supprimer les messages des autres)
 *
 * Usage :
 *   const { isOwner, isAdmin, canManage, canSend, isLoading } = useServerPermissions(serverId);
 */

import { useState, useEffect, useCallback } from 'react';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';

/* ── Bitfield constants ─────────────────────────────────────────────────────── */
export const PERM = {
  SEND_MESSAGES:   0x01,
  KICK_MEMBERS:    0x02,
  BAN_MEMBERS:     0x04,
  MANAGE_MESSAGES: 0x08,
  MANAGE_ROLES:    0x10,
  ADMIN:           0x40,
  MANAGE_CHANNELS: 0x80,
} as const;

/* ── Types ──────────────────────────────────────────────────────────────────── */
export interface ServerPermissions {
  /** L'utilisateur est propriétaire du serveur */
  isOwner: boolean;
  /** A le flag ADMIN (ou est owner) */
  isAdmin: boolean;
  /** Peut créer/modifier/supprimer des salons (ADMIN | MANAGE_CHANNELS) */
  canManage: boolean;
  /** Peut envoyer des messages ordinaires (tout le monde sauf si restreint) */
  canSend: boolean;
  /** Peut supprimer des messages d'autres membres */
  canManageMessages: boolean;
  /** Peut exclure / bannir des membres */
  canModerate: boolean;
  /** Valeur brute du bitfield cumulé de tous les rôles */
  rawPermissions: number;
  isLoading: boolean;
}

const DEFAULT: ServerPermissions = {
  isOwner: false,
  isAdmin: false,
  canManage: false,
  canSend: true,
  canManageMessages: false,
  canModerate: false,
  rawPermissions: 0,
  isLoading: true,
};

/* ── Cache léger (évite N requêtes pour le même serverId dans la même session) ─ */
const cache = new Map<string, ServerPermissions>();

export function useServerPermissions(serverId?: string): ServerPermissions {
  const { user } = useAuth();
  const [perms, setPerms] = useState<ServerPermissions>(() =>
    serverId && cache.has(serverId) ? cache.get(serverId)! : DEFAULT,
  );

  const compute = useCallback(() => {
    if (!serverId || !user) {
      setPerms({ ...DEFAULT, isLoading: false, canSend: true });
      return;
    }

    // Vérification instantanée depuis cache
    if (cache.has(serverId)) {
      setPerms(cache.get(serverId)!);
      return;
    }

    setPerms((prev) => ({ ...prev, isLoading: true }));

    // 1. Charger les infos du serveur
    socketService.requestServerInfo(serverId, (serverData: any) => {
      const server = serverData?.server ?? serverData;
      if (!server) {
        const fallback: ServerPermissions = { ...DEFAULT, isLoading: false };
        setPerms(fallback);
        return;
      }

      const isOwner =
        server.ownerId === user.id || server.owner_id === user.id;

      if (isOwner) {
        const result: ServerPermissions = {
          isOwner: true,
          isAdmin: true,
          canManage: true,
          canSend: true,
          canManageMessages: true,
          canModerate: true,
          rawPermissions: 0xffff,
          isLoading: false,
        };
        cache.set(serverId, result);
        setPerms(result);
        return;
      }

      // 2. Charger membres + rôles
      socketService.requestMembers(serverId, (memberData: any) => {
        const members: any[] = memberData?.members ?? [];
        socketService.requestRoles(serverId, (roleData: any) => {
          const roles: any[] = roleData?.roles ?? [];
          const member = members.find(
            (m) => m.userId === user.id || m.user_id === user.id,
          );

          if (!member) {
            const fallback: ServerPermissions = { ...DEFAULT, isLoading: false };
            cache.set(serverId, fallback);
            setPerms(fallback);
            return;
          }

          // Récupérer les IDs de rôles du membre
          let roleIds: string[] = [];
          const raw = member.roleIds ?? member.role_ids;
          if (Array.isArray(raw)) {
            roleIds = raw;
          } else {
            try { roleIds = JSON.parse(raw || '[]'); } catch { roleIds = []; }
          }

          // Calculer le bitfield cumulé
          const userRoles = roles.filter((r) => roleIds.includes(r.id));
          let bits = 0;
          for (const r of userRoles) {
            const p = r.permissions;
            if (Array.isArray(p)) {
              // Format tableau de strings (ex: ['ADMIN','MANAGE_CHANNELS'])
              for (const perm of p) {
                const k = perm as keyof typeof PERM;
                if (k in PERM) bits |= PERM[k];
              }
            } else {
              bits |= typeof p === 'number' ? p : parseInt(p || '0', 10);
            }
          }

          const isAdmin = (bits & PERM.ADMIN) !== 0;
          const result: ServerPermissions = {
            isOwner: false,
            isAdmin,
            canManage: isAdmin || (bits & PERM.MANAGE_CHANNELS) !== 0,
            canSend: true, // tout le monde peut envoyer par défaut
            canManageMessages: isAdmin || (bits & PERM.MANAGE_MESSAGES) !== 0,
            canModerate:
              isAdmin ||
              (bits & PERM.KICK_MEMBERS) !== 0 ||
              (bits & PERM.BAN_MEMBERS) !== 0,
            rawPermissions: bits,
            isLoading: false,
          };

          cache.set(serverId, result);
          setPerms(result);
        });
      });
    });
  }, [serverId, user]);

  useEffect(() => {
    compute();
  }, [compute]);

  return perms;
}

/** Invalide le cache pour un serveur (à appeler après changement de rôle) */
export function invalidateServerPermissions(serverId: string) {
  cache.delete(serverId);
}
