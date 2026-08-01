import type { AlfyPresence } from '@/components/alfy/mock/types';
import { cn } from '@/lib/utils';

const COLORS: Record<AlfyPresence, string> = {
  online: 'bg-success',
  idle: 'bg-warning',
  dnd: 'bg-danger',
  invisible: 'bg-muted/40',
  offline: 'bg-muted/40',
};

export const PRESENCE_LABELS: Record<AlfyPresence, string> = {
  online: 'En ligne',
  idle: 'Absent·e',
  dnd: 'Ne pas déranger',
  invisible: 'Invisible',
  offline: 'Hors ligne',
};

interface StatusDotProps {
  status: AlfyPresence;
  size?: 'sm' | 'md';
  /** Couleur de l'anneau de séparation, à accorder au fond porteur. */
  ringClass?: string;
  className?: string;
}

export function StatusDot({ status, size = 'md', ringClass = 'ring-surface', className }: StatusDotProps) {
  return (
    <span
      role="img"
      aria-label={PRESENCE_LABELS[status]}
      className={cn(
        'block rounded-full ring-2',
        size === 'sm' ? 'size-2' : 'size-2.5',
        COLORS[status],
        ringClass,
        className,
      )}
    />
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
