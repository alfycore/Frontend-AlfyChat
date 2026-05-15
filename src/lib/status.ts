/**
 * status.ts — Source unique de vérité pour le système de statut utilisateur.
 *
 * Toutes les couleurs, labels et helpers liés aux statuts doivent venir d'ici.
 * Ne pas redéfinir STATUS_DOT ou équivalent dans les composants individuels.
 */

export type UserStatus = 'online' | 'idle' | 'dnd' | 'invisible' | 'offline';

/** Couleurs Tailwind des pastilles de statut (bg-*). Toujours rounded-full. */
export const STATUS_COLORS: Record<UserStatus, string> = {
  online:    'bg-green-500',
  idle:      'bg-amber-500',
  dnd:       'bg-red-500',
  invisible: 'bg-zinc-500',
  offline:   'bg-zinc-500',
};

/** Labels français des statuts. */
export const STATUS_LABELS: Record<UserStatus, string> = {
  online:    'En ligne',
  idle:      'Absent',
  dnd:       'Ne pas déranger',
  invisible: 'Invisible',
  offline:   'Hors ligne',
};

/** Couleurs Tailwind texte des statuts (text-*). */
export const STATUS_TEXT_COLORS: Record<UserStatus, string> = {
  online:    'text-green-500',
  idle:      'text-amber-500',
  dnd:       'text-red-500',
  invisible: 'text-zinc-400',
  offline:   'text-zinc-400',
};

/** Retourne la couleur bg de la pastille pour un statut donné. */
export function statusColor(status?: string | null): string {
  return STATUS_COLORS[(status as UserStatus)] ?? STATUS_COLORS.offline;
}

/** Retourne le label français d'un statut. */
export function statusLabel(status?: string | null): string {
  return STATUS_LABELS[(status as UserStatus)] ?? STATUS_LABELS.offline;
}

/** Retourne la couleur texte d'un statut. */
export function statusTextColor(status?: string | null): string {
  return STATUS_TEXT_COLORS[(status as UserStatus)] ?? STATUS_TEXT_COLORS.offline;
}

/** Chemins SVG des icônes de statut (depuis /statusicon/). */
export const STATUS_ICONS: Record<UserStatus, string> = {
  online:    '/statusicon/online.svg',
  idle:      '/statusicon/idle.svg',
  dnd:       '/statusicon/donotdisturb.svg',
  invisible: '/statusicon/offline.svg',
  offline:   '/statusicon/offline.svg',
};

/** Retourne le chemin de l'icône SVG pour un statut donné. */
export function statusIcon(status?: string | null): string {
  return STATUS_ICONS[(status as UserStatus)] ?? STATUS_ICONS.offline;
}

/**
 * Retourne true si le statut est "visible en ligne" (online / idle / dnd).
 * Les utilisateurs invisibles ou hors ligne retournent false.
 */
export function isVisibleOnline(status?: string | null): boolean {
  return status === 'online' || status === 'idle' || status === 'dnd';
}

/**
 * Retourne true si l'utilisateur est connecté et visible
 * (pas offline, pas invisible).
 */
export function isConnected(status?: string | null): boolean {
  return status !== 'offline' && status !== 'invisible' && status != null;
}

/**
 * Statut à afficher AUX AUTRES utilisateurs.
 * Un utilisateur invisible apparaît hors ligne pour ses amis.
 */
export function effectiveStatus(status?: string | null): UserStatus {
  if (!status || status === 'invisible') return 'offline';
  return (status as UserStatus);
}

/** Liste des statuts sélectionnables par l'utilisateur (pas 'offline'). */
export const SELECTABLE_STATUSES = ['online', 'idle', 'dnd', 'invisible'] as const;
export type SelectableStatus = (typeof SELECTABLE_STATUSES)[number];

// ============ PRÉSENCE RICHE ============

export interface RichPresence {
  status: UserStatus;
  chosenStatus?: UserStatus;
  emoji?: string | null;
  text?: string | null;
}

/** Retourne le label d'affichage combiné emoji + texte, ou le label du statut. */
export function richStatusLabel(p: RichPresence): string {
  if (p.emoji && p.text) return `${p.emoji} ${p.text}`;
  if (p.text) return p.text;
  return statusLabel(p.status);
}

/** Retourne "Vu il y a X" en français, ou null si date absente. */
export function formatLastSeen(lastSeenAt: Date | string | null | undefined): string | null {
  if (!lastSeenAt) return null;
  const diff = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 1000);
  if (diff < 60) return "Vu à l'instant";
  if (diff < 3600) return `Vu il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Vu il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86400) return `Vu il y a ${Math.floor(diff / 86400)}j`;
  if (diff < 30 * 86400) return `Vu il y a ${Math.floor(diff / (7 * 86400))} sem`;
  return `Vu il y a ${Math.floor(diff / (30 * 86400))} mois`;
}
