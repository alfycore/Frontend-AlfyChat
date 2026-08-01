'use client';

/**
 * Container : rail de serveurs alfy branché sur les vraies données.
 * Les composants alfy restent présentationnels ; toute la logique
 * (chargement, navigation) vit ici.
 */

import { useRouter } from 'next/navigation';

import { ServerRail } from '@/components/alfy/servers/server-rail';
import { useAlfyServers } from '@/components/alfy/live/use-alfy-servers';

interface AlfyServerRailProps {
  activeServerId: string | null;
  orientation?: 'vertical' | 'horizontal';
  onToggleOrientation?: () => void;
}

export function AlfyServerRail({ activeServerId, orientation, onToggleOrientation }: AlfyServerRailProps) {
  const router = useRouter();
  const { servers, dmUnread } = useAlfyServers();

  return (
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
    />
  );
}
