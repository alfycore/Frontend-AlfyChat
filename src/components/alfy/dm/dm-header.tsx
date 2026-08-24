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
import { Menu, Phone, UserRound, Users, Video, type LucideIcon } from 'lucide-react';

import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { E2eBadge } from '@/components/alfy/primitives/e2e-badge';
import { PinsPanel } from '@/components/alfy/chat/pins-panel';
import { SearchPanel } from '@/components/alfy/chat/search-panel';
import { NotificationCenter } from '@/components/alfy/notifications/notification-center';
import { ChannelNotifSettings } from '@/components/alfy/notifications/channel-notif-settings';
import type { AlfyMessage } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';

interface DmHeaderProps {
  conversationId: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  avatarName: string;
  /** Remplace l'avatar par une icône (salon de serveur). */
  icon?: LucideIcon;
  /** 'group'/'channel' pilotent le libellé des réglages de notif. */
  notifTargetType?: 'dm' | 'group' | 'channel';
  /** false pour les salons de serveur — masque le badge de chiffrement. */
  encrypted?: boolean;
  messages: AlfyMessage[];
  /** Ramène au message ; renvoie false s'il n'est pas dans la page chargée. */
  onJumpToMessage?: (messageId: string) => boolean | void;
  onOpenNav?: () => void;
  onOpenProfile?: () => void;
  onToggleMembers?: () => void;
  membersOpen?: boolean;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
}

export function DmHeader({
  conversationId,
  title,
  subtitle,
  avatarUrl,
  avatarName,
  icon,
  notifTargetType = 'dm',
  encrypted = true,
  messages,
  onJumpToMessage,
  onOpenNav,
  onOpenProfile,
  onToggleMembers,
  membersOpen,
  onStartVoiceCall,
  onStartVideoCall,
}: DmHeaderProps) {
  const { t } = useTranslation();

  const Icon = icon;

  /* Identité du fil : avatar/croisillon + nom. Cliquable seulement quand une
     fiche existe — un `<button disabled>` grisâit le titre du salon via la
     feuille de style du navigateur, ce qui le faisait passer pour inactif. */
  const identite = (
    <>
      {Icon ? (
        <Icon className="size-4.5 shrink-0 text-muted" aria-hidden />
      ) : (
        <AlfyAvatar name={avatarName} avatarUrl={avatarUrl} size="sm" />
      )}
      <h2 className="truncate text-sm font-semibold">{title}</h2>
    </>
  );

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-separator bg-surface/85 px-3 backdrop-blur-sm">
      {/* `md:hidden` et non `lg:hidden` : le tiroir n'existe qu'en dessous de
          768 px (useIsMobile), au-delà le bouton n'ouvrait rien. */}
      {onOpenNav && (
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={t.chat.openNav}
          className="shrink-0 text-muted md:hidden"
          onPress={onOpenNav}
        >
          <Menu className="size-4.5" aria-hidden />
        </Button>
      )}

      {/* Un fil privé ou de groupe s'identifie par ses membres ; un salon par un croisillon. */}
      {onOpenProfile ? (
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex min-w-0 cursor-pointer items-center gap-2 rounded-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {identite}
        </button>
      ) : (
        <div className="flex min-w-0 items-center gap-2">{identite}</div>
      )}

      {/* Hors du bouton : le badge porte son propre tooltip. */}
      {encrypted && <E2eBadge className="shrink-0" />}

      {subtitle && (
        <>
          <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />
          <p className="hidden min-w-0 flex-1 truncate text-xs text-muted md:block">{subtitle}</p>
        </>
      )}

      {/* `ml-auto` plutôt qu'une cale `md:hidden` : sans sous-titre (cas d'un
          salon sans sujet), plus rien ne poussait la barre d'actions à droite
          et elle se collait au nom du salon. */}
      <Toolbar aria-label={t.friends.dm.conversationActions} className="ml-auto shrink-0 gap-0.5">
        <ChannelNotifSettings channelId={conversationId} channelName={title} targetType={notifTargetType} />
        {/* Le bandeau de titre porte le centre de notifications à partir de
            `md` : ici on ne le garde que pour les tailles où il est masqué,
            sinon la cloche apparaît deux fois à l'écran. */}
        <span className="md:hidden">
          <NotificationCenter />
        </span>
        <PinsPanel messages={messages} onJump={onJumpToMessage} />
        <SearchPanel messages={messages} channelName={title} onJump={onJumpToMessage} />
        {onToggleMembers && (
          <Tooltip delay={300}>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              className={membersOpen ? 'text-foreground' : 'text-muted'}
              aria-label={t.friends.dm.membersLabel}
              aria-pressed={membersOpen}
              onPress={onToggleMembers}
            >
              <Users className="size-4.5" aria-hidden />
            </Button>
            <Tooltip.Content>
              <p>{t.friends.dm.membersLabel}</p>
            </Tooltip.Content>
          </Tooltip>
        )}
        {onStartVoiceCall && (
          <Tooltip delay={300}>
            <Button isIconOnly size="sm" variant="ghost" className="text-muted" aria-label={t.chat.voiceCall} onPress={onStartVoiceCall}>
              <Phone className="size-4.5" aria-hidden />
            </Button>
            <Tooltip.Content>
              <p>{t.chat.voiceCall}</p>
            </Tooltip.Content>
          </Tooltip>
        )}
        {onStartVideoCall && (
          <Tooltip delay={300}>
            <Button isIconOnly size="sm" variant="ghost" className="text-muted" aria-label={t.chat.videoCall} onPress={onStartVideoCall}>
              <Video className="size-4.5" aria-hidden />
            </Button>
            <Tooltip.Content>
              <p>{t.chat.videoCall}</p>
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
              aria-label={t.friends.dm.viewProfile}
              onPress={onOpenProfile}
            >
              <UserRound className="size-4.5" aria-hidden />
            </Button>
            <Tooltip.Content>
              <p>{t.friends.dm.viewProfile}</p>
            </Tooltip.Content>
          </Tooltip>
        )}
      </Toolbar>
    </header>
  );
}
