'use client';

import { Button, ScrollShadow, Tooltip } from '@heroui/react';
import { MessageSquareText, X } from 'lucide-react';

import type { AlfyMessage } from '@/components/alfy/mock/types';
import { MessageItem } from '@/components/alfy/chat/message-item';
import { Composer } from '@/components/alfy/chat/composer';
import { useTranslation } from '@/components/locale-provider';

interface ThreadPanelProps {
  origin: AlfyMessage;
  messages: AlfyMessage[];
  currentUserId: string;
  onClose: () => void;
}

/** Panneau de fil de discussion (colonne droite ≥ lg, plein écran via Drawer sinon). */
export function ThreadPanel({ origin, messages, currentUserId, onClose }: ThreadPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full w-full flex-col bg-surface">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-separator px-3">
        <MessageSquareText className="size-4 text-muted" aria-hidden />
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{t.chat.threadPanelTitle}</h3>
        <Tooltip delay={300}>
          <Button isIconOnly size="sm" variant="ghost" aria-label={t.chat.closeThread} onPress={onClose}>
            <X className="size-4" />
          </Button>
          <Tooltip.Content>
            <p>{t.chat.closeThread}</p>
          </Tooltip.Content>
        </Tooltip>
      </header>
      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto py-2">
        <div className="border-b border-separator pb-2">
          <MessageItem message={origin} showHeader currentUserId={currentUserId} />
        </div>
        {messages.map((m, i) => (
          <MessageItem
            key={m.id}
            message={m}
            showHeader={i === 0 || messages[i - 1].authorId !== m.authorId}
            currentUserId={currentUserId}
          />
        ))}
      </ScrollShadow>
      <Composer placeholder={t.chat.threadReplyPlaceholder} />
    </div>
  );
}
