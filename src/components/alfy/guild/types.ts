/**
 * Types du module « guild » (serveurs façon Discord).
 * Formes normalisées : tout ce qui vient du réseau passe par `normalize.ts`.
 */

import type { AlfyUser } from '@/components/alfy/mock/types';

/** Types de salons rendus par la sidebar. `category` n'est jamais un salon. */
export type GuildChannelType =
  | 'text' | 'voice' | 'announcement' | 'forum' | 'stage' | 'gallery' | 'media' | 'doc'
  | 'poll' | 'counting' | 'minigame' | 'trivia' | 'suggestion' | 'vent' | 'thread' | 'category';

export interface GuildChannel {
  id: string;
  serverId: string;
  name: string;
  type: GuildChannelType;
  position: number;
  parentId: string | null;
  topic?: string;
  isNsfw: boolean;
  /** Mode lent, en secondes (0 = désactivé). */
  slowMode: number;
  /** Limite d'utilisateurs d'un salon vocal (0 = illimitée). */
  userLimit: number;
}

export interface GuildRole {
  id: string;
  name: string;
  /** Hex `#rrggbb` ; `#99aab5` = « pas de couleur » (comme Discord). */
  color: string;
  permissions: number;
  position: number;
  isDefault: boolean;
  /** Affiché séparément dans la liste des membres. */
  hoist: boolean;
  mentionable: boolean;
  iconEmoji?: string | null;
}

export interface GuildMember {
  userId: string;
  /** Rôles explicites (hors @everyone, toujours appliqué). */
  roleIds: string[];
  nickname?: string;
  joinedAt: string;
  user: AlfyUser;
}

export interface GuildInfo {
  id: string;
  name: string;
  iconUrl?: string;
  bannerUrl?: string;
  description?: string;
  ownerId: string;
  isPublic: boolean;
  nodeOnline: boolean | null;
  selfHosted: boolean;
  hostingType?: 'platform' | 'self_hosted' | 'certified_host';
  hostingCategory?: 'standard' | 'community';
  maxMembers?: number;
  verificationLevel?: 'none' | 'low' | 'medium' | 'high';
  memberCount?: number;
}

export interface VoiceMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  muted: boolean;
  deafened: boolean;
  video: boolean;
  streaming: boolean;
  serverMuted: boolean;
  serverDeafened: boolean;
  joinedAt: number | null;
}

export interface VoiceChannelState {
  serverId: string;
  participants: VoiceMember[];
  /** « Définir un statut de salon » — éphémère. */
  status: string | null;
}

export interface ChannelOverride {
  targetType: 'role' | 'member';
  targetId: string;
  allow: number;
  deny: number;
}

/** Catégorie + ses salons, prête pour la sidebar. */
export interface ChannelGroup {
  /** `null` = salons hors catégorie (en tête de liste). */
  category: GuildChannel | null;
  channels: GuildChannel[];
}
