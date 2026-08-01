import { Chip } from '@heroui/react';

import type { AlfyRole } from '@/components/alfy/mock/types';

/** Chip de rôle : point de la couleur du rôle + libellé, jamais de fond criard. */
export function RoleChip({ role }: { role: AlfyRole }) {
  return (
    <Chip size="sm" variant="soft" className="cursor-default">
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{ backgroundColor: role.color }}
      />
      <Chip.Label>
        {role.emoji ? `${role.emoji} ` : ''}
        {role.name}
      </Chip.Label>
    </Chip>
  );
}
