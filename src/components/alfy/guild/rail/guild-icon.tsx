'use client';

/**
 * Icône de serveur du rail — le geste signature de Discord :
 *  - cercle au repos, « squircle » au survol et quand le serveur est ouvert ;
 *  - pastille à gauche : point (non-lu) → mi-hauteur (survol) → pleine (actif) ;
 *  - badge rouge de mentions en bas à droite ;
 *  - petite pastille haut-parleur quand on est en vocal sur ce serveur.
 *
 * Les animations ne touchent que `border-radius` et `transform` : rien ne
 * relance la mise en page du rail pendant qu'on le survole.
 */

import { Tooltip } from '@heroui/react';
import { Volume2 } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Sigle façon Discord : initiales des mots, 5 caractères au plus. */
export function guildAcronym(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2);
  return words
    .map((w) => (/[\p{L}\p{N}]/u.test(w[0]) ? w[0] : ''))
    .join('')
    .slice(0, 5);
}

export function GuildPill({ state }: { state: 'none' | 'unread' | 'hover' | 'active' }) {
  return (
    <span aria-hidden className="pointer-events-none absolute top-1/2 left-0 h-10 w-1 -translate-y-1/2 overflow-hidden">
      <span
        className={cn(
          'absolute inset-y-0 left-0 w-2 -translate-x-1 rounded-full bg-foreground transition-transform duration-(--dur-2) ease-out-quart',
          state === 'none' && 'scale-y-0 group-hover/guild:scale-y-50',
          state === 'unread' && 'scale-y-[0.2] group-hover/guild:scale-y-50',
          state === 'hover' && 'scale-y-50',
          state === 'active' && 'scale-y-100',
        )}
      />
    </span>
  );
}

export function MentionBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        'pointer-events-none absolute -right-1 -bottom-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-[11px] leading-none font-bold text-(--danger-foreground) ring-[3px] ring-background tabular-nums',
        'alfy-badge-pop',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

interface GuildIconProps {
  name: string;
  iconUrl?: string;
  active?: boolean;
  unread?: boolean;
  mentions?: number;
  inVoice?: boolean;
  /** Survol piloté par le parent (dossier, glisser). */
  highlight?: boolean;
  size?: 'md' | 'sm';
  className?: string;
  children?: ReactNode;
}

/** Pastille visuelle seule (sans comportement) — réutilisée dans les dossiers et l'aperçu de glisser. */
export const GuildIconFace = forwardRef<HTMLSpanElement, GuildIconProps>(function GuildIconFace(
  { name, iconUrl, active, highlight, size = 'md', className, children },
  ref,
) {
  const small = size === 'sm';
  return (
    <span
      ref={ref}
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden select-none',
        'transition-[border-radius,background-color,color] duration-(--dur-2) ease-out-quart',
        small ? 'size-4.5 rounded-full text-[7px]' : 'size-12 text-[15px]',
        !small && (active || highlight ? 'rounded-2xl' : 'rounded-[24px] group-hover/guild:rounded-2xl'),
        iconUrl
          ? 'bg-surface-secondary'
          : active
            ? 'bg-accent text-accent-foreground'
            : 'bg-surface-secondary text-foreground group-hover/guild:bg-accent group-hover/guild:text-accent-foreground',
        className,
      )}
    >
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl} alt="" draggable={false} className="size-full object-cover" />
      ) : (
        <span className="font-semibold tracking-tight">{guildAcronym(name)}</span>
      )}
      {children}
    </span>
  );
});

interface GuildButtonProps extends GuildIconProps {
  onSelect: () => void;
  onHover?: () => void;
  tooltip?: ReactNode;
  ariaLabel: string;
}

/** Icône de serveur cliquable avec pastille, badge et infobulle. */
export const GuildButton = forwardRef<HTMLButtonElement, GuildButtonProps & React.HTMLAttributes<HTMLButtonElement>>(
  function GuildButton(
    { name, iconUrl, active, unread, mentions = 0, inVoice, highlight, onSelect, onHover, tooltip, ariaLabel, className, ...rest },
    ref,
  ) {
    return (
      <Tooltip delay={0} closeDelay={0}>
        <button
          ref={ref}
          type="button"
          aria-label={ariaLabel}
          aria-current={active ? 'page' : undefined}
          onClick={onSelect}
          onMouseEnter={onHover}
          onFocus={onHover}
          className={cn(
            'group/guild relative flex w-full cursor-pointer justify-center outline-none',
            'focus-visible:[&>span:nth-child(2)]:ring-2 focus-visible:[&>span:nth-child(2)]:ring-focus',
            className,
          )}
          {...rest}
        >
          <GuildPill state={active ? 'active' : highlight ? 'hover' : unread ? 'unread' : 'none'} />
          <GuildIconFace
            name={name}
            iconUrl={iconUrl}
            active={active}
            highlight={highlight}
            className="active:translate-y-px"
          />
          <MentionBadge count={mentions} className="right-2.5" />
          {inVoice && (
            <span className="pointer-events-none absolute right-2.5 -bottom-1 flex size-4.5 items-center justify-center rounded-full bg-success text-(--success-foreground) ring-[3px] ring-background">
              <Volume2 className="size-2.5" strokeWidth={3} aria-hidden />
            </span>
          )}
        </button>
        <Tooltip.Content placement="right" offset={14} className="max-w-60 px-3 py-2 text-sm font-semibold">
          {tooltip ?? <p>{name}</p>}
        </Tooltip.Content>
      </Tooltip>
    );
  },
);
