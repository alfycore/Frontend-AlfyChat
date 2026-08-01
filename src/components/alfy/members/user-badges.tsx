import { Tooltip } from '@heroui/react';

import type { AlfyBadge } from '@/components/alfy/mock/types';
import { sanitizeSvg } from '@/lib/sanitize';
import { cn } from '@/lib/utils';

/**
 * Icônes de badges personnalisés (attribués par un admin) : Flaticon uicons
 * (`fi fi-br-*`, chargé globalement via CDN dans layout.tsx) ou SVG inline.
 * Sans `iconType` (badges système historiques), `icon` est un emoji brut.
 */
function BadgeGlyph({ badge }: { badge: AlfyBadge }) {
  const val = badge.iconValue || badge.icon;
  if (badge.iconType === 'svg') {
    return (
      <span
        aria-hidden
        dangerouslySetInnerHTML={{ __html: sanitizeSvg(val) }}
        className="flex size-full items-center justify-center [&>svg]:size-full"
      />
    );
  }
  if (badge.iconType === 'flaticon') {
    return <i aria-hidden className={val} style={{ color: badge.color }} />;
  }
  if (badge.iconType === 'bootstrap') {
    return <i aria-hidden className={`fi fi-br-${val}`} style={{ color: badge.color }} />;
  }
  return <span aria-hidden>{val}</span>;
}

export function UserBadges({ badges, size = 'md' }: { badges: AlfyBadge[]; size?: 'sm' | 'md' }) {
  if (badges.length === 0) return null;
  return (
    <div className="flex items-center gap-0.5">
      {badges.map((badge) => (
        <Tooltip key={badge.id} delay={200}>
          <span
            tabIndex={0}
            role="img"
            aria-label={badge.name}
            className={cn(
              'flex cursor-default items-center justify-center rounded-full bg-surface-secondary leading-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus',
              size === 'sm' ? 'size-4.5 text-[10px]' : 'size-5.5 text-xs',
            )}
            style={{ color: badge.color }}
          >
            <BadgeGlyph badge={badge} />
          </span>
          <Tooltip.Content>
            <p>{badge.name}</p>
          </Tooltip.Content>
        </Tooltip>
      ))}
    </div>
  );
}
