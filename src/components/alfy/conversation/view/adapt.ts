/**
 * Message du store → `AlfyMessage` attendu par les primitives partagées
 * (markdown, pièces jointes, réponses, recherche). Une vue par message, gardée
 * tant que le message ne change pas : la mémoïsation des lignes tient.
 */

import { extractAttachments } from '@/components/alfy/live/map';
import type { AlfyMessage } from '@/components/alfy/mock/types';
import type { ChatMessage } from '@/components/alfy/conversation/types';

const cache = new WeakMap<ChatMessage, { me: string; view: AlfyMessage }>();

export function toView(m: ChatMessage, me: string): AlfyMessage {
  const hit = cache.get(m);
  if (hit && hit.me === me) return hit.view;
  const { text, attachments } = m.crypto === 'locked' ? { text: '', attachments: [] } : extractAttachments(m.content, m.id);
  const view: AlfyMessage = {
    id: m.id,
    channelId: m.conversationId,
    authorId: m.authorId,
    content: text,
    createdAt: m.createdAt,
    editedAt: m.editedAt,
    encrypted: m.crypto === 'e2ee',
    reactions: m.reactions.map((r) => ({ emoji: r.emoji, count: r.userIds.length, me: r.userIds.includes(me) })),
    replyToId: m.replyToId,
    attachments,
    mentions: [],
  };
  cache.set(m, { me, view });
  return view;
}
