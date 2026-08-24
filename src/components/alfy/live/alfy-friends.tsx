'use client';

/**
 * Container : page Amis branchée sur les vraies données.
 * Remplace atelier/people/FriendsHome.tsx.
 */

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { useMobileNav } from '@/hooks/use-mobile-nav';
import { FriendsView } from '@/components/alfy/people/friends-view';
import { UserDirectoryProvider, makeResolver } from '@/components/alfy/user-directory';
import { useAlfyFriends } from '@/components/alfy/live/use-alfy-friends';
import type { AlfyUser } from '@/components/alfy/mock/types';

export function AlfyFriends() {
  const router = useRouter();
  const { isMobile, openSidebar } = useMobileNav();
  const { friends, pending, blocked, accept, decline, add, unblock } = useAlfyFriends();

  const resolver = useMemo(() => {
    const table = new Map<string, AlfyUser>();
    [...friends, ...blocked, ...pending.map((p) => p.user)].forEach((u) => table.set(u.id, u));
    return makeResolver(table);
  }, [friends, blocked, pending]);

  return (
    <UserDirectoryProvider value={resolver}>
      <FriendsView
        friends={friends}
        pending={pending}
        blocked={blocked}
        onMessage={(userId) => router.push(`/channels/me/${userId}`)}
        onOpenNav={isMobile ? openSidebar : undefined}
        onAccept={(requestId) => void accept(requestId)}
        onDecline={(requestId) => void decline(requestId)}
        onAddFriend={(username) => add(username)}
        onUnblock={(userId) => void unblock(userId)}
      />
    </UserDirectoryProvider>
  );
}
