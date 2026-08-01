import { cn } from '@/lib/utils';

/**
 * Logo AlfyChat — vrai SVG de marque (public/logo), avec bascule clair/sombre
 * comme la page /login : icône colorée en clair, version blanche en sombre.
 * `className` contrôle la taille (ex. `size-6`). Décoratif : le libellé
 * accessible vient toujours du texte/aria-label voisin.
 */
export function AlfyMark({ className }: { className?: string }) {
  return (
    <>
      <img
        src="/logo/Alfychat.svg"
        alt=""
        aria-hidden
        className={cn('object-contain dark:hidden', className)}
      />
      <img
        src="/logo/Alfychatlogowihte.svg"
        alt=""
        aria-hidden
        className={cn('hidden object-contain dark:block', className)}
      />
    </>
  );
}
