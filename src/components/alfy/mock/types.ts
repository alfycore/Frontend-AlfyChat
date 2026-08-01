/**
 * Alfy — contrat de données du redesign.
 * Les noms de champs suivent les shapes réelles de src/lib/api.ts et
 * src/lib/socket.ts (ids string, dates ISO, permissions bitmask) pour que le
 * rebranchage sur /channels ne demande que des containers, pas de refonte.
 */

export type AlfyPresence = 'online' | 'idle' | 'dnd' | 'invisible' | 'offline';

export type AlfyBadgeId =
  | 'staff'
  | 'developer'
  | 'self-host'
  | 'verified'
  | 'early'
  | 'bug-hunter';

/** Badge réel (backend `users.badges` JSON) : id/nom/icône/couleur libres, pas un enum fermé. */
export interface AlfyBadge {
  id: string;
  name: string;
  /** Emoji brut (badges système historiques) ou identifiant d'icône (voir iconType). */
  icon: string;
  /** Présent pour les badges personnalisés attribués par un admin ; absent = emoji brut. */
  iconType?: 'bootstrap' | 'svg' | 'flaticon';
  iconValue?: string;
  /** Couleur hex. */
  color: string;
}

export type AlfyFriendState = 'none' | 'pending_sent' | 'pending_received' | 'friends';

export interface AlfyUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  /** Bannière de profil : image prioritaire, sinon couleur pleine. */
  bannerUrl?: string;
  bannerColor?: string;
  bio?: string;
  status: AlfyPresence;
  customStatus?: string;
  /** Emoji accolé au statut personnalisé. */
  statusEmoji?: string;
  /** Dernière connexion (ISO) — affichée quand hors ligne. */
  lastSeenAt?: string;
  /** Centres d'intérêt affichés en tags sur le profil. */
  interests?: string[];
  badges: AlfyBadge[];
  isBot?: boolean;
  isVerifiedBot?: boolean;
  createdAt: string;
}

/** Bitmask identique au microservice servers + extensions gateway. */
export const PERMISSIONS = {
  READ: 0x1,
  SEND: 0x2,
  REACT: 0x4,
  MANAGE_MESSAGES: 0x8,
  KICK: 0x10,
  BAN: 0x20,
  ADMIN: 0x40,
  MANAGE_CHANNELS: 0x80,
  MANAGE_ROLES: 0x100,
  KICK_MEMBERS: 0x400,
  BAN_MEMBERS: 0x800,
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const PERMISSION_LABELS: Record<PermissionKey, { label: string; description: string }> = {
  READ: { label: 'Lire les messages', description: 'Voir les salons et lire leur historique.' },
  SEND: { label: 'Envoyer des messages', description: 'Écrire dans les salons textuels.' },
  REACT: { label: 'Ajouter des réactions', description: 'Réagir aux messages avec des emojis.' },
  MANAGE_MESSAGES: {
    label: 'Gérer les messages',
    description: 'Supprimer ou épingler les messages des autres membres.',
  },
  KICK: { label: 'Expulser (service)', description: 'Expulsion via le microservice serveurs.' },
  BAN: { label: 'Bannir (service)', description: 'Bannissement via le microservice serveurs.' },
  ADMIN: {
    label: 'Administrateur',
    description: 'Toutes les permissions. À accorder avec prudence.',
  },
  MANAGE_CHANNELS: {
    label: 'Gérer les salons',
    description: 'Créer, modifier et supprimer des salons et catégories.',
  },
  MANAGE_ROLES: {
    label: 'Gérer les rôles',
    description: 'Créer et modifier les rôles situés sous le sien.',
  },
  KICK_MEMBERS: {
    label: 'Expulser des membres',
    description: 'Retirer un membre du serveur (il pourra revenir avec une invitation).',
  },
  BAN_MEMBERS: {
    label: 'Bannir des membres',
    description: 'Bannir définitivement un membre du serveur.',
  },
};

export interface AlfyRole {
  id: string;
  name: string;
  color: string;
  emoji?: string;
  permissions: number;
  hoisted: boolean;
  position: number;
}

export interface AlfyMember {
  userId: string;
  roleIds: string[];
  joinedAt: string;
  nickname?: string;
}

export type AlfyChannelType =
  | 'text'
  | 'voice'
  | 'announcement'
  | 'forum'
  | 'gallery'
  | 'media'
  | 'doc'
  | 'poll'
  | 'counting'
  | 'minigame'
  | 'trivia'
  | 'suggestion'
  | 'vent';

export interface AlfyChannel {
  id: string;
  serverId: string;
  name: string;
  type: AlfyChannelType;
  topic?: string;
  categoryId: string | null;
  unreadCount: number;
  mentionCount: number;
}

export interface AlfyCategory {
  id: string;
  name: string;
}

export interface AlfyServer {
  id: string;
  name: string;
  iconUrl?: string;
  isPublic: boolean;
  ownerId: string;
  nodeOnline: boolean;
  selfHosted: boolean;
  categories: AlfyCategory[];
  channels: AlfyChannel[];
  roles: AlfyRole[];
  members: AlfyMember[];
  mentionCount: number;
  unread: boolean;
}

export interface AlfyReaction {
  emoji: string;
  count: number;
  me: boolean;
}

export interface AlfyAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url?: string;
  width?: number;
  height?: number;
}

