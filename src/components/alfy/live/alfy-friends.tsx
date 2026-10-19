'use client';

/**
 * Conteneur de la page Amis (/channels/me) : données d'amis + gestes, sur la
 * vue `FriendsHome`. Retirer / bloquer rafraîchissent la liste.
 */

import { toast } from '@heroui/react';
import { useCallback, useMemo } from 'react';

import { api } from '@/lib/api';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { FriendsHome } from '@/components/alfy/people/friends-home';
import { UserDirectoryProvider, makeResolver } from '@/components/alfy/user-directory';
import { useAlfyFriends } from '@/components/alfy/live/use-alfy-friends';
import type { AlfyUser } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';

export function AlfyFriends() {
  const { t, tx } = useTranslation();
  const { isMobile, openSidebar } = useMobileNav();
  const { friends, pending, blocked, accept, decline, add, unblock, reload } = useAlfyFriends();

  const resolver = useMemo(() => {
    const table = new Map<string, AlfyUser>();
    [...friends, ...blocked, ...pending.map((p) => p.user)].forEach((u) => table.set(u.id, u));
    return makeResolver(table);
  }, [friends, blocked, pending]);

  const nameOf = useCallback((id: string) => resolver(id).displayName, [resolver]);

  const remove = useCallback(
    async (userId: string) => {
      const res = await api.removeFriend(userId).catch(() => null);
      if (res?.success === false) return toast.danger(res.error || t.guild.errors.default);
      toast(tx(t.home.done.removed, { name: nameOf(userId) }));
      void reload();
    },
    [nameOf, reload, t, tx],
  );
  const block = useCallback(
    async (userId: string) => {
      const res = await api.blockUser(userId).catch(() => null);
      if (res?.success === false) return toast.danger(res.error || t.guild.errors.default);
      toast(tx(t.home.done.blocked, { name: nameOf(userId) }));
      void reload();
    },
    [nameOf, reload, t, tx],
  );

  return (
    <UserDirectoryProvider value={resolver}>
      <FriendsHome
        friends={friends}
        pending={pending}
        blocked={blocked}
        onOpenNav={isMobile ? openSidebar : undefined}
        onAccept={(requestId) => void accept(requestId)}
        onDecline={(requestId) => void decline(requestId)}
        onAddFriend={(username) => add(username)}
        onUnblock={(userId) => {
          void unblock(userId);
          toast(tx(t.home.done.unblocked, { name: nameOf(userId) }));
        }}
        onRemove={(userId) => void remove(userId)}
        onBlock={(userId) => void block(userId)}
      />
    </UserDirectoryProvider>
  );
}
