'use client';

/**
 * Abonnements temps réel des MP et groupes — montés UNE fois par la coquille.
 *
 * Avant, chaque fil ouvert posait ses propres écouteurs (et seuls les
 * messages du fil affiché étaient traités). Ici tout message entrant est
 * déchiffré une fois, rangé dans le coffre et dans le store : ouvrir ensuite
 * la conversation est instantané, et l'aperçu de la liste est déjà lisible.
 */

import { useEffect } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { socketService } from '@/lib/socket';
import { setPreviewText } from '@/lib/dm-preview-store';
import { conversationStore } from '@/components/alfy/conversation/store';
import {
  applyReaction,
  decodeRaw,
  hasPendingIn,
  loadGroup,
  onHistoryRequest,
  onHistoryResponse,
  onMessageSent,
  onSendError,
  onSendFailed,
  openThread,
  refOf,
  setEngineUser,
  wasConfirmedHere,
} from '@/components/alfy/conversation/engine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;
type MessageRaw = Parameters<typeof decodeRaw>[0][number];

const unwrap = (data: unknown): Raw => {
  const d = data as Raw | undefined;
  return (d?.payload as Raw | undefined) ?? d ?? {};
};

export function useConversationRealtime() {
  const { user } = useAuth();
  const me = user?.id ?? '';

  useEffect(() => {
    setEngineUser(me);
  }, [me]);

  useEffect(() => {
    if (!me) return;

    const onNew = async (data: unknown) => {
      const raw = unwrap(data);
      const conversationId = raw.conversationId as string | undefined;
      if (!raw.id || !conversationId) return;
      // Messages de salon de serveur : pas ce module.
      if (!conversationId.startsWith('dm_') && raw.serverId) return;
      const senderId = (raw.senderId ?? raw.authorId) as string | undefined;
      if (senderId === me) {
        // Écho de notre propre envoi (cet onglet) : l'accusé s'en charge.
        if (wasConfirmedHere(raw.id)) return;
        if (hasPendingIn(conversationId)) {
          await new Promise((r) => setTimeout(r, 800));
          if (wasConfirmedHere(raw.id)) return;
        }
      }
      const [message] = await decodeRaw([raw as MessageRaw], conversationId);
      if (!message) return;
      if (message.crypto !== 'locked') setPreviewText(raw.id, message.content);
      if (conversationStore.thread(conversationId).status !== 'idle') {
        conversationStore.mergeMessages(conversationId, [message]);
      }
    };

    const onSent = (data: unknown) => onMessageSent(data as Parameters<typeof onMessageSent>[0]);
    const onError = (data: unknown) => onSendError(String(unwrap(data).error ?? 'SEND_FAILED'));
    const onFailed = (data: unknown) => {
      const id = unwrap(data).messageId as string | undefined;
      if (id) onSendFailed(id);
    };

    const onEdited = async (data: unknown) => {
      const d = unwrap(data);
      const messageId = d.messageId as string | undefined;
      if (!messageId) return;
      const conversationId = (d.conversationId as string | undefined) ?? conversationStore.conversationOf(messageId);
      if (!conversationId) return;
      const current = conversationStore.thread(conversationId).messages.find((m) => m.id === messageId);
      if (!current) return;
      const [message] = await decodeRaw(
        [
          {
            id: messageId,
            senderId: (d.senderId as string | undefined) ?? current.authorId,
            content: d.content,
            senderContent: d.senderContent,
            e2eeType: d.e2eeType,
            createdAt: current.createdAt,
            updatedAt: d.updatedAt,
            isEdited: true,
            replyToId: current.replyToId,
            reactions: current.reactions,
          },
        ],
        conversationId,
      );
      if (message) conversationStore.patchMessage(conversationId, messageId, { ...message, reactions: current.reactions });
    };

    const onDeleted = (data: unknown) => {
      const d = unwrap(data);
      const messageId = d.messageId as string | undefined;
      if (!messageId) return;
      const conversationId = (d.conversationId as string | undefined) ?? conversationStore.conversationOf(messageId);
      if (conversationId) conversationStore.removeMessages(conversationId, [messageId]);
    };

    const reaction = (on: boolean) => (data: unknown) => {
      const d = unwrap(data);
      const messageId = d.messageId as string | undefined;
      const userId = d.userId as string | undefined;
      const emoji = d.emoji as string | undefined;
      if (!messageId || !userId || !emoji) return;
      const conversationId = (d.conversationId as string | undefined) ?? conversationStore.conversationOf(messageId);
      if (conversationId) applyReaction(conversationId, messageId, userId, emoji, on);
    };
    const onReactionAdd = reaction(true);
    const onReactionRemove = reaction(false);

    const typing = (on: boolean) => (data: unknown) => {
      const d = unwrap(data);
      const conversationId = d.conversationId as string | undefined;
      const userId = d.userId as string | undefined;
      if (conversationId && userId && userId !== me) conversationStore.setTyping(conversationId, userId, on);
    };
    const onTypingStart = typing(true);
    const onTypingStop = typing(false);

    const onHistoryRes = (data: unknown) => void onHistoryResponse(unwrap(data) as Parameters<typeof onHistoryResponse>[0]);
    const onHistoryReq = (data: unknown) => void onHistoryRequest(unwrap(data) as Parameters<typeof onHistoryRequest>[0]);

    const groupIdOf = (data: unknown) => {
      const d = unwrap(data);
      return (d.groupId ?? d.id ?? d.conversationId) as string | undefined;
    };
    const onGroupChanged = (data: unknown) => {
      const id = groupIdOf(data);
      if (id) void loadGroup(id, true);
    };
    const onGroupGone = (data: unknown) => {
      const id = groupIdOf(data);
      if (id) conversationStore.forgetGroup(id);
    };

    /* Reconnexion : ce qui a pu arriver pendant la coupure. */
    const onReconnected = () => {
      const now = Date.now();
      for (const [id, t] of Object.entries(conversationStore.get().threads)) {
        if (t.status !== 'ready' || now - (t.syncedAt ?? 0) > 15 * 60_000) continue;
        const ref = refOf(id);
        if (ref) void openThread(ref, true);
      }
    };

    const table: [string, (d: unknown) => void][] = [
      ['message:new', (d) => void onNew(d)],
      ['message:sent', onSent],
      ['message:error', onError],
      ['message:failed', onFailed],
      ['message:edited', (d) => void onEdited(d)],
      ['message:deleted', onDeleted],
      ['REACTION_ADD', onReactionAdd],
      ['REACTION_REMOVE', onReactionRemove],
      ['TYPING_START', onTypingStart],
      ['TYPING_STOP', onTypingStop],
      ['e2ee:history-response', onHistoryRes],
      ['e2ee:history-request', onHistoryReq],
      ['GROUP_UPDATE', onGroupChanged],
      ['GROUP_MEMBER_ADD', onGroupChanged],
      ['GROUP_MEMBER_REMOVE', onGroupChanged],
      ['GROUP_DELETE', onGroupGone],
      ['socket:reconnected', onReconnected],
    ];
    for (const [event, fn] of table) socketService.on(event, fn);
    const sweep = window.setInterval(() => conversationStore.sweepTyping(), 2000);
    return () => {
      for (const [event, fn] of table) socketService.off(event, fn);
      window.clearInterval(sweep);
    };
  }, [me]);
}
