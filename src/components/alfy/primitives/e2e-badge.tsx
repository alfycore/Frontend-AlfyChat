import { Tooltip } from '@heroui/react';
import { Lock } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Indicateur « chiffré de bout en bout » affiché sur chaque message chiffré.
 * Discret (icône seule) mais toujours présent — cœur de la promesse produit.
 */
export function E2eBadge({ className }: { className?: string }) {
  return (
    <Tooltip delay={200}>
      <span
        tabIndex={0}
        role="img"
        aria-label="Chiffré de bout en bout"
        className={cn(
          'inline-flex cursor-default items-center outline-none',
          'text-[color:var(--alfy-e2e)] opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100',
          className,
        )}
      >
        <Lock className="size-3" aria-hidden />
      </span>
      <Tooltip.Content>
        <p>Chiffré de bout en bout (protocole Signal)</p>
      </Tooltip.Content>
    </Tooltip>
  );
}
