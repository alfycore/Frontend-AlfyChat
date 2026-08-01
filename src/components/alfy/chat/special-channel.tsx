'use client';

import { ScrollShadow } from '@heroui/react';

import type { AlfyChannel } from '@/components/alfy/mock/types';
import { ChatHeader } from '@/components/alfy/chat/chat-header';
import { SPECIAL_VIEWS, type SpecialViewType } from '@/components/alfy/chat/special-views';

interface SpecialChannelProps {
  channel: AlfyChannel;
  onToggleMembers?: () => void;
  membersOpen?: boolean;
  onOpenNav?: () => void;
}

/** Salon d'un type spécial (forum, galerie, sondage…) : en-tête + vue dédiée. */
export function SpecialChannel({ channel, onToggleMembers, membersOpen, onOpenNav }: SpecialChannelProps) {
  const entry = SPECIAL_VIEWS[channel.type as SpecialViewType];
  const View = entry?.Component;
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-surface">
      <ChatHeader channel={channel} onToggleMembers={onToggleMembers} membersOpen={membersOpen} onOpenNav={onOpenNav} />
      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto" orientation="vertical">
        {View ? <View /> : null}
      </ScrollShadow>
    </div>
  );
}
