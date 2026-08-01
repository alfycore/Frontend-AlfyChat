'use client';

import { CornerUpLeft } from 'lucide-react';

import type { AlfyMessage } from '@/components/alfy/mock/types';
import { useUserById } from '@/components/alfy/user-directory';

/** Ligne « en réponse à » au-dessus d'un message. */
export function ReplyPreview({ original }: { original: AlfyMessage }) {
  const userById = useUserById();
  const author = userById(original.authorId);
  return (
    <div className="mb-0.5 flex items-center gap-1.5 pl-11 text-xs text-muted">
      <CornerUpLeft className="size-3 shrink-0" aria-hidden />
      <span className="font-medium text-foreground/80">{author.displayName}</span>
      <span className="min-w-0 truncate">{original.content.replaceAll('*', '').replaceAll('`', '')}</span>
    </div>
  );
}
