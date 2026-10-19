'use client';

/** Réglages du serveur — Membres (recherche, rôles, ancienneté, actions). */

import { Avatar, Button, Dropdown, Label, SearchField, Tooltip } from '@heroui/react';
import { Check, Crown, Ellipsis, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useTranslation } from '@/components/locale-provider';
import { PageTitle } from '@/components/alfy/guild/kit';
import { MenuSections } from '@/components/alfy/guild/context-menu';
import { memberName, memberRoles, useGuildInfo, useGuildMembers, useGuildRoles, useMyPerms } from '@/components/alfy/guild/hooks';
import { useMemberMenu, topPosition } from '@/components/alfy/guild/members/member-menu';
import { toggleMemberRole } from '@/components/alfy/guild/actions';
import { useAuth } from '@/hooks/use-auth';

export function MembersPage({ serverId }: { serverId: string }) {
  const { t, tx, intlLocale } = useTranslation();
  const { user } = useAuth();
  const members = useGuildMembers(serverId);
  const roles = useGuildRoles(serverId);
  const info = useGuildInfo(serverId);
  const perms = useMyPerms(serverId);
  const menu = useMemberMenu(serverId);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const dateFmt = useMemo(() => new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short', year: 'numeric' }), [intlLocale]);
  const mine = user?.id ? members[user.id] : undefined;
  const myTop = perms.isOwner ? Number.MAX_SAFE_INTEGER : topPosition(mine?.roleIds ?? [], roles);
  const assignable = roles.filter((r) => !r.isDefault && (perms.isOwner || r.position < myTop));
  const canRoles = perms.can('MANAGE_ROLES');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(members)
      .filter((m) => (!roleFilter || m.roleIds.includes(roleFilter)) && (!q || memberName(m).toLowerCase().includes(q) || m.user.username.toLowerCase().includes(q) || m.userId === q))
      .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
  }, [members, query, roleFilter]);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle description={tx(t.guild.membersPage.count, { n: Object.keys(members).length })}>{t.guild.membersPage.title}</PageTitle>

      <div className="flex flex-wrap items-center gap-3">
        <SearchField value={query} onChange={setQuery} aria-label={t.guild.membersPage.search} className="min-w-56 flex-1">
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder={t.guild.membersPage.search} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Dropdown>
          <Button variant="secondary" size="sm">
            {roleFilter ? (roles.find((r) => r.id === roleFilter)?.name ?? t.guild.membersPage.allRoles) : t.guild.membersPage.allRoles}
          </Button>
          <Dropdown.Popover className="min-w-52">
            <Dropdown.Menu aria-label={t.guild.membersPage.filterRole}>
              <Dropdown.Item id="all" textValue={t.guild.membersPage.allRoles} onAction={() => setRoleFilter(null)}>
                <Label>{t.guild.membersPage.allRoles}</Label>
                {!roleFilter && <Check className="ms-auto size-4 text-accent" aria-hidden />}
              </Dropdown.Item>
              {roles
                .filter((r) => !r.isDefault)
                .map((r) => (
                  <Dropdown.Item key={r.id} id={r.id} textValue={r.name} onAction={() => setRoleFilter(r.id)}>
                    <span className="size-2.5 rounded-full" style={{ background: r.color }} aria-hidden />
                    <Label>{r.name}</Label>
                    {roleFilter === r.id && <Check className="ms-auto size-4 text-accent" aria-hidden />}
                  </Dropdown.Item>
                ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      <div className="overflow-hidden rounded-lg border border-separator">
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1.6fr)_40px] items-center gap-3 border-b border-separator bg-surface-secondary px-4 py-2 text-xs font-bold tracking-[0.02em] text-muted uppercase">
          <span>{t.guild.membersPage.colName}</span>
          <span>{t.guild.membersPage.colSince}</span>
          <span>{t.guild.membersPage.colRoles}</span>
          <span />
        </div>
        <ul className="divide-y divide-separator">
          {list.map((m) => {
            const own = memberRoles(m, roles);
            const isOwner = info?.ownerId === m.userId;
            return (
              <li key={m.userId} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1.6fr)_40px] items-center gap-3 px-4 py-2.5 transition-colors duration-(--dur-1) hover:bg-foreground/4">
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="size-8 shrink-0">
                    {m.user.avatarUrl && <Avatar.Image src={m.user.avatarUrl} alt="" />}
                    <Avatar.Fallback>{memberName(m).slice(0, 1)}</Avatar.Fallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 truncate text-sm font-medium">
                      {memberName(m)}
                      {isOwner && <Crown className="size-3.5 shrink-0 text-warning" aria-label={t.guild.members.owner} />}
                    </span>
                    <span className="block truncate text-xs text-muted">{m.user.username}</span>
                  </span>
                </span>
                <span className="truncate text-sm text-muted">{dateFmt.format(new Date(m.joinedAt))}</span>
                <span className="flex min-w-0 flex-wrap items-center gap-1">
                  {own.map((r) => (
                    <span key={r.id} className="group/chip flex h-6 max-w-full items-center gap-1 rounded-md bg-foreground/6 pr-1.5 pl-1 text-xs font-medium">
                      {canRoles && assignable.some((a) => a.id === r.id) ? (
                        <button
                          type="button"
                          onClick={() => void toggleMemberRole(serverId, m.userId, r.id, false)}
                          aria-label={tx(t.guild.membersPage.removeRole, { name: r.name })}
                          className="flex size-3.5 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none"
                          style={{ background: r.color }}
                        >
                          <X className="size-2.5 text-white opacity-0 group-hover/chip:opacity-100" strokeWidth={3} aria-hidden />
                        </button>
                      ) : (
                        <span className="size-3 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden />
                      )}
                      <span className="truncate">{r.name}</span>
                    </span>
                  ))}
                  {canRoles && assignable.length > 0 && !isOwner && (
                    <Dropdown>
                      <Tooltip delay={300} closeDelay={0}>
                        <Button isIconOnly size="sm" variant="ghost" aria-label={t.guild.membersPage.addRole} className="size-6 min-w-6 text-muted">
                          <Plus className="size-3.5" aria-hidden />
                        </Button>
                        <Tooltip.Content>
                          <p>{t.guild.membersPage.addRole}</p>
                        </Tooltip.Content>
                      </Tooltip>
                      <Dropdown.Popover className="min-w-52">
                        <Dropdown.Menu aria-label={t.guild.membersPage.addRole}>
                          {assignable.map((r) => {
                            const has = m.roleIds.includes(r.id);
                            return (
                              <Dropdown.Item key={r.id} id={r.id} textValue={r.name} onAction={() => void toggleMemberRole(serverId, m.userId, r.id, !has)}>
                                <span className="size-2.5 rounded-full" style={{ background: r.color }} aria-hidden />
                                <Label>{r.name}</Label>
                                {has && <Check className="ms-auto size-4 text-accent" aria-hidden />}
                              </Dropdown.Item>
                            );
                          })}
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                  )}
                </span>
                <Dropdown>
                  <Button isIconOnly size="sm" variant="ghost" aria-label={t.guild.membersPage.actions} className="text-muted">
                    <Ellipsis className="size-4.5" aria-hidden />
                  </Button>
                  <Dropdown.Popover placement="bottom end" className="min-w-56">
                    <MenuSections sections={menu(m.userId)} />
                  </Dropdown.Popover>
                </Dropdown>
              </li>
            );
          })}
        </ul>
        {list.length === 0 && <p className="py-10 text-center text-sm text-muted">{t.guild.membersPage.none}</p>}
      </div>
    </div>
  );
}
