// ==========================================
// ALFYCHAT — Domaines publics
// alfychat.app : l'application
// alfychat.com : site, support, docs, légal
// alfy.chat    : liens courts (invitations, profils, bots…)
// ==========================================

const trim = (url: string) => url.replace(/\/+$/, '');

export const APP_URL  = trim(process.env.NEXT_PUBLIC_APP_URL  || 'https://alfychat.app');
export const SITE_URL = trim(process.env.NEXT_PUBLIC_SITE_URL || 'https://alfychat.com');
export const LINK_URL = trim(process.env.NEXT_PUBLIC_LINK_URL || 'https://alfy.chat');

/** Hôte du domaine de liens courts, sans protocole (pour l'affichage). */
export const LINK_HOST = LINK_URL.replace(/^https?:\/\//, '');

/** URL absolue d'une page du site vitrine (alfychat.com). */
export function siteLink(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function inviteLink(code: string): string {
  return `${LINK_URL}/i/${encodeURIComponent(code)}`;
}

export function profileLink(username: string): string {
  return `${LINK_URL}/u/${encodeURIComponent(username)}`;
}

export function serverLink(serverId: string): string {
  return `${LINK_URL}/s/${encodeURIComponent(serverId)}`;
}

export function messageLink(serverId: string, channelId: string, messageId: string): string {
  return `${LINK_URL}/m/${[serverId, channelId, messageId].map(encodeURIComponent).join('/')}`;
}

/** Lien court d'ajout d'un bot. `permissions` est le bitmask demandé. */
export function botInviteLink(clientId: string, permissions?: number): string {
  const base = `${LINK_URL}/b/${encodeURIComponent(clientId)}`;
  return permissions ? `${base}?p=${permissions}` : base;
}

/**
 * Destination après connexion, lue dans `?next=` de l'URL courante.
 * N'accepte qu'un chemin interne (ou une URL de la même origine) : jamais
 * de redirection vers un autre site.
 */
export function nextAfterLogin(fallback = '/channels/me'): string {
  if (typeof window === 'undefined') return fallback;
  const raw = new URLSearchParams(window.location.search).get('next');
  if (!raw) return fallback;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith('/login') ? fallback : path;
  } catch {
    return fallback;
  }
}

/**
 * Extrait le code d'un lien d'invitation collé par l'utilisateur.
 * Accepte alfy.chat/i/CODE, …/invite/CODE (alfychat.app, ancien format)
 * ou le code seul.
 */
export function parseInviteCode(input: string): string {
  const value = input.trim();
  const match = value.match(/(?:^|\/)(?:i|invite)\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/);
  if (match) return match[1];
  return value;
}
