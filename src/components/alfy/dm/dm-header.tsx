'use client';

/**
 * Bandeau du fil privé.
 *
 * Reprend la barre d'actions du salon, mais branchée pour de bon : les
 * panneaux « épinglés » et « recherche » exposaient déjà un `onJump` que
 * l'ancien en-tête ne fournissait jamais — cliquer un résultat ne faisait donc
 * rien. Ici il ramène réellement au message, qui est surligné le temps d'être
 * repéré.
 */

import { Button, Separator, Toolbar, Tooltip } from '@heroui/react';
import { Menu, Phone, UserRound, Video } from 'lucide-react';

import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { E2eBadge } from '@/components/alfy/primitives/e2e-badge';
import { PinsPanel } from '@/components/alfy/chat/pins-panel';
import { SearchPanel } from '@/components/alfy/chat/search-panel';
import { NotificationCenter } from '@/components/alfy/notifications/notification-center';
import { ChannelNotifSettings } from '@/components/alfy/notifications/channel-notif-settings';
import type { AlfyMessage } from '@/components/alfy/mock/types';

interface DmHeaderProps {
  conversationId: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  avatarName: string;
  /** 'group' pour une conversation de groupe — pilote le libellé des réglages de notif. */
  notifTargetType?: 'dm' | 'group';
  messages: AlfyMessage[];
  /** Ramène au message ; renvoie false s'il n'est pas dans la page chargée. */
  onJumpToMessage?: (messageId: string) => boolean | void;
  onOpenNav?: () => void;
  onOpenProfile?: () => void;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
}

export function DmHeader({
  conversationId,
  title,
  subtitle,
  avatarUrl,
  avatarName,
  notifTargetType = 'dm',
  messages,
  onJumpToMessage,
  onOpenNav,
  onOpenProfile,
  onStartVoiceCall,
  onStartVideoCall,
}: DmHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-separator bg-surface/85 px-3 backdrop-blur-sm">
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label="Ouvrir la navigation"
        className="text-muted lg:hidden"
        onPress={onOpenNav}
      >
        <Menu className="size-4.5" aria-hidden />
      </Button>

      {/* Un fil privé ou de groupe s'identifie par ses membres, pas par un croisillon. */}
      <button
        type="button"
        onClick={onOpenProfile}
        disabled={!onOpenProfile}
        className="flex min-w-0 items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-focus enabled:cursor-pointer"
      >
        <AlfyAvatar name={avatarName} avatarUrl={avatarUrl} size="sm" />
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        <E2eBadge />
      </button>

      {subtitle && (
        <>
          <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />
          <p className="hidden min-w-0 flex-1 truncate text-xs text-muted md:block">{subtitle}</p>
        </>
      )}
      <div className="min-w-0 flex-1 md:hidden" />

      <Toolbar aria-label="Actions de la conversation" className="shrink-0 gap-0.5">
        <ChannelNotifSettings channelId={conversationId} channelName={title} targetType={notifTargetType} />
        <PinsPanel messages={messages} onJump={onJumpToMessage} />
        <SearchPanel messages={messages} channelName={title} onJump={onJumpToMessage} />
        <NotificationCenter />
        {onStartVoiceCall && (
          <Tooltip delay={300}>
            <Button isIconOnly size="sm" variant="ghost" className="text-muted" aria-label="Appel vocal" onPress={onStartVoiceCall}>
              <Phone className="size-4.5" aria-hidden />
            </Button>
            <Tooltip.Content>
              <p>Appel vocal</p>
            </Tooltip.Content>
          </Tooltip>
        )}
        {onStartVideoCall && (
          <Tooltip delay={300}>
            <Button isIconOnly size="sm" variant="ghost" className="text-muted" aria-label="Appel vidéo" onPress={onStartVideoCall}>
              <Video className="size-4.5" aria-hidden />
            </Button>
            <Tooltip.Content>
              <p>Appel vidéo</p>
            </Tooltip.Content>
          </Tooltip>
        )}
        {onOpenProfile && (
          <Tooltip delay={300}>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              className="text-muted"
              aria-label="Voir le profil"
              onPress={onOpenProfile}
            >
              <UserRound className="size-4.5" aria-hidden />
            </Button>
            <Tooltip.Content>
              <p>Voir le profil</p>
            </Tooltip.Content>
          </Tooltip>
        )}
      </Toolbar>
    </header>
  );
}
