import { Chip, Tooltip } from '@heroui/react';
import { Flag, FolderGit2, ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Badges de confiance produit (France, open source, chiffrement de bout en bout).
 * Présents dans l'UI elle-même (onboarding, paramètres), pas seulement sur
 * le site marketing — de manière discrète.
 */
export function TrustBadges({ className, compact = false }: { className?: string; compact?: boolean }) {
  // `short` : libellé de la version compacte (un mot coupé au hasard ne voulait rien dire).
  const items = [
    { icon: Flag, label: 'Hébergé en France', short: 'France', tip: 'Données stockées en France, conformité RGPD.' },
    { icon: FolderGit2, label: 'Open source', short: 'Open source', tip: 'Code client et serveur publiés et auditables.' },
    { icon: ShieldCheck, label: 'Chiffré de bout en bout', short: 'E2EE', tip: 'Messages privés et groupes chiffrés sur votre appareil.' },
  ];
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {items.map(({ icon: Icon, label, short, tip }) => (
        <Tooltip key={label} delay={200}>
          <Chip size="sm" variant="soft" className="cursor-default">
            <Icon className="size-3" aria-hidden />
            <Chip.Label>{compact ? short : label}</Chip.Label>
          </Chip>
          <Tooltip.Content>
            <p>{tip}</p>
          </Tooltip.Content>
        </Tooltip>
      ))}
    </div>
  );
}
