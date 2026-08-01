"use client";

import { AvatarFallback } from "@/components/redesign/ui/AvatarFallback";
import { PresenceDot } from "@/components/redesign/ui/PresenceDot";
import { UnreadBadge } from "@/components/redesign/ui/UnreadBadge";
import type { MockDM } from "@/lib/mock-data";

interface ConversationItemProps {
  dm: MockDM;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function ConversationItem({ dm, selected, onSelect }: ConversationItemProps) {
  return (
    <button
      onClick={() => onSelect(dm.id)}
      className={`group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none transition-all duration-150 ${
        selected ? "bg-surface-2" : "hover:bg-surface"
      }`}
    >
      <div className="relative shrink-0">
        <AvatarFallback
          avatarUrl={dm.user.avatar}
          name={dm.user.name}
          seed={dm.user.id}
          size="sm"
          className="size-8"
        />
        <PresenceDot status={dm.user.status} size="sm" className="absolute -bottom-0.5 -right-0.5" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={`truncate text-sm font-medium leading-tight ${
            selected ? "text-foreground" : dm.unread > 0 ? "text-foreground/90" : "text-muted group-hover:text-foreground/80"
          }`}
        >
          {dm.user.name}
        </span>
        <span className="truncate text-[11px] text-muted/60 leading-tight">{dm.lastMessage}</span>
      </div>

      {dm.unread > 0 && <UnreadBadge count={dm.unread} mention={dm.mention} />}
    </button>
  );
}
