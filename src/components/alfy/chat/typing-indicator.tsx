'use client';

import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

/**
 * Bandeau « X est en train d'écrire ».
 *
 * La rangée est **toujours rendue** : la masquer faisait remonter le composeur
 * et tout le fil de 24 px dès qu'un contact commençait à taper, puis
 * redescendre à l'arrêt — le chat sautait en permanence pendant une
 * conversation active. Seul le contenu apparaît et disparaît.
 */
export function TypingIndicator({ names }: { names: string[] }) {
  const { t, tx } = useTranslation();
  const actif = names.length > 0;

  const label = !actif
    ? ''
    : names.length === 1
      ? tx(t.chat.typing, { names: names[0] })
      : names.length === 2
        ? tx(t.chat.typingTwo, { name1: names[0], name2: names[1] })
        : tx(t.chat.typingMultiple, { n: names.length });

  return (
    <div
      className={cn(
        'flex h-6 shrink-0 items-center gap-2 px-4 text-xs text-muted transition-opacity duration-150',
        actif ? 'opacity-100' : 'opacity-0',
      )}
      role="status"
      aria-live="polite"
    >
      {actif && (
        <>
          <span className="flex items-center gap-0.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="alfy-typing-dot size-1 rounded-full bg-muted"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
          <span className="min-w-0 truncate">{label}</span>
        </>
      )}
    </div>
  );
}
