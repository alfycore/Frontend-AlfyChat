'use client';

import type { AlfyMember, AlfyRole } from '@/components/alfy/mock/types';
import { useUserById } from '@/components/alfy/user-directory';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { UserPopover } from '@/components/alfy/members/user-popover';
import { cn } from '@/lib/utils';

interface MemberItemProps {
  member: AlfyMember;
  roles: AlfyRole[];
  allServerRoles?: AlfyRole[];
  isSelf?: boolean;
  moderatorPermissions?: number;
  /** Actions réelles de modération (absentes en mock). */
  onKick?: (userId: string) => void;
  onBan?: (userId: string, reason: string) => void;
  onToggleRole?: (userId: string, roleId: string, next: boolean) => void;
}

export function MemberItem({
  member,
  roles,
  allServerRoles,
  isSelf,
  moderatorPermissions,
  onKick,
  onBan,
  onToggleRole,
}: MemberItemProps) {
  const userById = useUserById();
  const user = userById(member.userId);
  const topRole = roles.sort((a, b) => a.position - b.position)[0];
  const offline = user.status === 'offline' || user.status === 'invisible';

  return (
    <UserPopover
      user={user}
      roles={roles}
      allServerRoles={allServerRoles}
      isSelf={isSelf}
      moderatorPermissions={moderatorPermissions}
      onKick={onKick ? () => onKick(member.userId) : undefined}
      onBan={onBan ? (reason) => onBan(member.userId, reason) : undefined}
      onToggleRole={onToggleRole ? (roleId, next) => onToggleRole(member.userId, roleId, next) : undefined}
      triggerClassName={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 outline-none',
        'transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]',
        offline && 'opacity-50 hover:opacity-80',
      )}
    >
      <AlfyAvatar
        name={user.displayName}
        avatarUrl={user.avatarUrl}
        size="sm"
        status={offline ? undefined : user.status}
        statusRingClass="ring-surface"
      />
      <span className="min-w-0 flex-1 text-left">
        <span
          className="block truncate text-sm font-medium"
          style={topRole && !offline ? { color: topRole.color } : undefined}
        >
          {member.nickname || user.displayName}
        </span>
        {user.customStatus && !offline && (
          <span className="block truncate text-[11px] text-muted">{user.customStatus}</span>
        )}
      </span>
    </UserPopover>
  );
}
