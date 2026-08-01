"use client";

import { useState } from "react";
import { Avatar } from "@heroui/react";
import { Pencil, Smile, Reply, MoreHorizontal } from "lucide-react";
import { Popover } from "@/components/redesign/ui/Popover";
import { EmojiPicker } from "@/components/redesign/ui/EmojiPicker";
import { UserCard } from "@/components/redesign/user/UserCard";
import type { MockMessage } from "@/lib/mock-data";
import { CURRENT_USER } from "@/lib/mock-data";

interface MessageBubbleProps {
  message: MockMessage;
  isGrouped: boolean;
}

type Reaction = { emoji: string; count: number; reacted: boolean };

function fmt(d: Date) {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, isGrouped }: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>(message.reactions ?? []);
  const isOwn = message.author.id === CURRENT_USER.id;

  const toggleReaction = (emoji: string) => {
    setReactions((prev) => {
      const found = prev.find((r) => r.emoji === emoji);
      if (found) {
        const count = found.count + (found.reacted ? -1 : 1);
        if (count <= 0) return prev.filter((r) => r.emoji !== emoji);
        return prev.map((r) => (r.emoji === emoji ? { ...r, count, reacted: !r.reacted } : r));
      }
      return [...prev, { emoji, count: 1, reacted: true }];
    });
  };

  return (
    <div
      className={`group relative flex items-start gap-3 px-4 py-0.5 transition-colors duration-100 hover:bg-surface/40 ${
        isGrouped ? "mt-0" : "mt-4"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover action toolbar */}
      <div className="absolute -top-3 right-4 z-10 hidden items-center gap-0.5 rounded-xl bg-overlay p-0.5 shadow-lg shadow-black/20 ring-1 ring-sep group-hover:flex">
        <Popover
          placement="top"
          align="end"
          trigger={
            <span className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground" aria-label="Réagir">
              <Smile className="size-4" />
            </span>
          }
        >
          {(close) => (
            <EmojiPicker onSelect={(e) => { toggleReaction(e); close(); }} />
          )}
        </Popover>
        <button className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground" aria-label="Répondre">
          <Reply className="size-4" />
        </button>
        <button className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground" aria-label="Plus">
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      {/* Avatar column */}
      <div className="mt-0.5 w-8 shrink-0">
        {!isGrouped ? (
          <Popover
            placement="right"
            align="start"
            trigger={
              <Avatar size="sm" className="size-8 transition-transform hover:scale-105 active:scale-95">
                <Avatar.Fallback
                  className={`text-xs font-bold border-none ${
                    isOwn ? "bg-accent text-accent-fg" : "bg-surface-3 text-foreground/70"
                  }`}
                >
                  {message.author.initials}
                </Avatar.Fallback>
              </Avatar>
            }
          >
            {(close) => <UserCard user={message.author} onClose={close} />}
          </Popover>
        ) : (
          <span className={`block text-right text-[10px] text-muted/60 transition-opacity ${hovered ? "opacity-100" : "opacity-0"}`}>
            {fmt(message.timestamp)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {!isGrouped && (
          <div className="flex items-baseline gap-2">
            <Popover
              placement="bottom"
              align="start"
              trigger={
                <span className={`text-sm font-semibold leading-tight hover:underline ${isOwn ? "text-accent" : "text-foreground"}`}>
                  {message.author.name}
                </span>
              }
            >
              {(close) => <UserCard user={message.author} onClose={close} />}
            </Popover>
            <span className="text-[10px] text-muted/60">{fmt(message.timestamp)}</span>
          </div>
        )}

        <p className="text-sm leading-relaxed text-foreground/85 break-words">
          {message.content}
          {message.edited && (
            <span className="ml-1 text-[10px] text-muted/60">
              <Pencil className="inline size-2.5 mb-0.5 mr-0.5" />modifié
            </span>
          )}
        </p>

        {reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => toggleReaction(r.emoji)}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-all duration-150 active:scale-90 ${
                  r.reacted
                    ? "bg-accent/20 border border-accent/40 text-accent"
                    : "bg-surface border border-border text-muted hover:bg-surface-2"
                }`}
              >
                <span>{r.emoji}</span>
                <span className="font-medium">{r.count}</span>
              </button>
            ))}
            <Popover
              placement="top"
              align="start"
              trigger={
                <span className="flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface hover:text-foreground" aria-label="Ajouter une réaction">
                  <Smile className="size-3.5" />
                </span>
              }
            >
              {(close) => <EmojiPicker onSelect={(e) => { toggleReaction(e); close(); }} />}
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
}
