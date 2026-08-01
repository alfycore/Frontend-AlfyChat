'use client';

/**
 * Container : liste des membres alfy branchée sur les vraies données.
 * Remplace atelier/people/MemberPanel.tsx. Les actions de modération
 * passent par le socket (kickMember / banMember / updateMember).
 */

import { useCallback, useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { socketService } from '@/lib/socket';
import { MemberList } from '@/components/alfy/members/member-list';
import { UserDirectoryProvider, makeResolver } from '@/components/alfy/user-directory';
import { useAlfyChannels } from '@/components/alfy/live/use-alfy-channels';
import { useAlfyMembers } from '@/components/alfy/live/use-alfy-members';
import type { AlfyServer } from '@/components/alfy/mock/types';

export function AlfyMemberList({ serverId }: { serverId: string }) {
  const { user } = useAuth();
  const base = useAlfyChannels(serverId);
  const { members, roles, users } = useAlfyMembers(serverId);

  const resolver = useMemo(() => makeResolver(users), [users]);

  // Le serveur passé à la liste porte les membres + rôles réels.
  const server: AlfyServer = useMemo(
    () => ({
      id: serverId,
      name: base?.name ?? 'Serveur',
      iconUrl: base?.iconUrl,
      isPublic: true,
      ownerId: base?.ownerId ?? '',
      nodeOnline: base?.nodeOnline ?? true,
      selfHosted: base?.selfHosted ?? false,
      categories: [],
      channels: [],
      roles,
      members,
      mentionCount: 0,
      unread: false,
    }),
    [serverId, base, roles, members],
  );

  const handleKick = useCallback(
    (userId: string) => socketService.kickMember(serverId, userId),
    [serverId],
  );
  const handleBan = useCallback(
    (userId: string, reason: string) => socketService.banMember(serverId, userId, reason || undefined),
    [serverId],
  );
  const handleToggleRole = useCallback(
    (userId: string, roleId: string, next: boolean) => {
      const current = members.find((m) => m.userId === userId)?.roleIds ?? [];
      const roleIds = next ? [...new Set([...current, roleId])] : current.filter((r) => r !== roleId);
      socketService.updateMember(serverId, userId, { roleIds });
    },
    [serverId, members],
  );

  return (
    <UserDirectoryProvider value={resolver}>
      <MemberList
        server={server}
        currentUserId={user?.id}
        onKick={handleKick}
        onBan={handleBan}
        onToggleRole={handleToggleRole}
      />
    </UserDirectoryProvider>
  );
}
