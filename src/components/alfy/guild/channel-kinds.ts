/**
 * Registre des types de salon proposés à la création.
 *
 * Les 30 types « à usage » reposent sur une vue existante (texte, forum, vocal,
 * scène) ; un type texte peut porter une règle d'écriture, appliquée par le
 * gateway (gateway/src/channel_kinds.rs) et anticipée ici pour guider l'auteur.
 * Liste identique à servers/internal/servers/channel_kinds.go.
 */

import type { GuildChannelType } from '@/components/alfy/guild/types';

export type KindGroup = 'basic' | 'text' | 'forum' | 'voice';
export type KindBase = 'text' | 'forum' | 'voice';

export type ChannelRule =
  | 'READ_ONLY'
  | 'MEDIA_ONLY'
  | 'LINKS_ONLY'
  | 'MEDIA_OR_LINKS'
  | 'QUESTION_ONLY'
  | 'ONE_WORD'
  | 'EMOJI_ONLY'
  | 'CODE_ONLY'
  | 'COMMANDS_ONLY';

export interface ChannelKind {
  id: GuildChannelType;
  group: KindGroup;
  base: KindBase;
  rule?: ChannelRule;
  /** Mode lent posé par le serveur à la création (secondes). */
  slowMode?: number;
}

/** Ordre d'affichage du sélecteur. Les types d'origine « spéciaux » (galerie, sondage…) restent hors liste. */
export const CHANNEL_KINDS: ChannelKind[] = [
  { id: 'text', group: 'basic', base: 'text' },
  { id: 'voice', group: 'basic', base: 'voice' },
  { id: 'announcement', group: 'basic', base: 'text' },
  { id: 'forum', group: 'basic', base: 'forum' },
  { id: 'stage', group: 'basic', base: 'voice' },

  { id: 'rules', group: 'text', base: 'text', rule: 'READ_ONLY' },
  { id: 'welcome', group: 'text', base: 'text', rule: 'READ_ONLY' },
  { id: 'changelog', group: 'text', base: 'text', rule: 'READ_ONLY' },
  { id: 'logs', group: 'text', base: 'text', rule: 'READ_ONLY' },
  { id: 'resources', group: 'text', base: 'text', rule: 'LINKS_ONLY' },
  { id: 'links', group: 'text', base: 'text', rule: 'LINKS_ONLY' },
  { id: 'memes', group: 'text', base: 'text', rule: 'MEDIA_ONLY' },
  { id: 'art', group: 'text', base: 'text', rule: 'MEDIA_ONLY' },
  { id: 'screenshots', group: 'text', base: 'text', rule: 'MEDIA_ONLY' },
  { id: 'music', group: 'text', base: 'text', rule: 'LINKS_ONLY' },
  { id: 'clips', group: 'text', base: 'text', rule: 'MEDIA_OR_LINKS' },
  { id: 'questions', group: 'text', base: 'text', rule: 'QUESTION_ONLY' },
  { id: 'oneword', group: 'text', base: 'text', rule: 'ONE_WORD' },
  { id: 'emoji', group: 'text', base: 'text', rule: 'EMOJI_ONLY' },
  { id: 'code', group: 'text', base: 'text', rule: 'CODE_ONLY' },
  { id: 'selfpromo', group: 'text', base: 'text', slowMode: 3600 },
  { id: 'focus', group: 'text', base: 'text', slowMode: 60 },
  { id: 'commands', group: 'text', base: 'text', rule: 'COMMANDS_ONLY' },
  { id: 'introductions', group: 'text', base: 'text', slowMode: 21600 },
  { id: 'lfg', group: 'text', base: 'text', slowMode: 300 },

  { id: 'support', group: 'forum', base: 'forum' },
  { id: 'bugs', group: 'forum', base: 'forum' },
  { id: 'feedback', group: 'forum', base: 'forum' },
  { id: 'jobs', group: 'forum', base: 'forum' },
  { id: 'wiki', group: 'forum', base: 'forum' },
  { id: 'showcase', group: 'forum', base: 'forum' },

  { id: 'listening', group: 'voice', base: 'voice' },
  { id: 'gaming', group: 'voice', base: 'voice' },
  { id: 'afk', group: 'voice', base: 'voice' },
  { id: 'podcast', group: 'voice', base: 'voice' },
];

const BY_ID = new Map(CHANNEL_KINDS.map((k) => [k.id, k]));

export const kindOf = (type: GuildChannelType): ChannelKind | undefined => BY_ID.get(type);

/** Le salon s'ouvre-t-il comme un forum (sujets + réponses) ? */
export const isForumKind = (type: GuildChannelType) => kindOf(type)?.base === 'forum';

export const ruleOf = (type: GuildChannelType): ChannelRule | undefined => kindOf(type)?.rule;

const LINK_RE = /https?:\/\/\S+/;
const EMOJI_RE = /^(?:\s|\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|:[A-Za-z0-9_]{2,32}:)+$/u;

/** Même vérification que le gateway ; sert à prévenir l'auteur avant l'envoi. */
export function ruleAllows(rule: ChannelRule, content: string, hasFiles: boolean): boolean {
  const text = content.trim();
  const media = hasFiles || content.includes('[attach:img]') || content.includes('[attach:file]');
  const link = LINK_RE.test(content);
  switch (rule) {
    case 'READ_ONLY':
      return false;
    case 'MEDIA_ONLY':
      return media;
    case 'LINKS_ONLY':
      return link;
    case 'MEDIA_OR_LINKS':
      return media || link;
    case 'QUESTION_ONLY':
      return text.endsWith('?') || text.endsWith('？');
    case 'ONE_WORD':
      return text.length > 0 && !/\s/.test(text) && [...text].length <= 40;
    case 'EMOJI_ONLY':
      return text.length > 0 && EMOJI_RE.test(text);
    case 'CODE_ONLY':
      return content.includes('```');
    case 'COMMANDS_ONLY':
      return text.startsWith('/') || text.startsWith('!');
  }
}
