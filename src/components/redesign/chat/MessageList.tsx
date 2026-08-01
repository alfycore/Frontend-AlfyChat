"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import type { MockMessage } from "@/lib/mock-data";

interface MessageListProps {
  messages: MockMessage[];
  channelName: string;
}

export function MessageList({ messages, channelName }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto py-2">
      {/* Channel welcome */}
      <div className="flex flex-col gap-1 px-4 pb-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 mb-2">
          <span className="text-2xl text-accent">#</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">Bienvenue dans #{channelName}</h2>
        <p className="text-sm text-muted">
          Voici le début du canal <strong className="text-foreground/70">#{channelName}</strong>.
        </p>
      </div>

      {/* Date divider */}
      <div className="mx-4 mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-sep" />
        <span className="text-[10px] font-medium text-muted/60">Aujourd'hui</span>
        <div className="h-px flex-1 bg-sep" />
      </div>

      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const isGrouped =
          !!prev &&
          prev.author.id === msg.author.id &&
          msg.timestamp.getTime() - prev.timestamp.getTime() < 5 * 60_000;
        return <MessageBubble key={msg.id} message={msg} isGrouped={isGrouped} />;
      })}

      <div ref={bottomRef} className="pb-4" />
    </div>
  );
}
