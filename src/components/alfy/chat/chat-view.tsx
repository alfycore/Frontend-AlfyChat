'use client';

import { ScrollShadow } from '@heroui/react';
import { Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { AlfyChannel, AlfyMessage, AlfyServer } from '@/components/alfy/mock/types';
import { useUserById } from '@/components/alfy/user-directory';
import { ChatHeader } from '@/components/alfy/chat/chat-header';
import { Composer } from '@/components/alfy/chat/composer';
import { fadeUp } from '@/components/alfy/motion';
import { MessageList } from '@/components/alfy/chat/message-list';
import { TypingIndicator } from '@/components/alfy/chat/typing-indicator';
import { CHANNEL_TYPE_ICONS } from '@/components/alfy/servers/channel-item';
import { useTranslation } from '@/components/locale-provider';

interface ChatViewProps {
  channel: AlfyChannel;
  messages: AlfyMessage[];
  server?: AlfyServer;
  currentUserId: string;
  typingNames?: string[];
  /** Historique en cours de chargement initial (empêche le scroll prématuré). */
  isLoading?: boolean;
  /** Pagination — d'autres messages plus anciens sont disponibles côté serveur. */
  hasMoreMessages?: boolean;
  isLoadingMoreMessages?: boolean;
  onLoadMore?: () => Promise<unknown> | void;
  onSend?: (content: string) => void;
  onSendGif?: (url: string) => void;
  onOpenThread?: (threadId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onToggleMembers?: () => void;
  membersOpen?: boolean;
  onOpenNav?: () => void;
}

export function ChatView({
  channel,
  messages,
  server,
  currentUserId,
  typingNames = [],
  isLoading = false,
  hasMoreMessages = false,
  isLoadingMoreMessages = false,
  onLoadMore,
  onSend,
  onSendGif,
  onOpenThread,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
  onToggleMembers,
  membersOpen,
  onOpenNav,
}: ChatViewProps) {
  const { t, tx } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Suit si l'utilisateur est proche du bas — évite de forcer le scroll s'il lit l'historique.
  const atBottomRef = useRef(true);
  // Un seul scroll forcé par ouverture de conversation, une fois l'historique arrivé.
  const initScrollRef = useRef(false);
  const IntroIcon = CHANNEL_TYPE_ICONS[channel.type];

  const userById = useUserById();
  const mentionUsers = useMemo(
    () => server?.members.map((m) => userById(m.userId)) ?? [],
    [server, userById],
  );
  const mentionChannels = useMemo(() => server?.channels ?? [], [server]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const checkAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  // Nouveau message reçu/envoyé : ne recolle en bas que si on y était déjà.
  useEffect(() => {
    if (atBottomRef.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  // Changement de conversation : on repart du bas, forcé (double rAF = après peinture).
  useEffect(() => {
    atBottomRef.current = true;
    initScrollRef.current = false;
    requestAnimationFrame(() => { scrollToBottom(); requestAnimationFrame(scrollToBottom); });
  }, [channel.id, scrollToBottom]);

  // Fin du chargement initial de l'historique : premier scroll forcé (une fois).
  useEffect(() => {
    if (!isLoading && messages.length > 0 && !initScrollRef.current) {
      initScrollRef.current = true;
      requestAnimationFrame(() => { scrollToBottom(); requestAnimationFrame(scrollToBottom); });
    }
  }, [isLoading, messages.length, scrollToBottom]);

  // Une image (avatar, pièce jointe…) finit de charger : recolle en bas si on y était.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onImgLoad = (e: Event) => {
      if ((e.target as HTMLElement).tagName === 'IMG' && atBottomRef.current) scrollToBottom();
    };
    el.addEventListener('load', onImgLoad, true);
    return () => el.removeEventListener('load', onImgLoad, true);
  }, [scrollToBottom]);

  // Scroll manuel : suit la position + déclenche le chargement des messages plus anciens
  // en avance (à l'approche du haut du bloc chargé), pour un effet organique sans à-coup.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      checkAtBottom();
      if (el.scrollTop < el.clientHeight && hasMoreMessages && !isLoadingMoreMessages && onLoadMore) {
        atBottomRef.current = false;
        const prevHeight = el.scrollHeight;
        Promise.resolve(onLoadMore()).then(() =>
          requestAnimationFrame(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight;
          }),
        );
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [checkAtBottom, hasMoreMessages, isLoadingMoreMessages, onLoadMore]);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-surface">
      <ChatHeader
        channel={channel}
        messages={messages}
        onToggleMembers={onToggleMembers}
        membersOpen={membersOpen}
        onOpenNav={onOpenNav}
      />
      <ScrollShadow ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {/* Traverse le salon entier — fondu léger au changement de salon. */}
        <motion.div key={channel.id} variants={fadeUp} initial="hidden" animate="visible">
          {/* Intro du salon — début de l'historique */}
          <div className="px-4 pt-6 pb-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-surface-secondary">
              <IntroIcon className="size-5 text-muted" aria-hidden />
            </span>
            <h3 className="mt-2.5 text-lg font-bold">
              {tx(t.chat.welcomeChannelHeading, {
                name: `${channel.type === 'text' || channel.type === 'announcement' ? '#' : ''}${channel.name}`,
              })}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              {channel.topic ?? t.chat.channelTopicFallback}
              <span className="inline-flex items-center gap-1 text-xs text-(--alfy-e2e)">
                <Lock className="size-3" aria-hidden />
                {t.chat.encryptedBadge}
              </span>
            </p>
          </div>
          <MessageList
            messages={messages}
            server={server}
            currentUserId={currentUserId}
            onOpenThread={onOpenThread}
            onToggleReaction={onToggleReaction}
            onEditMessage={onEditMessage}
            onDeleteMessage={onDeleteMessage}
          />
        </motion.div>
      </ScrollShadow>
      <TypingIndicator names={typingNames} />
      <Composer
        placeholder={tx(t.chat.composerPlaceholderChannel, { name: channel.name })}
        onSend={onSend}
        onSendGif={onSendGif}
        mentionUsers={mentionUsers}
        mentionChannels={mentionChannels}
        serverId={server?.id}
      />
    </div>
  );
}
