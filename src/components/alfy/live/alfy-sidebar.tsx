'use client';

/**
 * Container de sidebar : salons d'un serveur ou liste des DM,
 * branchés sur les vraies données. Remplace atelier/chrome/Sidebar.tsx.
 */

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import { ChannelSidebar } from '@/components/alfy/servers/channel-sidebar';
import { DmSidebar } from '@/components/alfy/servers/dm-sidebar';
import { UserDirectoryProvider, makeResolver } from '@/components/alfy/user-directory';
import { useAlfyChannels } from '@/components/alfy/live/use-alfy-channels';
import { useAlfyDms } from '@/components/alfy/live/use-alfy-dms';
import { usePinnedConversations } from '@/components/alfy/live/use-pinned-conversations';
import { toAlfyUser } from '@/components/alfy/live/map';
import type { AlfyUser } from '@/components/alfy/mock/types';

interface AlfySidebarProps {
  serverId: string | null;
  activeChannelId: string | null;
  activeDmId: string | null;
  friendsActive: boolean;
  onOpenServerSettings: () => void;
  onOpenUserSettings: () => void;
}

export function AlfySidebar({
  serverId,
  activeChannelId,
  activeDmId,
  friendsActive,
  onOpenServerSettings,
  onOpenUserSettings,
}: AlfySidebarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const server = useAlfyChannels(serverId);
  const { entries, groups } = useAlfyDms();
  const { pinnedIds, togglePin } = usePinnedConversations();

  const currentUser: AlfyUser = useMemo(
    () => toAlfyUser(user as Record<string, unknown> | null, 'me'),
    [user],
  );

  // Annuaire réel : destinataires des DM + soi-même.
  const resolver = useMemo(() => {
    const table = new Map<string, AlfyUser>();
    entries.forEach((e) => table.set(e.user.id, e.user));
    if (currentUser.id) table.set(currentUser.id, currentUser);
    return makeResolver(table);
  }, [entries, currentUser]);

  const content =
    serverId && server ? (
      <ChannelSidebar
        server={server}
        currentUser={currentUser}
        activeChannelId={activeChannelId}
        onSelectChannel={(id) => router.push(`/channels/server/${serverId}/${id}`)}
        onOpenServerSettings={onOpenServerSettings}
        onOpenUserSettings={onOpenUserSettings}
        connectedVoiceChannel={null}
      />
    ) : (
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
        onOpenUserSettings={onOpenUserSettings}
        pinnedIds={pinnedIds}
        onTogglePin={togglePin}
      />
    );

  return <UserDirectoryProvider value={resolver}>{content}</UserDirectoryProvider>;
}
