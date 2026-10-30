import { Avatar } from '@heroui/react';

import type { AlfyPresence } from '@/components/alfy/mock/types';
import { AvatarStatus } from '@/components/alfy/primitives/status-dot';
import { cn } from '@/lib/utils';

interface AlfyAvatarProps {
  /** Peut être absent tant que le profil n'est pas résolu. */
  name?: string | null;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  status?: AlfyPresence;
  /** Anneau de la pastille, à accorder au fond porteur. */
  statusRingClass?: string;
  className?: string;
}

/** Tolérant : les données réelles peuvent arriver sans nom résolu. */
const initials = (name?: string | null) =>
  (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

export function AlfyAvatar({ name, avatarUrl, size = 'md', status, statusRingClass, className }: AlfyAvatarProps) {
  // Une taille explicite (`size-20`…) sur le conteneur doit agrandir l'avatar lui-même :
  // sinon l'image restait à la taille `size` dans un coin, pastille et anneau décalés.
  const fill = !!className && /(^|\s)size-/.test(className);
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <Avatar size={size} className={fill ? 'size-full rounded-full text-xl' : undefined}>
        {avatarUrl && <Avatar.Image src={avatarUrl} alt={name ?? ''} className="object-cover" />}
        <Avatar.Fallback>{initials(name)}</Avatar.Fallback>
      </Avatar>
      {status && <AvatarStatus status={status} ringClass={statusRingClass} />}
    </span>
  );
}
