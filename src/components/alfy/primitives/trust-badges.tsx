import { Chip, Tooltip } from '@heroui/react';
import { Flag, FolderGit2, ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Badges de confiance produit (France, open source, audit Signal).
 * Présents dans l'UI elle-même (onboarding, paramètres), pas seulement sur
 * le site marketing — de manière discrète.
 */
export function TrustBadges({ className, compact = false }: { className?: string; compact?: boolean }) {
  const items = [
    { icon: Flag, label: 'Hébergé en France', tip: 'Données stockées en France, conformité RGPD.' },
    { icon: FolderGit2, label: 'Open source', tip: 'Code client et serveur publiés et auditables.' },
    { icon: ShieldCheck, label: 'Protocole Signal', tip: 'Chiffrement de bout en bout audité.' },
  ];
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {items.map(({ icon: Icon, label, tip }) => (
        <Tooltip key={label} delay={200}>
          <Chip size="sm" variant="soft" className="cursor-default">
            <Icon className="size-3" aria-hidden />
            <Chip.Label>{compact ? label.split(' ')[0] : label}</Chip.Label>
          </Chip>
          <Tooltip.Content>
            <p>{tip}</p>
          </Tooltip.Content>
        </Tooltip>
      ))}
    </div>
  );
}
