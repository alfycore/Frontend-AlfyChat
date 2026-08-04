'use client';

import { Dropdown, Label } from '@heroui/react';
import {
  ArrowDown,
  ArrowUp,
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
  MoreVertical,
  PlaySquare,
  Sigma,
  Trash2,
  Pencil,
  Volume2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

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
  /** Gestion — absente pour un lecteur sans droit MANAGE_CHANNELS. */
  canManage?: boolean;
  onRename?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function ChannelItem({
  channel,
  active,
  onSelect,
  canManage = false,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: ChannelItemProps) {
  const Icon = CHANNEL_TYPE_ICONS[channel.type];
  const unread = channel.unreadCount > 0;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        'group/channel relative flex w-full items-center rounded-md',
        active ? 'bg-(--accent)/12' : 'hover:bg-surface-secondary',
      )}
    >
      {active && (
        <motion.span
          layoutId="channel-active-bar"
          transition={SPRING.indicator}
          aria-hidden
          className="absolute top-1/2 -left-2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-(--accent)"
        />
      )}
      <button
        type="button"
        onClick={() => onSelect(channel.id)}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 py-[5px] text-sm outline-none',
          'transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-(--focus)',
          active
            ? 'font-medium text-foreground'
            : unread
              ? 'font-medium text-foreground'
              : 'text-muted group-hover/channel:text-foreground',
        )}
      >
        <Icon className={cn('size-4 shrink-0', active ? 'text-(--accent)' : 'opacity-60')} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">{channel.name}</span>
        {channel.mentionCount > 0 ? (
          <span
            aria-label={`${channel.mentionCount} mentions`}
            className="flex min-w-4.5 shrink-0 items-center justify-center rounded-full bg-danger px-1.5 py-px text-[10px] font-semibold text-(--danger-foreground)"
          >
            {channel.mentionCount}
          </span>
        ) : (
          unread &&
          !active && <span aria-label="Non lu" className="size-1.5 shrink-0 rounded-full bg-foreground/80" />
        )}
      </button>

      {canManage && (
        <Dropdown isOpen={menuOpen} onOpenChange={setMenuOpen}>
          <Dropdown.Trigger
            aria-label={`Gérer #${channel.name}`}
            className={cn(
              'mr-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded outline-none transition-colors',
              'text-muted hover:bg-surface-tertiary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus',
              menuOpen ? 'flex' : 'hidden group-hover/channel:flex group-focus-within/channel:flex',
            )}
          >
            <MoreVertical className="size-3.5" />
          </Dropdown.Trigger>
          <Dropdown.Popover className="min-w-44">
            <Dropdown.Menu
              onAction={(key) => {
                if (key === 'rename') onRename?.(channel.id);
                else if (key === 'up') onMoveUp?.(channel.id);
                else if (key === 'down') onMoveDown?.(channel.id);
                else if (key === 'delete') onDelete?.(channel.id);
              }}
            >
              <Dropdown.Item id="rename" textValue="Renommer">
                <Pencil className="size-4" />
                <Label>Renommer</Label>
              </Dropdown.Item>
              <Dropdown.Item id="up" textValue="Monter" isDisabled={isFirst}>
                <ArrowUp className="size-4" />
                <Label>Monter</Label>
              </Dropdown.Item>
              <Dropdown.Item id="down" textValue="Descendre" isDisabled={isLast}>
                <ArrowDown className="size-4" />
                <Label>Descendre</Label>
              </Dropdown.Item>
              <Dropdown.Item id="delete" textValue="Supprimer le salon" variant="danger">
                <Trash2 className="size-4" />
                <Label>Supprimer le salon</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      )}
    </div>
  );
}
