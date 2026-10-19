'use client';

/**
 * Liste des membres (colonne de droite), au gabarit Discord :
 *  - en ligne, regroupés sous leur plus haut rôle « affiché séparément »,
 *    puis « En ligne » pour les autres, puis « Hors ligne » (atténués) ;
 *  - nom à la couleur du plus haut rôle coloré, couronne du propriétaire,
 *    statut personnalisé en seconde ligne ;
 *  - clic = profil (rôles, modération), clic droit = menu membre.
 *
 * Virtualisée : un serveur de 4 000 membres ne monte qu'une trentaine de lignes.
 */

import { Avatar, ScrollShadow, Skeleton, Tooltip } from '@heroui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Crown } from 'lucide-react';
import { memo, useMemo, useRef, type HTMLAttributes } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { StatusDot } from '@/components/alfy/primitives/status-dot';
import { UserPopover } from '@/components/alfy/members/user-popover';
import type { AlfyRole } from '@/components/alfy/mock/types';
import { useBindContextMenu } from '@/components/alfy/guild/context-menu';
import {
  memberColor,
  memberName,
  memberRoles,
  useGuildInfo,
  useGuildMembers,
  useGuildMembersLoaded,
  useGuildRoles,
  useMyPerms,
} from '@/components/alfy/guild/hooks';
import { useMemberMenu } from '@/components/alfy/guild/members/member-menu';
import { banMember, kickMember, toggleMemberRole } from '@/components/alfy/guild/actions';
import type { GuildMember, GuildRole } from '@/components/alfy/guild/types';

type Row =
  | { kind: 'header'; key: string; label: string; count: number }
  | { kind: 'member'; key: string; member: GuildMember; offline: boolean };

export function toAlfyRole(r: GuildRole): AlfyRole {
  return { id: r.id, name: r.name, color: r.color, emoji: r.iconEmoji ?? undefined, permissions: r.permissions, hoisted: r.hoist, position: r.position };
}

/** Au-delà, Discord ne liste plus les membres hors ligne. */
const OFFLINE_LIMIT = 1000;

function buildRows(members: GuildMember[], roles: GuildRole[], labels: { online: string; offline: string }): Row[] {
  const hoisted = roles.filter((r) => r.hoist && !r.isDefault);
  const groups = new Map<string, GuildMember[]>();
  const online: GuildMember[] = [];
  const offline: GuildMember[] = [];
  for (const m of members) {
    const isOffline = m.user.status === 'offline' || m.user.status === 'invisible';
    if (isOffline) {
      offline.push(m);
      continue;
    }
    const top = hoisted.find((r) => m.roleIds.includes(r.id));
    if (top) groups.set(top.id, [...(groups.get(top.id) ?? []), m]);
    else online.push(m);
  }
  const byName = (a: GuildMember, b: GuildMember) => memberName(a).localeCompare(memberName(b), undefined, { sensitivity: 'base' });
  const rows: Row[] = [];
  for (const r of hoisted) {
    const list = groups.get(r.id);
    if (!list?.length) continue;
    rows.push({ kind: 'header', key: `h-${r.id}`, label: r.name, count: list.length });
    for (const m of list.sort(byName)) rows.push({ kind: 'member', key: m.userId, member: m, offline: false });
  }
  if (online.length) {
    rows.push({ kind: 'header', key: 'h-online', label: labels.online, count: online.length });
    for (const m of online.sort(byName)) rows.push({ kind: 'member', key: m.userId, member: m, offline: false });
  }
  if (offline.length && members.length <= OFFLINE_LIMIT) {
    rows.push({ kind: 'header', key: 'h-offline', label: labels.offline, count: offline.length });
    for (const m of offline.sort(byName)) rows.push({ kind: 'member', key: m.userId, member: m, offline: true });
  }
  return rows;
}

