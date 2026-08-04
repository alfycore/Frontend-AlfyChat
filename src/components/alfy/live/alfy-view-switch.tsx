'use client';

/**
 * Aiguillage par type de salon, sur les vraies données.
 * Remplace atelier/views/ViewSwitch.tsx.
 *
 * Les salons texte/annonce passent par le chat alfy ; les types spéciaux
 * rendent leur vue dédiée, alimentée par la même primitive de messages
 * de serveur (`useAlfyServerMessages`).
 */

import { ScrollShadow } from '@heroui/react';

import { AlfyServerChat } from '@/components/alfy/live/alfy-server-chat';
import { AlfyVoiceChannelView } from '@/components/alfy/live/alfy-voice-channel-view';
import { ChatHeader } from '@/components/alfy/chat/chat-header';
import { SPECIAL_VIEWS, type SpecialViewType } from '@/components/alfy/chat/special-views';
import { useAlfyChannels } from '@/components/alfy/live/use-alfy-channels';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { toChannelType } from '@/components/alfy/live/map';
import type { AlfyChannel } from '@/components/alfy/mock/types';

interface AlfyViewSwitchProps {
  serverId: string;
  channelId: string;
  channelName?: string;
  channelType: string;
}

/** Types rendus par le chat classique (les autres ont une vue dédiée). */
const CHAT_TYPES = new Set(['text', 'announcement']);

export function AlfyViewSwitch({ serverId, channelId, channelName, channelType }: AlfyViewSwitchProps) {
  const { isMobile, openSidebar, toggleMemberList, toggleMemberListDesktop, memberListDesktopVisible } =
    useMobileNav();
  const server = useAlfyChannels(serverId);

  // Salon vocal : rejoint/crée l'appel SFU du salon — pas un chat texte.
  // (Les salons stage ne sont pas encore traités séparément : ils retombent
  // sur le chat classique comme avant, en attendant leur propre vue.)
  if (channelType === 'voice') {
    return <AlfyVoiceChannelView serverId={serverId} channelId={channelId} channelName={channelName} />;
  }

  if (CHAT_TYPES.has(channelType)) {
    return (
      <AlfyServerChat
        serverId={serverId}
        channelId={channelId}
        channelName={channelName}
        channelType={channelType}
      />
    );
  }

  const entry = SPECIAL_VIEWS[channelType as SpecialViewType];
  if (!entry) {
    // Type inconnu : on retombe sur le chat plutôt que d'afficher du vide.
    return <AlfyServerChat serverId={serverId} channelId={channelId} channelName={channelName} />;
  }

  const View = entry.Component;
  const channel: AlfyChannel =
    server?.channels.find((c) => c.id === channelId) ?? {
      id: channelId,
      serverId,
      name: channelName ?? 'salon',
      type: toChannelType(channelType),
      categoryId: null,
      unreadCount: 0,
      mentionCount: 0,
    };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-surface">
      <ChatHeader
        channel={channel}
        onToggleMembers={isMobile ? toggleMemberList : toggleMemberListDesktop}
        membersOpen={memberListDesktopVisible}
        onOpenNav={openSidebar}
      />
      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto" orientation="vertical">
        <View serverId={serverId} channelId={channelId} />
      </ScrollShadow>
    </div>
  );
}
