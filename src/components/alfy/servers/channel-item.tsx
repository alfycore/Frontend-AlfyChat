'use client';

import {
  BarChart3,
  FileText,
  Gamepad2,
  Hash,
  HelpCircle,
  Heart,
  Image as ImageIcon,
  Lightbulb,
  Megaphone,
  MessagesSquare,
  PlaySquare,
  Sigma,
  Volume2,
} from 'lucide-react';
import { motion } from 'motion/react';

import type { AlfyChannel, AlfyChannelType } from '@/components/alfy/mock/types';
import { SPRING } from '@/components/alfy/motion';
import { cn } from '@/lib/utils';

export const CHANNEL_TYPE_ICONS: Record<AlfyChannelType, typeof Hash> = {
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

interface ChannelItemProps {
  channel: AlfyChannel;
  active: boolean;
  onSelect: (id: string) => void;
}

export function ChannelItem({ channel, active, onSelect }: ChannelItemProps) {
  const Icon = CHANNEL_TYPE_ICONS[channel.type];
  const unread = channel.unreadCount > 0;
  return (
    <button
      type="button"
      onClick={() => onSelect(channel.id)}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'group relative flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-[5px] text-sm outline-none',
        'transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-(--focus)',
        active
          ? 'bg-(--accent)/12 font-medium text-foreground'
          : unread
            ? 'font-medium text-foreground hover:bg-surface-secondary'
            : 'text-muted hover:bg-surface-secondary hover:text-foreground',
      )}
    >
      {/* Barrette active — voyage d'un salon à l'autre via layoutId */}
      {active && (
        <motion.span
          layoutId="channel-active-bar"
          transition={SPRING.indicator}
          aria-hidden
          className="absolute top-1/2 -left-2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-(--accent)"
        />
      )}
      <Icon
        className={cn('size-4 shrink-0', active ? 'text-(--accent)' : 'opacity-60')}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-left">{channel.name}</span>
      {channel.mentionCount > 0 ? (
        <span
          aria-label={`${channel.mentionCount} mentions`}
          className="flex min-w-4.5 items-center justify-center rounded-full bg-danger px-1.5 py-px text-[10px] font-semibold text-(--danger-foreground)"
        >
          {channel.mentionCount}
        </span>
      ) : (
        unread &&
        !active && (
          <span aria-label="Non lu" className="size-1.5 shrink-0 rounded-full bg-foreground/80" />
        )
      )}
    </button>
  );
}