export function GuildMemberList({ serverId }: { serverId: string }) {
  const { t } = useTranslation();
  const membersMap = useGuildMembers(serverId);
  const loaded = useGuildMembersLoaded(serverId);
  const roles = useGuildRoles(serverId);
  const info = useGuildInfo(serverId);
  const bind = useBindContextMenu();
  const menu = useMemberMenu(serverId);
  const perms = useMyPerms(serverId);
  const { user } = useAuth();

  const rows = useMemo(
    () => buildRows(Object.values(membersMap), roles, { online: t.guild.members.online, offline: t.guild.members.offline }),
    [membersMap, roles, t],
  );
  const alfyRoles = useMemo(() => roles.filter((r) => !r.isDefault).map(toAlfyRole), [roles]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (rows[i]?.kind === 'header' ? 40 : 44),
    overscan: 12,
    getItemKey: (i) => rows[i]?.key ?? i,
  });

  return (
    <aside aria-label={t.guild.members.aria} className="alfy-sidebar flex h-full w-full flex-col">
      <ScrollShadow ref={scrollRef} className="alfy-thin-scroll min-h-0 flex-1 overflow-y-auto px-2">
        {!loaded && rows.length === 0 ? (
          <MemberSkeleton />
        ) : (
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() + 16 }}>
            {virtualizer.getVirtualItems().map((item) => {
              const row = rows[item.index];
              return (
                <div
                  key={item.key}
                  data-index={item.index}
                  className="absolute inset-x-0"
                  style={{ transform: `translateY(${item.start}px)`, height: item.size }}
                >
                  {row.kind === 'header' ? (
                    <h3 className="flex h-10 items-end truncate px-2 pb-1 text-[11px] font-semibold tracking-[0.04em] text-muted uppercase">
                      {row.label} — {row.count}
                    </h3>
                  ) : (
                    <MemberRow
                      member={row.member}
                      offline={row.offline}
                      isOwner={info?.ownerId === row.member.userId}
                      isSelf={row.member.userId === user?.id}
                      roles={roles}
                      allRoles={alfyRoles}
                      moderatorPermissions={perms.bits}
                      menuProps={bind(() => menu(row.member.userId))}
                      onKick={() => kickMember(serverId, row.member.userId)}
                      onBan={(reason) => banMember(serverId, row.member.userId, reason)}
                      onToggleRole={(roleId, next) => void toggleMemberRole(serverId, row.member.userId, roleId, next)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollShadow>
    </aside>
  );
}

const MemberRow = memo(function MemberRow({
  member,
  offline,
  isOwner,
  isSelf,
  roles,
  allRoles,
  moderatorPermissions,
  menuProps,
  onKick,
  onBan,
  onToggleRole,
}: {
  member: GuildMember;
  offline: boolean;
  isOwner: boolean;
  isSelf: boolean;
  roles: GuildRole[];
  allRoles: AlfyRole[];
  moderatorPermissions: number;
  menuProps: HTMLAttributes<HTMLElement>;
  onKick: () => void;
  onBan: (reason: string) => void;
  onToggleRole: (roleId: string, next: boolean) => void;
}) {
  const { t } = useTranslation();
  const color = memberColor(member, roles);
  const name = memberName(member);
  const mine = memberRoles(member, roles).map(toAlfyRole);
  const u = member.user;

  return (
    <div {...menuProps} className="py-px">
      <UserPopover
        user={{ ...u, displayName: name }}
        roles={mine}
        allServerRoles={allRoles}
        isSelf={isSelf}
        placement="left"
        moderatorPermissions={isSelf ? 0 : moderatorPermissions}
        onKick={onKick}
        onBan={onBan}
        onToggleRole={onToggleRole}
        triggerClassName={cn(
          'group/m flex h-[42px] w-full cursor-pointer items-center gap-3 rounded-md px-2 text-left outline-none transition-[background-color,opacity] duration-(--dur-1)',
          'hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-focus',
          offline && 'opacity-35 hover:opacity-100',
        )}
      >
        <span className="relative shrink-0">
          <Avatar className="size-8">
            {u.avatarUrl && <Avatar.Image src={u.avatarUrl} alt="" />}
            <Avatar.Fallback>{name.slice(0, 1).toUpperCase()}</Avatar.Fallback>
          </Avatar>
          {!offline && (
            <span className="absolute -right-0.5 -bottom-0.5">
              <StatusDot status={u.status} ringClass="ring-(--alfy-sidebar)" />
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-[15px] font-medium text-foreground/90" style={color ? { color } : undefined}>
              {name}
            </span>
            {u.isBot && (
              <span className="shrink-0 rounded-sm bg-accent px-1 text-[10px] leading-4 font-semibold text-accent-foreground">{t.guild.members.app}</span>
            )}
            {isOwner && (
              <Tooltip delay={200} closeDelay={0}>
                <Crown className="size-3.5 shrink-0 text-warning" aria-label={t.guild.members.owner} />
                <Tooltip.Content>
                  <p>{t.guild.members.owner}</p>
                </Tooltip.Content>
              </Tooltip>
            )}
          </span>
          {u.customStatus && !offline && <span className="truncate text-xs text-muted">{u.customStatus}</span>}
        </span>
      </UserPopover>
    </div>
  );
});

function MemberSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2 pt-6" aria-hidden>
      <Skeleton className="h-3 w-24 rounded-sm" />
      {[62, 48, 70, 55, 66, 40].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <Skeleton className="h-3.5 rounded-sm" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}