export interface AlfyLinkPreview {
  url: string;
  siteName: string;
  title: string;
  description: string;
  imageUrl?: string;
}

export interface AlfyInviteEmbed {
  code: string;
  serverId: string;
}

export interface AlfyMessage {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  createdAt: string;
  editedAt?: string;
  encrypted: boolean;
  reactions: AlfyReaction[];
  replyToId?: string;
  threadId?: string;
  threadCount?: number;
  attachments: AlfyAttachment[];
  linkPreview?: AlfyLinkPreview;
  invite?: AlfyInviteEmbed;
  pinned?: boolean;
  mentions: string[];
}

export interface AlfyDM {
  id: string;
  recipientId: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface AlfyGroupDM {
  id: string;
  name?: string;
  memberIds: string[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

/* ── Appels ─────────────────────────────────────────────────────────────── */

export interface AlfyNetworkStats {
  latencyMs: number;
  lossPct: number;
  bitrateKbps: number;
}

export interface AlfyCallParticipant {
  userId: string;
  speaking: boolean;
  muted: boolean;
  videoOn: boolean;
  screenSharing: boolean;
  network: AlfyNetworkStats;
}

/* ── Settings serveur ───────────────────────────────────────────────────── */

export interface AlfyInvite {
  code: string;
  createdBy: string;
  uses: number;
  maxUses: number | null;
  expiresAt: string | null;
}

export interface AlfyBan {
  userId: string;
  reason: string;
  bannedBy: string;
  bannedAt: string;
}

export interface AlfyAuditEntry {
  id: string;
  actorId: string;
  action: string;
  target: string;
  createdAt: string;
}

/* ── Settings utilisateur ───────────────────────────────────────────────── */

export interface AlfySession {
  id: string;
  device: string;
  location: string;
  lastActiveAt: string;
  current: boolean;
}

export interface AlfyDeviceKey {
  deviceId: string;
  deviceName: string;
  fingerprint: string;
  verified: boolean;
  createdAt: string;
}

/* ── Node auto-hébergé ──────────────────────────────────────────────────── */

export type AlfyLogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface AlfyNodeLog {
  id: string;
  ts: string;
  level: AlfyLogLevel;
  message: string;
}

export interface AlfyNodeStatus {
  online: boolean;
  version: string;
  uptimeSec: number;
  messagesStored: number;
  diskUsedMb: number;
  diskTotalMb: number;
  domain: string | null;
  domainVerified: boolean;
}

/* ── Portail développeur ────────────────────────────────────────────────── */

export interface AlfyBot {
  id: string;
  name: string;
  avatarUrl?: string;
  description: string;
  public: boolean;
  serverCount: number;
  createdAt: string;
}

export interface AlfyApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface AlfyWebhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
}

export interface AlfySlashCommand {
  name: string;
  description: string;
  args?: string;
}

export type AlfyNotifType = 'mention' | 'reply' | 'friend' | 'system';

export interface AlfyNotification {
  id: string;
  type: AlfyNotifType;
  actorId?: string;
  text: string;
  context?: string;
  createdAt: string;
  read: boolean;
}

export type AlfyNotifLevel = 'all' | 'mentions' | 'nothing';
