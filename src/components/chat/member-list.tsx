'use client';

import { useEffect, useState } from 'react';
import { resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { Avatar, Badge, ScrollShadow, Skeleton } from '@heroui/react';
import { UserProfilePopover } from '@/components/chat/user-profile-popover';
import { cn } from '@/lib/utils';

interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface Member {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'idle' | 'dnd' | 'invisible';
  roles: string[];
}

interface MemberListProps {
  serverId: string;
}

const STATUS_DOT: Record<string, string> = {
  online:    'bg-green-500',
  idle:      'bg-orange-500 !rounded-sm',
  dnd:       'bg-red-500 !rounded-sm',
  offline:   'bg-[var(--muted)]/30',
  invisible: 'bg-[var(--muted)]/30',
};

function MemberRow({ member, serverId, roles }: { member: Member; serverId: string; roles: Role[] }) {
  const isOnline = member.status !== 'offline' && member.status !== 'invisible';
  const name = member.displayName || member.username;
  const dotClass = STATUS_DOT[member.status] ?? STATUS_DOT.offline;

  const memberRoles = roles
    .filter((r) => member.roles.includes(r.id) && !r.name.startsWith('@'))
    .sort((a, b) => b.position - a.position);
  const topRoleColor = memberRoles[0]?.color;

  return (
    <UserProfilePopover userId={member.id} serverId={serverId}>
      <button className={cn(
        'flex w-full items-center gap-2 rounded-xl px-2 py-1.5 transition-all duration-150 hover:bg-[var(--surface-secondary)]/40',
        !isOnline && 'opacity-35',
      )}>
        <Badge.Anchor>
          <Avatar size="sm" className="size-7 shadow-sm">
            <Avatar.Image src={resolveMediaUrl(member.avatarUrl)} />
            <Avatar.Fallback className="bg-gradient-to-br from-violet-500/80 to-indigo-600/80 text-[10px] font-semibold text-white">
              {name[0]?.toUpperCase() || '?'}
            </Avatar.Fallback>
          </Avatar>
          <Badge
            size="sm"
            placement="bottom-right"
            className={cn('size-2.5 min-w-0 border-[1.5px] border-[var(--background)] p-0', dotClass)}
          />
        </Badge.Anchor>
        <span
          className="truncate text-[12px] font-medium leading-tight"
          style={topRoleColor && topRoleColor !== '#99AAB5' ? { color: topRoleColor } : undefined}
        >
          {name}
        </span>
        {memberRoles.length > 0 && (
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            {memberRoles.slice(0, 3).map((r) => (
              <span
                key={r.id}
                className="size-2 rounded-full opacity-80"
                style={{ backgroundColor: r.color }}
                title={r.name}
              />
            ))}
          </div>
        )}
      </button>
    </UserProfilePopover>
  );
}

function parseMember(m: any): Member {
  return {
    id: m.userId || m.user_id || m.id,
    username: m.username,
    displayName: m.displayName || m.display_name || null,
    avatarUrl: m.avatarUrl || m.avatar_url,
    status: m.status || (m.is_online ? 'online' : 'offline'),
    roles: m.roleIds || m.role_ids
      ? typeof (m.roleIds || m.role_ids) === 'string'
        ? (() => { try { return JSON.parse(m.roleIds || m.role_ids); } catch { return []; } })()
        : (m.roleIds || m.role_ids)
      : [],
  };
}

export function MemberList({ serverId }: MemberListProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    socketService.requestMembers(serverId, (memberData: any) => {
      const rawMembers: Member[] = (memberData?.members || []).map(parseMember);
      setMembers(rawMembers);

      socketService.requestRoles(serverId, (roleData: any) => {
        const rawRoles: Role[] = (roleData?.roles || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          color: r.color || '#99AAB5',
          position: r.position || 0,
        }));
        rawRoles.sort((a, b) => b.position - a.position);
        setRoles(rawRoles);
        setIsLoading(false);
      });
    });
  }, [serverId]);

  useEffect(() => {
    const handlePresence = (data: unknown) => {
      const payload = (data as { payload?: Record<string, unknown> })?.payload || data;
      const p = payload as { userId?: string; status?: string };
      if (!p?.userId || !p?.status) return;
      setMembers((prev) =>
        prev.map((m) =>
          m.id === p.userId ? { ...m, status: p.status as Member['status'] } : m
        )
      );
    };

    const handleMemberJoin = (data: unknown) => {
      const payload = (data as { payload?: Record<string, unknown> })?.payload || data;
      const p = payload as { serverId?: string; member?: unknown };
      if (p?.serverId !== serverId || !p?.member) return;
      const newMember = parseMember(p.member as any);
      setMembers((prev) => {
        if (prev.some((m) => m.id === newMember.id)) return prev;
        return [...prev, newMember];
      });
    };

    const handleMemberLeave = (data: unknown) => {
      const payload = (data as { payload?: Record<string, unknown> })?.payload || data;
      const p = payload as { serverId?: string; userId?: string };
      if (p?.serverId !== serverId || !p?.userId) return;
      setMembers((prev) => prev.filter((m) => m.id !== p.userId));
    };

    const handleMemberUpdate = (data: unknown) => {
      const payload = (data as { payload?: Record<string, unknown> })?.payload || data;
      const p = payload as { serverId?: string; userId?: string; roleIds?: string[]; member?: any };
      if (p?.serverId !== serverId) return;
      const targetId = p.member?.userId || p.member?.user_id || p.member?.id || p.userId;
      let newRoleIds = p.member?.roleIds || p.member?.role_ids || p.roleIds || [];
      if (typeof newRoleIds === 'string') {
        try { newRoleIds = JSON.parse(newRoleIds); } catch { return; }
      }
      if (targetId) {
        setMembers((prev) =>
          prev.map((m) => m.id === targetId ? { ...m, roles: newRoleIds } : m)
        );
      }
    };

    const handleRoleChange = (data: unknown) => {
      const payload = (data as { payload?: Record<string, unknown> })?.payload || data;
      const p = payload as { serverId?: string };
      if (p?.serverId !== serverId) return;
      socketService.requestRoles(serverId, (roleData: any) => {
        const rawRoles: Role[] = (roleData?.roles || []).map((r: any) => ({
          id: r.id, name: r.name, color: r.color || '#99AAB5', position: r.position || 0,
        }));
        rawRoles.sort((a, b) => b.position - a.position);
        setRoles(rawRoles);
      });
    };

    socketService.onPresenceUpdate(handlePresence);
    socketService.onMemberJoin(handleMemberJoin);
    socketService.onMemberLeave(handleMemberLeave);
    socketService.onMemberUpdate(handleMemberUpdate);
    socketService.on('ROLE_CREATE', handleRoleChange);
    socketService.on('ROLE_UPDATE', handleRoleChange);
    socketService.on('ROLE_DELETE', handleRoleChange);

    return () => {
      socketService.off('PRESENCE_UPDATE', handlePresence);
      socketService.off('MEMBER_JOIN', handleMemberJoin);
      socketService.off('MEMBER_LEAVE', handleMemberLeave);
      socketService.off('MEMBER_UPDATE', handleMemberUpdate);
      socketService.off('ROLE_CREATE', handleRoleChange);
      socketService.off('ROLE_UPDATE', handleRoleChange);
      socketService.off('ROLE_DELETE', handleRoleChange);
    };
  }, [serverId]);

  if (isLoading) {
    return (
      <div className="w-full bg-[var(--surface)]/60 backdrop-blur-xl">
        <div className="space-y-1.5 p-3 pt-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-2">
              <Skeleton className="size-7 shrink-0 rounded-full" animationType="shimmer" />
              <Skeleton className="h-3 rounded" animationType="shimmer" style={{ width: `${40 + (i % 4) * 12}%` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const onlineMembers = members.filter((m) => m.status !== 'offline' && m.status !== 'invisible');
  const offlineMembers = members.filter((m) => m.status === 'offline' || m.status === 'invisible');

  const assignedIds = new Set<string>();
  const roleSections: Array<{ role: Role; members: Member[] }> = [];

  for (const role of roles) {
    if (role.name === 'Membre' && role.position === 0) continue;
    const roleMembers = onlineMembers.filter(
      (m) => m.roles.includes(role.id) && !assignedIds.has(m.id)
    );
    if (roleMembers.length > 0) {
      roleMembers.forEach((m) => assignedIds.add(m.id));
      roleSections.push({ role, members: roleMembers });
    }
  }

  const remainingOnline = onlineMembers.filter((m) => !assignedIds.has(m.id));

  return (
    <div className="flex h-full w-full flex-col bg-[var(--surface)]/60 backdrop-blur-xl">
      <ScrollShadow className="flex-1">
        <div className="p-2 pt-3">
          {/* Role-based sections */}
          {roleSections.map(({ role, members: roleMembers }) => (
            <div key={role.id} className="mb-4">
              <div className="mb-1.5 flex items-center gap-1.5 px-2">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: role.color }}
                />
                <p
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: role.color }}
                >
                  {role.name}
                </p>
                <span className="ml-auto text-[10px] font-medium tabular-nums text-[var(--muted)]/40">
                  {roleMembers.length}
                </span>
              </div>
              <div className="space-y-0.5">
                {roleMembers.map((m) => (
                  <MemberRow key={m.id} member={m} serverId={serverId} roles={roles} />
                ))}
              </div>
            </div>
          ))}

          {/* Remaining online */}
          {remainingOnline.length > 0 && (
            <div className="mb-4">
              <div className="mb-1.5 flex items-center gap-1.5 px-2">
                <span className="size-1.5 shrink-0 rounded-full bg-green-500" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/60">
                  En ligne
                </p>
                <span className="ml-auto text-[10px] font-medium tabular-nums text-[var(--muted)]/40">
                  {remainingOnline.length}
                </span>
              </div>
              <div className="space-y-0.5">
                {remainingOnline.map((m) => (
                  <MemberRow key={m.id} member={m} serverId={serverId} roles={roles} />
                ))}
              </div>
            </div>
          )}

          {/* Offline */}
          {offlineMembers.length > 0 && (
            <div className="mb-4">
              <div className="mb-1.5 flex items-center gap-1.5 px-2">
                <span className="size-1.5 shrink-0 rounded-full bg-[var(--muted)]/30" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/30">
                  Hors ligne
                </p>
                <span className="ml-auto text-[10px] font-medium tabular-nums text-[var(--muted)]/25">
                  {offlineMembers.length}
                </span>
              </div>
              <div className="space-y-0.5">
                {offlineMembers.map((m) => (
                  <MemberRow key={m.id} member={m} serverId={serverId} roles={roles} />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollShadow>
    </div>
  );
}
