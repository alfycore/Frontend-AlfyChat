'use client';

import { Button, Separator, Toolbar, Tooltip } from '@heroui/react';
import {
  BarChart3,
  FileText,
  Gamepad2,
  Hash,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  Lightbulb,
  Megaphone,
  Menu,
  MessagesSquare,
  PlaySquare,
  Sigma,
  Users,
  Volume2,
} from 'lucide-react';

import type { AlfyChannel, AlfyChannelType, AlfyMessage } from '@/components/alfy/mock/types';
import { E2eBadge } from '@/components/alfy/primitives/e2e-badge';
import { PinsPanel } from '@/components/alfy/chat/pins-panel';
import { SearchPanel } from '@/components/alfy/chat/search-panel';
import { NotificationCenter } from '@/components/alfy/notifications/notification-center';
import { ChannelNotifSettings } from '@/components/alfy/notifications/channel-notif-settings';
import { useTranslation } from '@/components/locale-provider';

const ICONS: Record<AlfyChannelType, typeof Hash> = {
  text: Hash,
  voice: Volume2,
  announcement: Megaphone,
  forum: MessagesSquare,
  gallery: ImageIcon,
  media: PlaySquare,
  doc: FileText,
  poll: BarChart3,
  counting: Sigma,
  minigame: Gamepad2,
  trivia: HelpCircle,
  suggestion: Lightbulb,
  vent: Heart,
};

interface ChatHeaderProps {
  channel: AlfyChannel;
  messages?: AlfyMessage[];
  onToggleMembers?: () => void;
  membersOpen?: boolean;
  /** Ouvre le tiroir de navigation (mobile). */
  onOpenNav?: () => void;
}

export function ChatHeader({ channel, messages = [], onToggleMembers, membersOpen, onOpenNav }: ChatHeaderProps) {
  const { t } = useTranslation();
  const Icon = ICONS[channel.type];
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-separator bg-surface/85 px-3 backdrop-blur-sm">
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={t.chat.openNav}
        className="text-muted lg:hidden"
        onPress={onOpenNav}
      >
        <Menu className="size-4.5" />
      </Button>

      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-4.5 shrink-0 text-muted" aria-hidden />
        <h2 className="truncate text-sm font-semibold">{channel.name}</h2>
        <E2eBadge />
      </div>

      {channel.topic && (
        <>
          <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />
          <p className="hidden min-w-0 flex-1 truncate text-xs text-muted md:block">{channel.topic}</p>
        </>
      )}
      <div className="min-w-0 flex-1 md:hidden" />

      <Toolbar aria-label={t.chat.channelActions} className="shrink-0 gap-0.5">
        <ChannelNotifSettings channelId={channel.id} channelName={channel.name} />
        <PinsPanel messages={messages} />
        <SearchPanel messages={messages} channelName={channel.name} />
        <NotificationCenter />
        <Tooltip delay={300}>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={membersOpen ? t.chat.hideMembers : t.chat.showMembers}
            className={membersOpen ? 'text-foreground' : 'text-muted'}
            onPress={onToggleMembers}
          >
            <Users className="size-4.5" />
          </Button>
          <Tooltip.Content>
            <p>{membersOpen ? t.chat.hideMembers : t.chat.showMembers}</p>
          </Tooltip.Content>
        </Tooltip>
      </Toolbar>
    </header>
  );
}
