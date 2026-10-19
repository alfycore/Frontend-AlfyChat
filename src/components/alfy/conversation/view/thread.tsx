'use client';

/**
 * Fil d'une conversation (MP ou groupe).
 *
 * Lit le store par sélecteur, convertit chaque message une seule fois
 * (`toView`), et ne passe aux lignes que des valeurs stables : taper dans la
 * saisie ou recevoir une présence ne re-rend aucune ligne.
 */

import { Alert, Button, ScrollShadow, Spinner } from '@heroui/react';
import { ArrowDown, Lock, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useDmScroll } from '@/components/alfy/dm/use-dm-scroll';
import { dayDivider, sameDay } from '@/components/alfy/guild/chat/time';
import { guildUi } from '@/components/alfy/guild/ui';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import type { AlfyUser } from '@/components/alfy/mock/types';
import * as notif from '@/lib/notification-store';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { useThread, useTypingIds } from '@/components/alfy/conversation/hooks';
import {
  deleteMessage,
  discardMessage,
  editMessage,
  loadOlder,
  openThread,
  requestHistory,
  retryMessage,
  toggleReaction,
} from '@/components/alfy/conversation/engine';
import type { ConversationRef } from '@/components/alfy/conversation/types';
import { toView } from '@/components/alfy/conversation/view/adapt';
import { E2eeIntro, KeyChangeNotice } from '@/components/alfy/conversation/view/e2ee';
import { MessageRow } from '@/components/alfy/conversation/view/message-row';

const GROUP_WINDOW_MS = 7 * 60 * 1000;
const openedNow = () => Date.now();

export interface ThreadProps {
  conversation: ConversationRef;
  me: string;
  title: string;
  avatarUrl?: string;
  people: (id: string) => AlfyUser;
  /** Clé de non-lu de la conversation (`recipientId` en MP, `group:<id>` en groupe). */
  unreadKey: string;
  /** MP : la clé du contact a changé depuis la dernière fois. */
  keyChanged?: boolean;
  onVerify?: () => void;
  onReply: (id: string) => void;
  /** Ancre externe (« aller au message » depuis la recherche). */
  jumpRef?: (fn: (id: string) => boolean) => void;
  footer?: ReactNode;
}

