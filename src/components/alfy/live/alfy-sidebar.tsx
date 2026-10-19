'use client';

/**
 * Colonne des messages privés (amis, MP, groupes), branchée sur les vraies
 * données. La colonne d'un serveur est `guild/sidebar/guild-sidebar.tsx`.
 */

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import { DmSidebar } from '@/components/alfy/servers/dm-sidebar';
import { UserDirectoryProvider, makeResolver } from '@/components/alfy/user-directory';
import { useAlfyDms } from '@/components/alfy/live/use-alfy-dms';
import { usePinnedConversations } from '@/components/alfy/live/use-pinned-conversations';
import { toAlfyUser } from '@/components/alfy/live/map';
import type { AlfyUser } from '@/components/alfy/mock/types';

interface AlfySidebarProps {
  activeDmId: string | null;
  friendsActive: boolean;
}

export function AlfySidebar({ activeDmId, friendsActive }: AlfySidebarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { entries, groups } = useAlfyDms();
  const { pinnedIds, togglePin } = usePinnedConversations();

  const currentUser: AlfyUser = useMemo(() => toAlfyUser(user as Record<string, unknown> | null, 'me'), [user]);

  // Annuaire réel : destinataires des MP + soi-même.
  const resolver = useMemo(() => {
    const table = new Map<string, AlfyUser>();
    entries.forEach((e) => table.set(e.user.id, e.user));
    if (currentUser.id) table.set(currentUser.id, currentUser);
    return makeResolver(table);
  }, [entries, currentUser]);

  return (
    <UserDirectoryProvider value={resolver}>
      <DmSidebar
        dms={entries.map((e) => e.dm)}
        groups={groups}
        onSelectGroup={(id) => router.push(`/channels/groups/${id}`)}
        currentUser={currentUser}
        activeDmId={activeDmId}
        friendsActive={friendsActive}
        onSelectDm={(id) => {
          const entry = entries.find((e) => e.dm.id === id);
          if (entry) router.push(`/channels/me/${entry.dm.recipientId}`);
        }}
        onOpenFriends={() => router.push('/channels/me')}
        pinnedIds={pinnedIds}
        onTogglePin={togglePin}
      />
    </UserDirectoryProvider>
  );
}
