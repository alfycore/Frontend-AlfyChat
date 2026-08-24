/**
 * Formats de date du chat, dépendants de la langue choisie.
 *
 * Les composants créaient chacun leurs `Intl.DateTimeFormat` au niveau module,
 * figés sur `fr-FR` : quelle que soit la langue de l'interface, les heures, les
 * séparateurs de jour et les infobulles de date restaient en français. Les
 * formateurs sont désormais dérivés de `intlLocale`, et mis en cache — en
 * instancier un par ligne de message coûterait bien plus cher que le rendu.
 */

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string, cle: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const k = `${locale}|${cle}`;
  let f = cache.get(k);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    cache.set(k, f);
  }
  return f;
}

/** 14:32 — heure d'un message. */
export const timeFormat = (locale: string) =>
  formatter(locale, 'time', { hour: '2-digit', minute: '2-digit' });

/** Mardi 12 août 2026 à 14:32 — infobulle complète. */
export const fullFormat = (locale: string) =>
  formatter(locale, 'full', { dateStyle: 'full', timeStyle: 'short' });

/** Mardi 12 août 2026 — séparateur de jour dans le fil. */
export const dayFormat = (locale: string) =>
  formatter(locale, 'day', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** 12/08/2026 — date courte des listes. */
export const shortDateFormat = (locale: string) =>
  formatter(locale, 'short', { day: '2-digit', month: '2-digit', year: '2-digit' });

/** 12 août, 14:32 — horodatage d'une notification. */
export const notificationTime = (locale: string) =>
  formatter(locale, 'notif', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Mardi — jour de la semaine seul. */
export const weekdayFormat = (locale: string) => formatter(locale, 'weekday', { weekday: 'short' });

const relCache = new Map<string, Intl.RelativeTimeFormat>();
function relative(locale: string): Intl.RelativeTimeFormat {
  let f = relCache.get(locale);
  if (!f) {
    f = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    relCache.set(locale, f);
  }
  return f;
}

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Horodatage d'une ligne de conversation, calé sur ce qu'on attend d'une liste
 * de discussions : l'heure aujourd'hui, « hier », le jour de la semaine sur la
 * semaine écoulée, la date au-delà. L'ancienne version affichait toujours
 * l'heure — une conversation vieille de trois mois s'annonçait « 09:41 ».
 */
export function conversationTime(locale: string, iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const maintenant = new Date();
  const jour = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ecart = Math.round((jour(maintenant) - jour(d)) / JOUR_MS);

  if (ecart <= 0) return timeFormat(locale).format(d);
  if (ecart === 1) return relative(locale).format(-1, 'day');
  if (ecart < 7) return weekdayFormat(locale).format(d);
  return shortDateFormat(locale).format(d);
}
