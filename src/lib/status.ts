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
