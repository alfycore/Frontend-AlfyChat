'use client';

import { Button, ScrollShadow, SearchField } from '@heroui/react';
import { MessageSquareDashed, Pin, PinOff, Plus, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { AlfyDM, AlfyGroupDM, AlfyUser } from '@/components/alfy/mock/types';
import { useUserById } from '@/components/alfy/user-directory';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { EmptyState } from '@/components/alfy/primitives/empty-state';
import { SectionLabel } from '@/components/alfy/primitives/section-label';
import { conversationTime } from '@/components/alfy/chat/date-format';
import { GroupCreateDialog } from '@/components/alfy/people/group-create-dialog';
import { UserDock } from '@/components/alfy/servers/user-dock';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

interface DmSidebarProps {
  dms: AlfyDM[];
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
  // Aucun repli sur le jeu de démonstration : quand les vraies données
  // tardaient, des groupes fictifs apparaissaient dans l'application réelle.
  groups = [],
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
  const { t, tx, intlLocale } = useTranslation();
  const userById = useUserById();
  const [recherche, setRecherche] = useState('');

  const requete = recherche.trim().toLowerCase();

  /* Le champ de recherche existait déjà mais n'était relié à rien : taper
     dedans ne filtrait aucune conversation. */
  const dmsVisibles = useMemo(() => {
    if (!requete) return dms;
    return dms.filter((d) => {
      const u = userById(d.recipientId);
      return (
        u.displayName.toLowerCase().includes(requete) ||
        u.username.toLowerCase().includes(requete)
      );
    });
  }, [dms, requete, userById]);

  const groupesVisibles = useMemo(() => {
    if (!requete) return groups;
    return groups.filter((g) => {
      if (g.name?.toLowerCase().includes(requete)) return true;
      return g.memberIds.some((id) => userById(id).displayName.toLowerCase().includes(requete));
    });
  }, [groups, requete, userById]);

  const pinnedDms = dmsVisibles.filter((d) => pinnedIds.includes(d.id));
  const unpinnedDms = dmsVisibles.filter((d) => !pinnedIds.includes(d.id));
  const aucunResultat = dmsVisibles.length === 0 && groupesVisibles.length === 0;

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
            {/* Hauteur réservée même sans dernier message : sinon une
                conversation vide tenait sur une ligne au lieu de deux et la
                liste partait en marches d'escalier. */}
            <span
              className={cn(
                'block h-4 truncate text-[11px] leading-4',
                dm.unreadCount > 0 ? 'text-foreground/70' : 'text-muted',
              )}
            >
              {dm.lastMessage}
            </span>
          </span>
        </button>

        {/* Fente unique horodatage / épingle : largeur figée, donc aucun
            décalage de la ligne au survol. */}
        <span className="flex shrink-0 items-center gap-1">
          <span className="relative flex h-6 w-9 items-center justify-end">
            <span
              className={cn(
                'text-[10px] text-muted tabular-nums',
                onTogglePin && 'group-hover/dm:opacity-0 group-focus-within/dm:opacity-0',
              )}
            >
              {conversationTime(intlLocale, dm.lastMessageAt)}
            </span>
            {onTogglePin && (
              <button
                type="button"
                aria-label={pinned ? t.dmSidebar.unpinAria : t.dmSidebar.pinAria}
                aria-pressed={pinned}
                onClick={() => onTogglePin(dm.id)}
                className={cn(
                  'absolute inset-y-0 right-0 hidden cursor-pointer items-center rounded-sm px-0.5 outline-none transition-colors',
                  'group-hover/dm:flex group-focus-within/dm:flex focus-visible:ring-2 focus-visible:ring-focus',
                  pinned ? 'text-accent' : 'text-muted hover:text-foreground',
                )}
              >
                {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
              </button>
            )}
          </span>
          {dm.unreadCount > 0 && (
            <span className="flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-(--accent-foreground)">
              {dm.unreadCount}
            </span>
          )}
        </span>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col bg-surface-secondary/35">
      {/* Recherche */}
      <div className="px-3 pt-3 pb-2">
        <SearchField value={recherche} onChange={setRecherche} aria-label={t.dmSidebar.searchAria}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder={t.dmSidebar.searchPlaceholder} />
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
            'transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-focus',
            friendsActive
              ? 'bg-accent/12 text-foreground'
              : 'text-muted hover:bg-surface-secondary hover:text-foreground',
          )}
        >
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full transition-colors',
              friendsActive
                ? 'bg-accent text-(--accent-foreground)'
                : 'bg-surface-tertiary text-muted group-hover:text-foreground',
            )}
          >
            <Users className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate text-left">{t.dmSidebar.friends}</span>
          {pendingCount > 0 && (
            <span
              aria-label={tx(t.dmSidebar.pendingRequestsAria, { n: pendingCount })}
              className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-semibold text-(--danger-foreground)"
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
              {t.dmSidebar.pinned}
            </SectionLabel>
            <div className="flex flex-col gap-0.5">{pinnedDms.map(renderDm)}</div>
          </div>
        )}

        {/* Groupes */}
        {groupesVisibles.length > 0 && (
          <div className="mb-2">
            <SectionLabel className="mb-1">{t.dmSidebar.groups}</SectionLabel>
            <div className="flex flex-col gap-0.5">
              {groupesVisibles.map((g) => {
                const others = g.memberIds.filter((id) => id !== currentUser.id && id !== 'u-me');
                const names =
                  g.name?.trim() ||
                  others.map((id) => userById(id).displayName).join(', ') ||
                  t.dmSidebar.defaultGroupName;
                const subtitle = g.lastMessage?.trim()
                  ? g.lastMessage
                  : tx(t.memberList.memberCountPlural, {
                      n: g.memberIds.length || others.length + 1,
                    });
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
                      <span
                        className={cn(
                          'block truncate text-sm',
                          g.unreadCount > 0 ? 'font-semibold' : 'font-medium text-foreground/85',
                        )}
                      >
                        {names}
                      </span>
                      <span className="block h-4 truncate text-[11px] leading-4 text-muted">
                        {subtitle}
                      </span>
                    </span>
                    {g.unreadCount > 0 && (
                      <span className="flex min-w-4 shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-(--accent-foreground)">
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
          <SectionLabel>{t.dmSidebar.directMessages}</SectionLabel>
          <GroupCreateDialog
            trigger={
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label={t.dmSidebar.newGroupAria}
                className="size-6 text-muted hover:text-foreground"
              >
                <Plus className="size-3.5" />
              </Button>
            }
          />
        </div>

        <div className="flex flex-col gap-0.5">{unpinnedDms.map(renderDm)}</div>

        {/* Une liste vide ne doit pas être indiscernable d'un chargement raté. */}
        {aucunResultat && (
          <EmptyState
            className="py-8"
            icon={requete ? Search : MessageSquareDashed}
            title={requete ? t.friends.noResults : t.friends.noFriends}
            description={requete ? t.friends.noResultsHint : t.friends.addFriendsHint}
          />
        )}
      </ScrollShadow>

      <div className="p-2">
        <UserDock user={currentUser} onOpenSettings={onOpenUserSettings} />
      </div>
    </div>
  );
}
