'use client';

import { Button, ScrollShadow, SearchField } from '@heroui/react';
import { Pin, PinOff, Plus, Users } from 'lucide-react';

import { GROUP_DMS } from '@/components/alfy/mock/data';
import type { AlfyDM, AlfyGroupDM, AlfyUser } from '@/components/alfy/mock/types';
import { useUserById } from '@/components/alfy/user-directory';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { SectionLabel } from '@/components/alfy/primitives/section-label';
import { GroupCreateDialog } from '@/components/alfy/people/group-create-dialog';
import { UserDock } from '@/components/alfy/servers/user-dock';
import { cn } from '@/lib/utils';

const relFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

interface DmSidebarProps {
  dms: AlfyDM[];
  /** Groupes réels ; par défaut, jeu de démonstration. */
  groups?: AlfyGroupDM[];
  onSelectGroup?: (id: string) => void;
  currentUser: AlfyUser;
  activeDmId: string | null;
  onSelectDm: (id: string) => void;
  /** Ouvre la vue Amis dans la zone principale. */
  onOpenFriends?: () => void;
  friendsActive?: boolean;
  /** Demandes d'amis en attente (badge). */
  pendingCount?: number;
  onOpenUserSettings?: () => void;
  /** Conversations épinglées (préférence locale). */
  pinnedIds?: string[];
  onTogglePin?: (id: string) => void;
}

