'use client';

/**
 * Réglages du serveur — Rôles.
 * Liste triable (glisser-déposer = hiérarchie), @everyone à part
 * (« Permissions par défaut »), éditeur à droite quand un rôle est ouvert.
 */

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, SearchField, Tooltip } from '@heroui/react';
import { ArrowLeft, ChevronRight, GripVertical, Lock, Plus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/alfy/guild/kit';
import { createRole, reorderRoles } from '@/components/alfy/guild/actions';
import { useGuildMembers, useGuildRoles, useMyPerms, useGuildMember } from '@/components/alfy/guild/hooks';
import { useAuth } from '@/hooks/use-auth';
import { topPosition } from '@/components/alfy/guild/members/member-menu';
import { useSettingsGuard } from '@/components/alfy/guild/settings/settings-layer';
import { RoleEditor, DEFAULT_ROLE_COLOR } from '@/components/alfy/guild/settings/server/role-editor';
import type { GuildRole } from '@/components/alfy/guild/types';

function RoleRow({
  role,
  count,
  editable,
  active,
  sortable,
  onOpen,
}: {
  role: GuildRole;
  count: number;
  editable: boolean;
  active: boolean;
  sortable: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: role.id, disabled: !sortable });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('group/role relative', isDragging && 'z-10 opacity-70')}
    >
      <div
        className={cn(
          'flex h-11 items-center gap-2 rounded-md pr-2 pl-1 transition-colors duration-(--dur-1)',
          active ? 'bg-foreground/10' : 'hover:bg-foreground/6',
        )}
      >
        <span
          {...(sortable ? { ...attributes, ...listeners } : {})}
          aria-label={sortable ? t.guild.roles.dragToReorder : undefined}
          className={cn('flex w-5 shrink-0 justify-center text-muted', sortable ? 'cursor-grab opacity-0 group-hover/role:opacity-100 active:cursor-grabbing' : 'opacity-0')}
        >
          <GripVertical className="size-4" aria-hidden />
        </span>
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus">
          <span className="size-3 shrink-0 rounded-full" style={{ background: role.color || DEFAULT_ROLE_COLOR }} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
            {role.iconEmoji ? `${role.iconEmoji} ` : ''}
            {role.name}
          </span>
          {!editable && (
            <Tooltip delay={300} closeDelay={0}>
              <Lock className="size-3.5 shrink-0 text-muted" aria-label={t.guild.roles.aboveYou} />
              <Tooltip.Content>
                <p>{t.guild.roles.aboveYou}</p>
              </Tooltip.Content>
            </Tooltip>
          )}
          <span className="flex shrink-0 items-center gap-1 text-sm text-muted tabular-nums">
            {count}
            <Users className="size-3.5" aria-hidden />
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
        </button>
      </div>
    </li>
  );
}

