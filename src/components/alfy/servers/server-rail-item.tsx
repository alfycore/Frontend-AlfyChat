'use client';

import { Avatar, Badge, Tooltip } from '@heroui/react';
import { motion } from 'motion/react';

import type { AlfyServer } from '@/components/alfy/mock/types';
import { SPRING } from '@/components/alfy/motion';
import { cn } from '@/lib/utils';

interface ServerRailItemProps {
  server: AlfyServer;
  active: boolean;
  onSelect: (id: string) => void;
  orientation?: 'vertical' | 'horizontal';
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((p) => /\w/.test(p))
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function ServerRailItem({ server, active, onSelect, orientation = 'vertical' }: ServerRailItemProps) {
  const horizontal = orientation === 'horizontal';
  return (
    <Tooltip delay={150}>
      <button
        type="button"
        onClick={() => onSelect(server.id)}
        aria-label={server.name}
        aria-pressed={active}
        data-active={active}
        className={cn(
          horizontal ? 'alfy-rail-item-h' : 'alfy-rail-item',
          'relative flex shrink-0 cursor-pointer items-center justify-center rounded-full outline-none',
          'transition-transform duration-150 active:scale-95',
          'focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-secondary',
        )}
      >
        <Badge.Anchor>
          <Avatar
            size="md"
            className={cn(
              'transition-all duration-150',
              active ? 'ring-2 ring-accent' : 'opacity-85 hover:opacity-100',
            )}
          >
            {server.iconUrl && <Avatar.Image src={server.iconUrl} alt="" />}
            <Avatar.Fallback>{initials(server.name)}</Avatar.Fallback>
          </Avatar>
          {server.mentionCount > 0 && (
            <Badge color="danger" size="sm" aria-label={`${server.mentionCount} mentions`}>
              {server.mentionCount}
            </Badge>
          )}
          {server.mentionCount === 0 && server.selfHosted && server.nodeOnline && (
            <Badge
              color="success"
              size="sm"
              placement="bottom-right"
              aria-label="Nœud auto-hébergé en ligne"
            />
          )}
        </Badge.Anchor>
        {/* Point non-lu discret quand pas de mention */}
        {server.unread && server.mentionCount === 0 && !active && (
          <span
            aria-label="Messages non lus"
            className={cn(
              'absolute size-1.5 rounded-full bg-foreground/70',
              horizontal ? '-top-2 left-1/2 -translate-x-1/2' : 'top-1/2 -left-2 -translate-y-1/2',
            )}
          />
        )}
        {/* Pastille active — voyage d'un serveur à l'autre via layoutId */}
        {active && (
          <motion.span
            layoutId="server-rail-active"
            transition={SPRING.indicator}
            aria-hidden
            className={cn(
              'absolute rounded-full bg-foreground',
              horizontal ? '-bottom-2 left-1/2 h-1 w-7 -translate-x-1/2' : 'top-1/2 -left-2 h-7 w-1 -translate-y-1/2',
            )}
          />
        )}
      </button>
      <Tooltip.Content placement={horizontal ? 'bottom' : 'right'}>
        <p className="font-medium">{server.name}</p>
        {server.selfHosted && (
          <p className="text-xs text-muted">
            {server.nodeOnline ? 'Nœud auto-hébergé · en ligne' : 'Nœud hors ligne'}
          </p>
        )}
      </Tooltip.Content>
    </Tooltip>
  );
}
