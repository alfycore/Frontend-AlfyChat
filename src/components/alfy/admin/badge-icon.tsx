import { sanitizeSvg } from '@/lib/sanitize';

/**
 * Rendu d'une icône de badge. Trois provenances possibles :
 * `bootstrap` et `flaticon` sont des classes de fonte, `svg` du balisage
 * fourni par le staff — assaini avant injection.
 */
export function renderBadgeIcon(
  iconType: string,
  iconValue: string,
  color: string,
  size = 'text-xl',
) {
  if (iconType === 'bootstrap' && iconValue) {
    return <i className={`fi fi-br-${iconValue} ${size}`} style={{ color }} aria-hidden />;
  }
  if (iconType === 'flaticon' && iconValue) {
    return <i className={`${iconValue} ${size}`} style={{ color }} aria-hidden />;
  }
  if (iconType === 'svg' && iconValue) {
    return (
      <span
        className="inline-block size-5"
        style={{ color }}
        aria-hidden
        dangerouslySetInnerHTML={{ __html: sanitizeSvg(iconValue) }}
      />
    );
  }
  return <i className={`fi fi-br-question ${size} text-muted`} aria-hidden />;
}

/** Jeu d'icônes proposé dans le formulaire de création de badge. */
export const UICONS_LIST = [
  { value: 'star', label: 'Étoile' },
  { value: 'trophy', label: 'Trophée' },
  { value: 'crown', label: 'Couronne' },
  { value: 'shield', label: 'Bouclier' },
  { value: 'diamond', label: 'Gemme' },
  { value: 'fire-flame-simple', label: 'Feu' },
  { value: 'heart', label: 'Cœur' },
  { value: 'bolt', label: 'Éclair' },
  { value: 'rocket', label: 'Fusée' },
  { value: 'bug', label: 'Bug' },
  { value: 'code-simple', label: 'Code' },
  { value: 'palette', label: 'Palette' },
  { value: 'music-note', label: 'Musique' },
  { value: 'camera', label: 'Caméra' },
  { value: 'gamepad', label: 'Manette' },
  { value: 'paint-brush', label: 'Pinceau' },
  { value: 'microchip', label: 'CPU' },
  { value: 'gift', label: 'Cadeau' },
  { value: 'badge', label: 'Médaille' },
  { value: 'check-circle', label: 'Vérifié' },
  { value: 'user-check', label: 'Badge ID' },
  { value: 'comment-heart', label: 'Chat Cœur' },
  { value: 'thumbs-up', label: 'Pouce' },
  { value: 'sunglasses', label: 'Cool' },
  { value: 'flag', label: 'Drapeau' },
  { value: 'wrench-alt', label: 'Outils' },
  { value: 'terminal', label: 'Terminal' },
  { value: 'world', label: 'Globe' },
  { value: 'graduation-cap', label: 'Diplômé' },
  { value: 'eye', label: 'Œil' },
];
