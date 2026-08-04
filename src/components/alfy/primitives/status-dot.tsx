import type { AlfyPresence } from '@/components/alfy/mock/types';
import { cn } from '@/lib/utils';

export const PRESENCE_LABELS: Record<AlfyPresence, string> = {
  online: 'En ligne',
  idle: 'Absent·e',
  dnd: 'Ne pas déranger',
  invisible: 'Invisible',
  offline: 'Hors ligne',
};

/**
 * Tracés repris de `public/statusicon/*.svg` (viewBox 0 0 10 10), inlinés
 * plutôt que chargés en `<img>` : cette pastille est montée des dizaines de
 * fois (liste de MP, membres d'un serveur, popovers…) et n'a pas besoin d'une
 * requête réseau par occurrence. `invisible` réutilise le tracé `offline` —
 * ce sont les autres qui vous voient hors ligne, pas un statut à part.
 */
const ICONS: Record<AlfyPresence, { path: string; fill: string }> = {
  online: { path: 'M0 4.99993C0 2.23854 2.23854 0 4.99993 0C7.76131 0 9.99985 2.23854 9.99985 4.99993C9.99985 7.76131 7.76131 9.99985 4.99993 9.99985C2.23854 9.99985 0 7.76131 0 4.99993Z', fill: '#3BA55D' },
  idle: {
    path: 'M4.99514 9.99976C7.75911 9.99976 9.99976 7.75911 9.99976 4.99514C9.99976 2.33546 7.92501 0.160359 5.30569 0C5.93743 0.671693 6.32449 1.57616 6.32449 2.57103C6.32449 4.64401 4.64401 6.32449 2.57103 6.32449C1.57616 6.32449 0.671693 5.93743 0 5.30569C0.16036 7.92502 2.33546 9.99976 4.99514 9.99976Z',
    fill: '#FAA61A',
  },
  dnd: {
    path: 'M4.99993 0C2.23854 0 0 2.23854 0 4.99993C0 7.76131 2.23854 9.99985 4.99993 9.99985C7.76131 9.99985 9.99985 7.76131 9.99985 4.99993C9.99985 2.23854 7.76131 0 4.99993 0ZM2.5 4C1.94772 4 1.5 4.44772 1.5 5C1.5 5.55228 1.94772 6 2.5 6H7.5C8.05228 6 8.5 5.55228 8.5 5C8.5 4.44772 8.05229 4 7.5 4H2.5Z',
    fill: '#ED4245',
  },
  invisible: {
    path: 'M5 0C2.23858 0 0 2.23858 0 5C0 7.76142 2.23858 10 5 10C7.76142 10 10 7.76142 10 5C10 2.23858 7.76142 0 5 0ZM5 2.5C3.61929 2.5 2.5 3.61929 2.5 5C2.5 6.38071 3.61929 7.5 5 7.5C6.38071 7.5 7.5 6.38071 7.5 5C7.5 3.61929 6.38071 2.5 5 2.5Z',
    fill: '#747F8D',
  },
  offline: {
    path: 'M5 0C2.23858 0 0 2.23858 0 5C0 7.76142 2.23858 10 5 10C7.76142 10 10 7.76142 10 5C10 2.23858 7.76142 0 5 0ZM5 2.5C3.61929 2.5 2.5 3.61929 2.5 5C2.5 6.38071 3.61929 7.5 5 7.5C6.38071 7.5 7.5 6.38071 7.5 5C7.5 3.61929 6.38071 2.5 5 2.5Z',
    fill: '#747F8D',
  },
};

interface StatusDotProps {
  status: AlfyPresence;
  size?: 'xs' | 'sm' | 'md';
  /** Anneau de séparation, pour une pastille posée sur un avatar/fond contrasté. */
  ring?: boolean;
  /** Couleur de l'anneau — à accorder au fond porteur. */
  ringClass?: string;
  className?: string;
}

const SIZES: Record<NonNullable<StatusDotProps['size']>, string> = {
  xs: 'size-1.5',
  sm: 'size-2',
  md: 'size-2.5',
};

export function StatusDot({ status, size = 'md', ring = true, ringClass = 'ring-surface', className }: StatusDotProps) {
  const icon = ICONS[status];
  return (
    <svg
      viewBox="0 0 10 10"
      role="img"
      aria-label={PRESENCE_LABELS[status]}
      className={cn('block shrink-0 rounded-full', SIZES[size], ring && ['ring-2', ringClass], className)}
    >
      {/* Le disque de fond garantit un cercle plein même pour les tracés
          « idle »/« dnd », qui ne remplissent pas tout le viewBox. */}
      <circle cx="5" cy="5" r="5" className="fill-surface" />
      <path d={icon.path} fill={icon.fill} fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

/** Pastille positionnée sur le coin bas-droit d'un avatar. */
export function AvatarStatus({ status, ringClass }: { status: AlfyPresence; ringClass?: string }) {
  return (
    <span className="absolute -right-0.5 -bottom-0.5">
      <StatusDot status={status} ringClass={ringClass} />
    </span>
  );
}