export function DmSidebar({
  dms,
  groups = GROUP_DMS,
  onSelectGroup,
  currentUser,
  activeDmId,
  onSelectDm,
  onOpenFriends,
  friendsActive = false,
  pendingCount = 0,
  onOpenUserSettings,
  pinnedIds = [],
  onTogglePin,
}: DmSidebarProps) {
  const userById = useUserById();

  const pinnedDms = dms.filter((d) => pinnedIds.includes(d.id));
  const unpinnedDms = dms.filter((d) => !pinnedIds.includes(d.id));

  /** Une ligne de conversation : bouton principal + épingle en frère
   *  (jamais imbriquée — un bouton dans un bouton est invalide). */
  const renderDm = (dm: AlfyDM) => {
    const user = userById(dm.recipientId);
    const active = dm.id === activeDmId && !friendsActive;
    const pinned = pinnedIds.includes(dm.id);
    return (
      <div
        key={dm.id}
        className={cn(
          'group/dm flex items-center gap-1 rounded-lg pr-1 transition-colors duration-100',
          active ? 'bg-(--accent)/12' : 'hover:bg-surface-secondary',
        )}
      >
        <button
          type="button"
          onClick={() => onSelectDm(dm.id)}
          aria-current={active ? 'true' : undefined}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <AlfyAvatar
            name={user.displayName}
            avatarUrl={user.avatarUrl}
            size="sm"
            status={user.status}
            statusRingClass="ring-surface"
          />
          <span className="min-w-0 flex-1 text-left">
            <span
              className={cn(
                'block truncate text-sm',
                dm.unreadCount > 0 ? 'font-semibold' : 'font-medium text-foreground/85',
              )}
            >
              {user.displayName}
            </span>
            <span
              className={cn(
                'block truncate text-[11px]',
                dm.unreadCount > 0 ? 'text-foreground/70' : 'text-muted',
              )}
            >
              {dm.lastMessage}
            </span>
          </span>
        </button>

        <span className="flex shrink-0 flex-col items-end gap-1">
          {/* L'heure cède la place à l'épingle au survol. */}
          <span
            className={cn(
              'text-[10px] text-muted tabular-nums',
              onTogglePin && 'group-hover/dm:hidden group-focus-within/dm:hidden',
            )}
          >
            {relFmt.format(new Date(dm.lastMessageAt))}
          </span>
          {onTogglePin && (
            <button
              type="button"
              aria-label={pinned ? 'Détacher la conversation' : 'Épingler la conversation'}
              aria-pressed={pinned}
              onClick={() => onTogglePin(dm.id)}
              className={cn(
                'hidden cursor-pointer rounded-sm p-0.5 outline-none transition-colors',
                'group-hover/dm:block group-focus-within/dm:block focus-visible:ring-2 focus-visible:ring-focus',
                pinned ? 'text-accent' : 'text-muted hover:text-foreground',
              )}
            >
              {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            </button>
          )}
          {dm.unreadCount > 0 && (
            <span className="flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-(--accent-foreground)">
              {dm.unreadCount}
            </span>
          )}
        </span>

        {/* Épinglée : marqueur permanent, discret, quand on ne survole pas. */}
        {pinned && (
          <Pin
            className="size-3 shrink-0 text-accent group-hover/dm:hidden"
            aria-hidden
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col bg-surface-secondary/35">
      {/* Recherche */}
      <div className="px-3 pt-3 pb-2">
        <SearchField aria-label="Rechercher une conversation">
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Rechercher" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {/* Bouton Amis — voir tous les amis */}
      <div className="px-2 pb-2">
        <button
          type="button"
          onClick={onOpenFriends}
          aria-current={friendsActive ? 'true' : undefined}
          className={cn(
            'group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium outline-none',
            'transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-(--focus)',
            friendsActive
              ? 'bg-(--accent)/12 text-foreground'
              : 'text-muted hover:bg-surface-secondary hover:text-foreground',
          )}
        >
          <span
            className={cn(
              'flex size-8 items-center justify-center rounded-full transition-colors',
              friendsActive
                ? 'bg-(--accent) text-(--accent-foreground)'
                : 'bg-surface-tertiary text-muted group-hover:text-foreground',
            )}
          >
            <Users className="size-4" aria-hidden />
          </span>
          <span className="flex-1 text-left">Amis</span>
          {pendingCount > 0 && (
            <span
              aria-label={`${pendingCount} demandes en attente`}
              className="flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-semibold text-(--danger-foreground)"
            >
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      <div className="mx-3 h-px bg-separator" />

      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {/* Épinglés — remontés en tête, hors du tri par récence */}
        {pinnedDms.length > 0 && (
          <div className="mb-2">
            <SectionLabel className="mb-1 flex items-center gap-1.5">
              <Pin className="size-3" aria-hidden />
              Épinglés
            </SectionLabel>
            <div className="flex flex-col gap-0.5">{pinnedDms.map(renderDm)}</div>
          </div>
        )}

        {/* Groupes */}
        {groups.length > 0 && (
          <div className="mb-2">
            <SectionLabel className="mb-1">Groupes</SectionLabel>
            <div className="flex flex-col gap-0.5">
              {groups.map((g) => {
                const others = g.memberIds.filter((id) => id !== currentUser.id && id !== 'u-me');
                const names =
                  g.name?.trim() ||
                  others.map((id) => userById(id).displayName).join(', ') ||
                  'Groupe';
                const subtitle = g.lastMessage?.trim()
                  ? g.lastMessage
                  : `${g.memberIds.length || others.length + 1} membres`;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onSelectGroup?.(g.id)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-tertiary">
                      <Users className="size-4 text-muted" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm', g.unreadCount > 0 ? 'font-semibold' : 'font-medium text-foreground/85')}>
                        {names}
                      </span>
                      <span className="block truncate text-[11px] text-muted">{subtitle}</span>
                    </span>
                    {g.unreadCount > 0 && (
                      <span className="flex min-w-4 items-center justify-center rounded-full bg-(--accent) px-1 text-[10px] font-semibold text-(--accent-foreground)">
                        {g.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-1 flex items-center justify-between pr-1">
          <SectionLabel>Messages privés</SectionLabel>
          <GroupCreateDialog
            trigger={
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="Nouveau groupe"
                className="size-6 text-muted hover:text-foreground"
              >
                <Plus className="size-3.5" />
              </Button>
            }
          />
        </div>

        <div className="flex flex-col gap-0.5">
          {unpinnedDms.map(renderDm)}
        </div>
      </ScrollShadow>

      <div className="p-2">
        <UserDock user={currentUser} onOpenSettings={onOpenUserSettings} />
      </div>
    </div>
  );
}
