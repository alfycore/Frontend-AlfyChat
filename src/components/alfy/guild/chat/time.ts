/**
 * Horodatages du fil de serveur, au format Discord :
 * « Aujourd'hui à 14:03 », « Hier à 09:12 », sinon « 12/10/2026 14:03 ».
 */

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(opts)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, opts);
    cache.set(key, f);
  }
  return f;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function messageStamp(iso: string, locale: string, labels: { today: string; yesterday: string }): string {
  const date = new Date(iso);
  const time = fmt(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (days === 0) return labels.today.replace('{time}', time);
  if (days === 1) return labels.yesterday.replace('{time}', time);
  return `${fmt(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)} ${time}`;
}

export const shortTime = (iso: string, locale: string) => fmt(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export const fullStamp = (iso: string, locale: string) =>
  fmt(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export const dayDivider = (iso: string, locale: string) => fmt(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

export const sameDay = (a: string, b: string) => startOfDay(new Date(a)) === startOfDay(new Date(b));
