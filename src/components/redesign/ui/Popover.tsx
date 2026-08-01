"use client";

import { useState, type ReactNode } from "react";
import { Popover as HPopover } from "@heroui/react";

type Placement = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  placement?: Placement;
  align?: Align;
  /** display mode for the wrapper that anchors the popover */
  triggerClassName?: string;
  offset?: number;
}

/**
 * Wrapper autour du `Popover` HeroUI v3 — conserve l'API interne (trigger +
 * render-prop `close`) tout en s'appuyant sur le vrai composant HeroUI
 * (portail, animations, accessibilité). La surface par défaut de HeroUI est
 * neutralisée : c'est le contenu fourni (UserCard, EmojiPicker, menus…) qui
 * apporte son propre fond glass.
 */
export function Popover({
  trigger,
  children,
  placement = "bottom",
  align = "start",
  triggerClassName = "inline-flex",
  offset = 8,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const heroPlacement = align === "center" ? placement : `${placement} ${align}`;

  return (
    <HPopover isOpen={open} onOpenChange={setOpen}>
      <HPopover.Trigger>
        <span className={`${triggerClassName} cursor-pointer`}>{trigger}</span>
      </HPopover.Trigger>
      <HPopover.Content
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        placement={heroPlacement as any}
        offset={offset}
        className="border-0! bg-transparent! p-0! shadow-none!"
      >
        <HPopover.Dialog className="border-0! bg-transparent! p-0! shadow-none! outline-none!">
          {typeof children === "function" ? children(close) : children}
        </HPopover.Dialog>
      </HPopover.Content>
    </HPopover>
  );
}