export function RolesPage({ serverId, initialRoleId }: { serverId: string; initialRoleId?: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const roles = useGuildRoles(serverId);
  const members = useGuildMembers(serverId);
  const perms = useMyPerms(serverId);
  const me = useGuildMember(serverId, user?.id);
  const guard = useSettingsGuard();
  const [selected, setSelected] = useState<string | null>(initialRoleId ?? null);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const everyone = roles.find((r) => r.isDefault);
  const others = useMemo(() => roles.filter((r) => !r.isDefault).sort((a, b) => b.position - a.position), [roles]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of Object.values(members)) for (const r of m.roleIds) map.set(r, (map.get(r) ?? 0) + 1);
    return map;
  }, [members]);
  const myTop = perms.isOwner ? Number.MAX_SAFE_INTEGER : topPosition(me?.roleIds ?? [], roles);
  const canManage = perms.can('MANAGE_ROLES');
  // Hiérarchie : on ne modifie que les rôles strictement sous le sien (@everyone toujours).
  const editable = (r: GuildRole) => canManage && (perms.isOwner || r.isDefault || r.position < myTop);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = others.map((r) => r.id);
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from < 0 || to < 0) return;
    const next = arrayMove(ids, from, to);
    // Du haut vers le bas : n … 1 (@everyone reste à 0).
    const positions = next.map((id, i) => ({ id, position: next.length - i }));
    const changed = positions.filter((p) => others.find((r) => r.id === p.id)?.position !== p.position);
    if (changed.length) void reorderRoles(serverId, changed);
  };

  const open = (id: string | null) => {
    if (guard.blocked) {
      guard.nudge();
      return;
    }
    setSelected(id);
  };

  const create = async () => {
    setCreating(true);
    const role = await createRole(serverId, { name: t.guild.roles.newRole, color: DEFAULT_ROLE_COLOR, permissions: 0 });
    setCreating(false);
    if (role) setSelected(role.id);
  };

  const current = selected ? roles.find((r) => r.id === selected) : undefined;
  const filtered = others.filter((r) => !query || r.name.toLowerCase().includes(query.toLowerCase()));

  if (current) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit -ml-2 text-muted" onPress={() => open(null)}>
          <ArrowLeft className="size-4" aria-hidden />
          {t.guild.roles.back}
        </Button>
        <div className="flex gap-6">
          <ul className="hidden w-48 shrink-0 flex-col gap-0.5 lg:flex">
            {[...others, ...(everyone ? [everyone] : [])].map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => open(r.id)}
                  className={cn(
                    'flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm outline-none transition-colors duration-(--dur-1) focus-visible:ring-2 focus-visible:ring-focus',
                    r.id === current.id ? 'bg-foreground/10 text-foreground' : 'text-muted hover:bg-foreground/6 hover:text-foreground',
                  )}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden />
                  <span className="truncate font-medium">{r.name}</span>
                </button>
              </li>
            ))}
            {canManage && (
              <li>
                <Button variant="ghost" size="sm" className="mt-1 w-full justify-start text-muted" isPending={creating} onPress={() => void create()}>
                  <Plus className="size-4" aria-hidden />
                  {t.guild.roles.create}
                </Button>
              </li>
            )}
          </ul>
          <RoleEditor key={current.id} serverId={serverId} role={current} editable={editable(current)} onDeleted={() => setSelected(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle description={t.guild.roles.description}>{t.guild.roles.title}</PageTitle>

      {everyone && (
        <button
          type="button"
          onClick={() => open(everyone.id)}
          className="flex w-full cursor-pointer items-center gap-4 rounded-lg border border-separator bg-surface-secondary p-4 text-left outline-none transition-[background-color,box-shadow] duration-(--dur-1) hover:bg-surface-tertiary hover:shadow-sm focus-visible:ring-2 focus-visible:ring-focus"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-muted">
            <Users className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">{t.guild.roles.defaultPerms}</span>
            <span className="block text-sm text-muted">{t.guild.roles.defaultPermsDesc}</span>
          </span>
          <ChevronRight className="size-5 text-muted" aria-hidden />
        </button>
      )}

      <div className="flex items-center gap-3">
        <SearchField value={query} onChange={setQuery} aria-label={t.guild.roles.search} className="flex-1">
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder={t.guild.roles.search} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        {canManage && (
          <Button variant="primary" isPending={creating} onPress={() => void create()}>
            {t.guild.roles.create}
          </Button>
        )}
      </div>

      <p className="-mt-3 text-sm text-muted">{t.guild.roles.hierarchyHint}</p>

      <div>
        <div className="flex h-8 items-center border-b border-separator px-2 text-xs font-bold tracking-[0.02em] text-muted uppercase">
          <span className="flex-1 pl-7">{t.guild.roles.colRoles}</span>
          <span className="pr-6">{t.guild.roles.colMembers}</span>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
          <SortableContext items={filtered.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col pt-1">
              {filtered.map((r) => (
                <RoleRow
                  key={r.id}
                  role={r}
                  count={counts.get(r.id) ?? 0}
                  editable={editable(r)}
                  active={false}
                  sortable={!query && editable(r)}
                  onOpen={() => open(r.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        {others.length === 0 && <p className="py-10 text-center text-sm text-muted">{t.guild.roles.empty}</p>}
      </div>
    </div>
  );
}
