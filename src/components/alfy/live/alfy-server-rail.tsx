'use client';

/**
 * Container : rail de serveurs alfy branché sur les vraies données.
 * Les composants alfy restent présentationnels ; toute la logique
 * (chargement, navigation) vit ici.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ServerRail } from '@/components/alfy/servers/server-rail';
import { CreateServerDialog } from '@/components/alfy/servers/create-server-dialog';
import { JoinServerDialog } from '@/components/alfy/servers/join-server-dialog';
import { useAlfyServers } from '@/components/alfy/live/use-alfy-servers';

interface AlfyServerRailProps {
  activeServerId: string | null;
  orientation?: 'vertical' | 'horizontal';
  onToggleOrientation?: () => void;
}

export function AlfyServerRail({ activeServerId, orientation, onToggleOrientation }: AlfyServerRailProps) {
  const router = useRouter();
  const { servers, dmUnread } = useAlfyServers();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <>
      <ServerRail
        servers={servers}
        activeServerId={activeServerId}
        dmUnreadCount={dmUnread}
        orientation={orientation}
        onToggleOrientation={onToggleOrientation}
        onSelectServer={(id) => {
          if (!id) router.push('/channels/me');
          else router.push(`/channels/server/${id}`);
        }}
        onDiscover={() => router.push('/channels/discover-server')}
        onCreate={() => setCreateOpen(true)}
        onJoin={() => setJoinOpen(true)}
      />
      <CreateServerDialog
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(server) => router.push(`/channels/server/${server.id}`)}
      />
      <JoinServerDialog
        isOpen={joinOpen}
        onOpenChange={setJoinOpen}
        onJoined={(server) => router.push(`/channels/server/${server.id}`)}
      />
    </>
  );
}
