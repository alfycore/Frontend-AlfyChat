import { sanitizeSvg } from '@/lib/sanitize';
import type { Translations } from '@/i18n/types';

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
export function getUiconsList(t: Translations) {
  const u = t.admin.badgeDialog.uicons;
  return [
    { value: 'star', label: u.star },
    { value: 'trophy', label: u.trophy },
    { value: 'crown', label: u.crown },
    { value: 'shield', label: u.shield },
    { value: 'diamond', label: u.diamond },
    { value: 'fire-flame-simple', label: u['fire-flame-simple'] },
    { value: 'heart', label: u.heart },
    { value: 'bolt', label: u.bolt },
    { value: 'rocket', label: u.rocket },
    { value: 'bug', label: u.bug },
    { value: 'code-simple', label: u['code-simple'] },
    { value: 'palette', label: u.palette },
    { value: 'music-note', label: u['music-note'] },
    { value: 'camera', label: u.camera },
    { value: 'gamepad', label: u.gamepad },
    { value: 'paint-brush', label: u['paint-brush'] },
    { value: 'microchip', label: u.microchip },
    { value: 'gift', label: u.gift },
    { value: 'badge', label: u.badge },
    { value: 'check-circle', label: u['check-circle'] },
    { value: 'user-check', label: u['user-check'] },
    { value: 'comment-heart', label: u['comment-heart'] },
    { value: 'thumbs-up', label: u['thumbs-up'] },
    { value: 'sunglasses', label: u.sunglasses },
    { value: 'flag', label: u.flag },
    { value: 'wrench-alt', label: u['wrench-alt'] },
    { value: 'terminal', label: u.terminal },
    { value: 'world', label: u.world },
    { value: 'graduation-cap', label: u['graduation-cap'] },
    { value: 'eye', label: u.eye },
  ];
}
