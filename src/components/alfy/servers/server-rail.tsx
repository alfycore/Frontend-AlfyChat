'use client';

import { Button, ScrollShadow, Separator, Tooltip } from '@heroui/react';
import { Compass, PanelLeft, PanelTop, Plus } from 'lucide-react';
import { motion } from 'motion/react';

import type { AlfyServer } from '@/components/alfy/mock/types';
import { AlfyMark } from '@/components/alfy/primitives/alfy-mark';
import { SPRING } from '@/components/alfy/motion';
import { ServerRailItem } from '@/components/alfy/servers/server-rail-item';
import { cn } from '@/lib/utils';

interface ServerRailProps {
  servers: AlfyServer[];
  activeServerId: string | null;
  /** null = vue DMs */
  onSelectServer: (id: string | null) => void;
  dmUnreadCount: number;
  orientation?: 'vertical' | 'horizontal';
  onToggleOrientation?: () => void;
  onDiscover?: () => void;
}

export function ServerRail({
  servers,
  activeServerId,
  onSelectServer,
  dmUnreadCount,
  orientation = 'vertical',
  onToggleOrientation,
  onDiscover,
}: ServerRailProps) {
  const horizontal = orientation === 'horizontal';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-2 bg-background',
        horizontal ? 'h-19 w-full flex-row px-3' : 'h-full w-19 flex-col py-3',
      )}
    >
      {/* Accueil / DMs */}
      <Tooltip delay={150}>
        <button
          type="button"
          onClick={() => onSelectServer(null)}
          aria-label="Messages privés"
          data-active={activeServerId === null}
          className={cn(
            horizontal ? 'alfy-rail-item-h' : 'alfy-rail-item',
            'relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none',
            'transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-focus',
            // Fond neutre pour laisser lire le vrai logo coloré ; l'état actif
            // est porté par la pastille latérale (.alfy-rail-item[data-active]).
            activeServerId === null
              ? 'bg-surface-tertiary'
              : 'bg-surface hover:bg-surface-tertiary',
          )}
        >
          <AlfyMark className="size-6 p-0.5" />
          {dmUnreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-(--danger-foreground) ring-2 ring-background">
              {dmUnreadCount}
            </span>
          )}
          {activeServerId === null && (
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
          <p>Messages privés</p>
        </Tooltip.Content>
      </Tooltip>

      <Separator
        orientation={horizontal ? 'vertical' : 'horizontal'}
        className={horizontal ? 'h-7' : 'w-7'}
      />

      <ScrollShadow
        orientation={horizontal ? 'horizontal' : 'vertical'}
        className={cn(
          'flex min-h-0 items-center gap-2.5',
          horizontal
            ? 'h-full flex-1 flex-row overflow-x-auto overflow-y-hidden px-1'
            : 'w-full flex-1 flex-col overflow-x-hidden overflow-y-auto px-2 py-1',
        )}
      >
        {servers.map((s) => (
          <ServerRailItem
            key={s.id}
            server={s}
            active={s.id === activeServerId}
            onSelect={onSelectServer}
            orientation={orientation}
          />
        ))}

        <Tooltip delay={150}>
          <Button
            isIconOnly
            variant="ghost"
            aria-label="Créer ou rejoindre un serveur"
            className={cn(
              'size-11 shrink-0 rounded-full bg-surface text-success transition-colors hover:bg-success/15',
              !horizontal && 'mt-1',
            )}
          >
            <Plus className="size-5" />
          </Button>
          <Tooltip.Content placement={horizontal ? 'bottom' : 'right'}>
            <p>Créer ou rejoindre un serveur</p>
          </Tooltip.Content>
        </Tooltip>
      </ScrollShadow>

      <Tooltip delay={150}>
        <Button
          isIconOnly
          variant="ghost"
          aria-label="Découvrir des serveurs publics"
          className="size-11 shrink-0 rounded-full bg-surface text-muted transition-colors hover:text-foreground"
          onPress={onDiscover}
        >
          <Compass className="size-5" />
        </Button>
        <Tooltip.Content placement={horizontal ? 'bottom' : 'right'}>
          <p>Découvrir des serveurs publics</p>
        </Tooltip.Content>
      </Tooltip>

      {onToggleOrientation && (
        <Tooltip delay={150}>
          <Button
            isIconOnly
            variant="ghost"
            aria-label={horizontal ? 'Passer la barre en vertical' : 'Passer la barre en horizontal'}
            className="size-11 shrink-0 rounded-full bg-surface text-muted transition-colors hover:text-foreground"
            onPress={onToggleOrientation}
          >
            {horizontal ? <PanelLeft className="size-5" /> : <PanelTop className="size-5" />}
          </Button>
          <Tooltip.Content placement={horizontal ? 'bottom' : 'right'}>
            <p>{horizontal ? 'Barre verticale' : 'Barre horizontale'}</p>
          </Tooltip.Content>
        </Tooltip>
      )}
    </div>
  );
}
