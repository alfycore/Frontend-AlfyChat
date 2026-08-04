'use client';

/**
 * Container : page d'accueil d'un serveur (aucun salon sélectionné),
 * branchée sur les vraies données. Remplace l'ancienne page basée sur
 * components/chat/server-overview-sections.tsx (hors système alfy/HeroUI).
 */

import { Spinner } from '@heroui/react';
import { useRouter } from 'next/navigation';

import { ServerHome } from '@/components/alfy/servers/server-home';
import { useAlfyChannels } from '@/components/alfy/live/use-alfy-channels';
import { useAlfyMembers } from '@/components/alfy/live/use-alfy-members';

export function AlfyServerHome({ serverId }: { serverId: string }) {
  const router = useRouter();
  const server = useAlfyChannels(serverId);
  const { members, users } = useAlfyMembers(serverId);

  if (!server) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <ServerHome
      server={server}
      members={members}
      users={users}
      onOpenChannel={(channelId) => router.push(`/channels/server/${serverId}/${channelId}`)}
    />
  );
}
