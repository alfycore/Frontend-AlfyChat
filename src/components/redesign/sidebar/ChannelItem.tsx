"use client";

import { Hash, Volume2, Megaphone, MessageSquare, Lock } from "lucide-react";
import { UnreadBadge } from "@/components/redesign/ui/UnreadBadge";
import type { MockChannel } from "@/lib/mock-data";

const ICONS = {
  text:     Hash,
  voice:    Volume2,
  forum:    MessageSquare,
  announce: Megaphone,
};

const ICON_COLORS = {
  text:     "text-muted",
  voice:    "text-online",
  forum:    "text-accent",
  announce: "text-away",
};

interface ChannelItemProps {
  channel: MockChannel;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function ChannelItem({ channel, selected, onSelect }: ChannelItemProps) {
  const Icon = ICONS[channel.type];
  const hasUnread = channel.unread > 0;

  return (
    <button
      onClick={() => onSelect(channel.id)}
      className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left outline-none transition-all duration-150 ${
        selected
          ? "bg-surface-2 text-foreground"
          : `text-muted hover:bg-surface hover:text-foreground/80 ${hasUnread ? "font-medium text-foreground/90" : ""}`
      }`}
    >
      <Icon
        className={`size-4 shrink-0 ${selected ? "text-accent" : ICON_COLORS[channel.type]}`}
      />
      <span className="flex-1 truncate text-sm">{channel.name}</span>
      {channel.locked && <Lock className="size-3 shrink-0 text-muted/50" />}
      {channel.unread > 0 && <UnreadBadge count={channel.unread} mention={channel.mention} />}
    </button>
  );
}
