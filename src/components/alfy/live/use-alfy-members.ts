'use client';

/**
 * Membres + rôles d'un serveur, en temps réel, mappés en types alfy.
 * Porté depuis atelier/people/MemberPanel.tsx : requestMembers /
 * requestRoles + MEMBER_* / ROLE_* / PRESENCE_UPDATE.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { socketService } from '@/lib/socket';
import { toAlfyRole, toAlfyUser, toPresence, unwrap } from '@/components/alfy/live/map';
import type { AlfyMember, AlfyRole, AlfyUser } from '@/components/alfy/mock/types';

/** Les roleIds arrivent parfois sérialisés en JSON par la passerelle. */
function parseRoleIds(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export interface AlfyMembersResult {
  members: AlfyMember[];
  roles: AlfyRole[];
  users: Map<string, AlfyUser>;
}

export function useAlfyMembers(serverId: string | null): AlfyMembersResult {
  const [raw, setRaw] = useState<Record<string, unknown>[]>([]);
  const [roles, setRoles] = useState<AlfyRole[]>([]);

  const loadRoles = useCallback(() => {
    if (!serverId) return;
    socketService.requestRoles(serverId, (data: unknown) => {
      const d = data as { roles?: unknown[] } | unknown[];
      const list = (Array.isArray(d) ? d : (d?.roles ?? [])) as Record<string, unknown>[];
      setRoles(list.map((r, i) => toAlfyRole(r, i)).sort((a, b) => a.position - b.position));
    });
  }, [serverId]);

  /* Chargement initial */
  useEffect(() => {
    if (!serverId) {
      setRaw([]);
      setRoles([]);
      return;
    }
    socketService.requestMembers(serverId, (data: unknown) => {
      const d = data as { members?: unknown[] } | unknown[];
      const list = (Array.isArray(d) ? d : (d?.members ?? [])) as Record<string, unknown>[];
      setRaw(list);
    });
    loadRoles();
  }, [serverId, loadRoles]);

  /* Temps réel */
  useEffect(() => {
    if (!serverId) return;

    const idOf = (m: Record<string, unknown>) => (m.userId ?? m.user_id ?? m.id) as string;

    const onJoin = (data: unknown) => {
      const m = unwrap(data);
      if (m?.serverId && m.serverId !== serverId) return;
      setRaw((prev) => (prev.some((x) => idOf(x) === idOf(m)) ? prev : [...prev, m]));
    };
    const onLeave = (data: unknown) => {
      const m = unwrap(data);
      const id = (m?.userId ?? m?.user_id ?? m?.id) as string | undefined;
      if (id) setRaw((prev) => prev.filter((x) => idOf(x) !== id));
    };
    const onUpdate = (data: unknown) => {
      const m = unwrap(data);
      const id = (m?.userId ?? m?.user_id ?? m?.id) as string | undefined;
      if (id) setRaw((prev) => prev.map((x) => (idOf(x) === id ? { ...x, ...m } : x)));
    };
    const onPresence = (data: unknown) => {
      const p = unwrap(data);
      const id = (p?.userId ?? p?.id) as string | undefined;
      if (!id) return;
      setRaw((prev) => prev.map((x) => (idOf(x) === id ? { ...x, status: p.status } : x)));
    };

    socketService.on('MEMBER_JOIN', onJoin);
    socketService.on('MEMBER_LEAVE', onLeave);
    socketService.on('MEMBER_UPDATE', onUpdate);
    socketService.on('PRESENCE_UPDATE', onPresence);
    socketService.on('ROLE_CREATE', loadRoles);
    socketService.on('ROLE_UPDATE', loadRoles);
    socketService.on('ROLE_DELETE', loadRoles);
    return () => {
      socketService.off('MEMBER_JOIN', onJoin);
      socketService.off('MEMBER_LEAVE', onLeave);
      socketService.off('MEMBER_UPDATE', onUpdate);
      socketService.off('PRESENCE_UPDATE', onPresence);
      socketService.off('ROLE_CREATE', loadRoles);
      socketService.off('ROLE_UPDATE', loadRoles);
      socketService.off('ROLE_DELETE', loadRoles);
    };
  }, [serverId, loadRoles]);

  return useMemo(() => {
    const users = new Map<string, AlfyUser>();
    const members: AlfyMember[] = raw.map((m) => {
      const id = (m.userId ?? m.user_id ?? m.id) as string;
      const user = toAlfyUser(m, id);
      // La présence des membres arrive à part du profil.
      user.status = toPresence(m.status ?? (m.is_online ? 'online' : 'offline'));
      users.set(id, user);
      return {
        userId: id,
        roleIds: parseRoleIds(m.roleIds ?? m.role_ids),
        joinedAt: (m.joinedAt ?? m.joined_at ?? new Date().toISOString()) as string,
        nickname: (m.nickname ?? undefined) as string | undefined,
      };
    });
    return { members, roles, users };
  }, [raw, roles]);
}