export function ConversationThread({ conversation, me, title, avatarUrl, people, unreadKey, keyChanged, onVerify, onReply, jumpRef, footer }: ThreadProps) {
  const { t, tx, intlLocale } = useTranslation();
  const id = conversation.conversationId;
  const thread = useThread(id);
  const typingIds = useTypingIds(id);
  const isGroup = conversation.kind === 'group';
  const peerName = conversation.kind === 'dm' ? people(conversation.peerId).displayName : undefined;

  useEffect(() => {
    void openThread(conversation);
  }, [conversation]);

  const views = useMemo(() => thread.messages.map((m) => toView(m, me)), [thread.messages, me]);
  const byId = useMemo(() => new Map(views.map((v) => [v.id, v])), [views]);
  const itemIds = useMemo(() => thread.messages.map((m) => m.id), [thread.messages]);

  const onLoadMore = useCallback(() => loadOlder(conversation), [conversation]);
  const { viewportRef, pinned, unread, scrollToBottom, scrollToMessage } = useDmScroll({
    itemIds,
    hasMore: thread.hasMore,
    isLoadingMore: thread.loadingOlder,
    onLoadMore,
  });
  useEffect(() => {
    jumpRef?.(scrollToMessage);
  }, [jumpRef, scrollToMessage]);

  /* Premier non-lu à l'ouverture (barre « Nouveaux »), fixé une fois. */
  const [lastSeen] = useState(() => notif.getLastSeen(unreadKey));
  const [openedAt] = useState(openedNow);

  const lines = useMemo(() => {
    const out: { index: number; day: boolean; header: boolean; isNew: boolean; encStart: boolean }[] = [];
    let newMarked = false;
    for (let i = 0; i < thread.messages.length; i++) {
      const m = thread.messages[i];
      const prev = i > 0 ? thread.messages[i - 1] : undefined;
      const day = !prev || !sameDay(prev.createdAt, m.createdAt);
      const grouped =
        !day &&
        !!prev &&
        prev.authorId === m.authorId &&
        !m.replyToId &&
        (prev.crypto === 'locked') === (m.crypto === 'locked') &&
        new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;
      const isNew = !newMarked && !!lastSeen && m.authorId !== me && m.status === 'sent' && m.createdAt > lastSeen;
      if (isNew) newMarked = true;
      // Groupe : un seul repère là où le chiffrement commence, au lieu d'une
      // étiquette « non chiffré » sur chaque ancien message.
      const encStart = !!prev && prev.crypto === 'plain' && m.crypto !== 'plain';
      out.push({ index: i, day, header: !grouped || isNew || encStart, isNew, encStart });
    }
    return out;
  }, [thread.messages, lastSeen, me]);

  /* Callbacks stables : la mémoïsation des lignes en dépend. */
  const onEdit = useCallback((mid: string, text: string) => void editMessage(conversation, mid, text), [conversation]);
  const onDelete = useCallback(
    async (mid: string, skip: boolean) => {
      if (!skip) {
        const ok = await guildUi.confirm({
          title: t.conv.menu.deleteTitle,
          body: t.conv.menu.deleteBody,
          confirmLabel: t.conv.menu.deleteConfirm,
          danger: true,
        });
        if (!ok) return;
      }
      deleteMessage(conversation, mid);
    },
    [conversation, t],
  );
  const onToggleReaction = useCallback((mid: string, emoji: string) => toggleReaction(id, mid, emoji), [id]);
  const onRetry = useCallback((mid: string) => void retryMessage(id, mid), [id]);
  const onDiscard = useCallback((mid: string) => discardMessage(id, mid), [id]);
  const onAskResend = useMemo(() => (conversation.kind === 'dm' ? () => requestHistory(conversation) : undefined), [conversation]);
  const onJumpTo = useCallback((mid: string) => void scrollToMessage(mid), [scrollToMessage]);

  const typingNames = typingIds.map((uid) => people(uid).displayName);
  const showIntro = !thread.hasMore && thread.status === 'ready';

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ScrollShadow ref={viewportRef} className="alfy-thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex min-h-full flex-col justify-end pb-6">
          {thread.loadingOlder && (
            <div className="flex justify-center py-3" role="status" aria-label={t.conv.thread.loadingOlder}>
              <Spinner size="sm" />
            </div>
          )}

          {showIntro && (
            <div className="px-4 pt-10 pb-2">
              <AlfyAvatar name={title} avatarUrl={avatarUrl} size="lg" className="size-20" />
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground">{title}</h2>
              <p className="mt-1 text-sm text-muted">
                {isGroup ? tx(t.conv.thread.startGroup, { name: title }) : tx(t.conv.thread.startDm, { name: title })}
              </p>
              <E2eeIntro kind={conversation.kind} onVerify={onVerify} />
            </div>
          )}

          {thread.status === 'loading' && thread.messages.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-16" role="status">
              <Spinner size="lg" />
            </div>
          )}

          {thread.status === 'error' && (
            <div className="px-4 py-3">
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>{t.conv.thread.loadError}</Alert.Title>
                </Alert.Content>
                <Button size="sm" variant="secondary" onPress={() => void openThread(conversation, true)}>
                  {t.conv.thread.retryLoad}
                </Button>
              </Alert>
            </div>
          )}

          {lines.map(({ index, day, header, isNew, encStart }) => {
            const message = thread.messages[index];
            const view = views[index];
            const replied = message.replyToId ? byId.get(message.replyToId) : undefined;
            return (
              <div key={message.id}>
                {day && !isNew && (
                  <div className="relative mx-4 mt-6 mb-2 flex items-center" role="separator" aria-label={dayDivider(message.createdAt, intlLocale)}>
                    <span className="h-px flex-1 bg-separator" />
                    <span className="px-2 text-xs font-semibold text-muted">{dayDivider(message.createdAt, intlLocale)}</span>
                    <span className="h-px flex-1 bg-separator" />
                  </div>
                )}
                {encStart && (
                  <div className="mx-4 mt-6 mb-2 flex items-center gap-2" role="separator" aria-label={t.conv.e2ee.badge}>
                    <span className="h-px flex-1 bg-(--alfy-e2e)/35" />
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-(--alfy-e2e)">
                      <Lock className="size-3" aria-hidden />
                      {t.conv.e2ee.startedHere}
                    </span>
                    <span className="h-px flex-1 bg-(--alfy-e2e)/35" />
                  </div>
                )}
                {isNew && (
                  <div className="relative mx-4 mt-4 mb-1 flex items-center" role="separator" aria-label={t.conv.thread.newMessages}>
                    <span className="h-px flex-1 bg-danger" />
                    {day && <span className="px-2 text-xs font-semibold text-danger">{dayDivider(message.createdAt, intlLocale)}</span>}
                    <span className="rounded-sm bg-danger px-1 text-[10px] leading-4 font-bold text-(--danger-foreground) uppercase">
                      {t.conv.thread.newMessages}
                    </span>
                  </div>
                )}
                <MessageRow
                  message={message}
                  view={view}
                  author={people(message.authorId)}
                  replyTo={replied ? { view: replied, author: people(replied.authorId) } : null}
                  showHeader={header}
                  isOwn={message.authorId === me}
                  isFresh={new Date(message.createdAt).getTime() > openedAt}
                  isGroup={isGroup}
                  peerName={peerName}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleReaction={onToggleReaction}
                  onRetry={onRetry}
                  onDiscard={onDiscard}
                  onAskResend={onAskResend}
                  onJumpTo={onJumpTo}
                />
              </div>
            );
          })}

          {keyChanged && peerName && onVerify && <KeyChangeNotice name={peerName} onVerify={onVerify} />}
        </div>
      </ScrollShadow>

      {/* Hors ligne : on lit le coffre, et on le dit. */}
      {thread.error && thread.status === 'ready' && (
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
          <span className="at-fade-up inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted shadow-sm">
            <WifiOff className="size-3.5" aria-hidden />
            {t.conv.thread.offline}
          </span>
        </div>
      )}

      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-3 flex justify-center transition-[opacity,transform] duration-(--dur-2)',
          pinned ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
        )}
      >
        <Button size="sm" variant="secondary" className={cn('at-elev-1', pinned ? 'pointer-events-none' : 'pointer-events-auto')} onPress={() => scrollToBottom('smooth')}>
          <ArrowDown className="size-3.5" aria-hidden />
          {unread > 0 ? (unread > 1 ? tx(t.conv.thread.newBelowMany, { n: unread }) : t.conv.thread.newBelowOne) : t.conv.thread.jumpPresent}
        </Button>
      </div>

      <TypingLine names={typingNames} />
      {footer}
    </div>
  );
}

function TypingLine({ names }: { names: string[] }) {
  const { t, tx } = useTranslation();
  const text =
    names.length === 0
      ? ''
      : names.length === 1
        ? tx(t.conv.typing.one, { a: names[0] })
        : names.length === 2
          ? tx(t.conv.typing.two, { a: names[0], b: names[1] })
          : t.conv.typing.many;
  return (
    <div className="h-6 shrink-0 px-4" aria-live="polite">
      {text && (
        <p className="at-fade flex items-center gap-1.5 text-xs text-muted">
          <span className="flex items-center gap-0.5" aria-hidden>
            <span className="alfy-typing-dot size-1.5 rounded-full bg-foreground/70" />
            <span className="alfy-typing-dot size-1.5 rounded-full bg-foreground/70" />
            <span className="alfy-typing-dot size-1.5 rounded-full bg-foreground/70" />
          </span>
          <span className="truncate font-medium">{text}</span>
        </p>
      )}
    </div>
  );
}
