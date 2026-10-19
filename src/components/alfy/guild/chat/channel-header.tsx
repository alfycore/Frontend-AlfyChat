'use client';

/**
 * En-tête d'un salon de serveur : icône + nom, sujet (cliquable pour le lire
 * en entier), puis la barre d'outils Discord — notifications, épingles,
 * liste des membres, recherche, boîte de réception.
 */

import { Button, Modal, Separator, Toolbar, Tooltip } from '@heroui/react';
import { Menu, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { AlfyMarkdown } from '@/components/alfy/chat/markdown';
import { PinsPanel } from '@/components/alfy/chat/pins-panel';
import { SearchPanel } from '@/components/alfy/chat/search-panel';
import { ChannelNotifSettings } from '@/components/alfy/notifications/channel-notif-settings';
import { NotificationCenter } from '@/components/alfy/notifications/notification-center';
import type { AlfyMessage } from '@/components/alfy/mock/types';
import { CHANNEL_ICONS } from '@/components/alfy/guild/channel-icons';
import type { GuildChannel } from '@/components/alfy/guild/types';

export function HeaderButton({
  label,
  onPress,
  active,
  children,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip delay={300} closeDelay={0}>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={label}
        aria-pressed={active}
        onPress={onPress}
        className={cn('size-8 min-w-8 transition-colors duration-(--dur-1)', active ? 'text-foreground' : 'text-muted hover:text-foreground')}
      >
        {children}
      </Button>
      <Tooltip.Content placement="bottom">
        <p>{label}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}

interface ChannelHeaderProps {
  channel: GuildChannel;
  messages: AlfyMessage[];
  onJump: (id: string) => boolean | void;
  membersOpen: boolean;
  onToggleMembers: () => void;
  onOpenNav?: () => void;
  /** Actions supplémentaires (vue vocale : chat, invitation…). */
  extra?: ReactNode;
}

export function ChannelHeader({ channel, messages, onJump, membersOpen, onToggleMembers, onOpenNav, extra }: ChannelHeaderProps) {
  const { t } = useTranslation();
  const [topicOpen, setTopicOpen] = useState(false);
  const Icon = CHANNEL_ICONS[channel.type] ?? CHANNEL_ICONS.text;

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-separator bg-surface px-3 shadow-[0_1px_0_0_color-mix(in_oklab,var(--foreground)_4%,transparent)]">
      {onOpenNav && (
        <Button isIconOnly size="sm" variant="ghost" aria-label={t.guild.chat.openNav} className="shrink-0 text-muted md:hidden" onPress={onOpenNav}>
          <Menu className="size-5" aria-hidden />
        </Button>
      )}
      <Icon className="size-6 shrink-0 text-muted" aria-hidden />
      <h1 className="shrink-0 truncate text-base font-semibold">{channel.name}</h1>
      {channel.isNsfw && <span className="shrink-0 rounded-sm bg-danger/15 px-1.5 text-[10px] font-bold text-danger">NSFW</span>}
      {channel.topic && (
        <>
          <Separator orientation="vertical" className="mx-1 hidden h-6 md:block" />
          <button
            type="button"
            onClick={() => setTopicOpen(true)}
            className="hidden min-w-0 flex-1 cursor-pointer truncate text-left text-sm text-muted outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus md:block"
          >
            {channel.topic}
          </button>
        </>
      )}

      <Toolbar aria-label={t.guild.chat.toolbar} className="ml-auto shrink-0 gap-0.5">
        {extra}
        <ChannelNotifSettings channelId={channel.id} channelName={channel.name} targetType="channel" />
        <PinsPanel messages={messages} onJump={onJump} />
        <HeaderButton label={membersOpen ? t.guild.chat.hideMembers : t.guild.chat.showMembers} onPress={onToggleMembers} active={membersOpen}>
          <Users className="size-5" aria-hidden />
        </HeaderButton>
        <SearchPanel messages={messages} channelName={channel.name} onJump={onJump} />
        <span className="md:hidden">
          <NotificationCenter />
        </span>
      </Toolbar>

      <Modal isOpen={topicOpen} onOpenChange={setTopicOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-lg">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  <Icon className="size-5 text-muted" aria-hidden />
                  {channel.name}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="text-sm">
                <AlfyMarkdown content={channel.topic ?? ''} />
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </header>
  );
}
