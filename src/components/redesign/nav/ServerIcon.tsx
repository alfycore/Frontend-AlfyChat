"use client";

import { Tooltip, Avatar } from "@heroui/react";
import { UnreadBadge } from "@/components/redesign/ui/UnreadBadge";

interface ServerIconProps {
  id: string;
  name: string;
  initials: string;
  color: string;
  unread: number;
  mention: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  orientation?: "vertical" | "horizontal";
}

export function ServerIcon({
  id, name, initials, color, unread, mention, selected, onSelect,
  orientation = "vertical",
}: ServerIconProps) {
  const placement = orientation === "horizontal" ? "bottom" : "right";

  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger aria-label={name}>
        <button
          onClick={() => onSelect(id)}
          className="group relative flex items-center justify-center outline-none"
          aria-label={name}
        >
          {/* Selection pill — vertical = left, horizontal = bottom */}
          <span
            className={`absolute rounded-full bg-foreground transition-all duration-200 ${
              orientation === "vertical"
                ? `-left-3 w-1 ${selected ? "h-5 opacity-100" : "h-3 opacity-0 group-hover:opacity-60"}`
                : `-bottom-2 h-1 ${selected ? "w-5 opacity-100" : "w-3 opacity-0 group-hover:opacity-60"}`
            }`}
          />

          <Avatar
            className={`size-10 cursor-pointer transition-all duration-200 ${
              selected ? "rounded-[14px]" : "rounded-[24px] group-hover:rounded-[14px]"
            }`}
            style={{ background: color }}
          >
            <Avatar.Fallback
              className="text-sm font-bold text-accent-fg border-none"
              style={{ background: color }}
            >
              {initials}
            </Avatar.Fallback>
          </Avatar>

          {!selected && (unread > 0 || mention) && (
            <span className="absolute -bottom-0.5 -right-0.5">
              <UnreadBadge count={unread} mention={mention} />
            </span>
          )}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content showArrow placement={placement}>
        <Tooltip.Arrow />
        <p className="font-medium">{name}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}
