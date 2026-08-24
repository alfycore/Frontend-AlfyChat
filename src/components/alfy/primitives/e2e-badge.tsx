'use client';

import { Tooltip } from '@heroui/react';
import { Lock } from 'lucide-react';

import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

/**
 * Indicateur « chiffré de bout en bout » affiché sur chaque message chiffré.
 * Discret (icône seule) mais toujours présent — cœur de la promesse produit.
 *
 * Pas de `tabIndex` : le badge est parfois rendu à l'intérieur d'un bouton
 * (titre de conversation), et un point de tabulation imbriqué dans un bouton
 * cassait la navigation clavier tout en rendant le survol capricieux.
 */
export function E2eBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <Tooltip delay={200}>
      <span
        role="img"
        aria-label={t.composer.e2eeLabel}
        className={cn(
          'inline-flex cursor-default items-center outline-none',
          'text-(--alfy-e2e) opacity-70 transition-opacity hover:opacity-100',
          className,
        )}
      >
        <Lock className="size-3" aria-hidden />
      </span>
      <Tooltip.Content>
        <p>{t.chat.e2eeTooltip}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}
