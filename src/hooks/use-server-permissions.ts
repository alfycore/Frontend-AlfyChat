'use client';

/**
 * use-server-permissions
 * ────────────────────────────────────────────────────────────────────────────
 * Retourne les droits du membre courant dans un serveur donné.
 *
 * ⚠️ Le bitmask vient de `@/lib/server-perms`, copie de la table qui fait autorité
 * dans servers/src/index.ts. Ne PAS le redéfinir ici : cette version en avait une
 * variante incompatible (0x01=SEND_MESSAGES, 0x02=KICK…) qui lisait le rôle par
 * défaut (0x7 = READ|SEND|REACT) comme « peut expulser et bannir ».
 *
 * Usage :
 *   const { isOwner, isAdmin, canManage, canSend, isLoading } = useServerPermissions(serverId);
 */

import { useState, useEffect, useCallback } from 'react';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { PERMISSIONS, KICK_ANY, BAN_ANY, ALL_PERMS } from '@/lib/server-perms';

/* ── Bitfield constants — source unique, partagée avec le backend ───────────── */
export const PERM = PERMISSIONS;

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
                const bit = (PERMISSIONS as Record<string, number>)[perm];
                if (typeof bit === 'number') bits |= bit;
              }
            } else {
              const n = typeof p === 'number' ? p : parseInt(p || '0', 10);
              if (Number.isFinite(n)) bits |= n & ALL_PERMS;
            }
          }

          const isAdmin = (bits & PERMISSIONS.ADMIN) !== 0;
          const result: ServerPermissions = {
            isOwner: false,
            isAdmin,
            canManage: isAdmin || (bits & PERMISSIONS.MANAGE_CHANNELS) !== 0,
            canSend: isAdmin || (bits & PERMISSIONS.SEND) !== 0,
            canManageMessages: isAdmin || (bits & PERMISSIONS.MANAGE_MESSAGES) !== 0,
            canModerate: isAdmin || (bits & KICK_ANY) !== 0 || (bits & BAN_ANY) !== 0,
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
