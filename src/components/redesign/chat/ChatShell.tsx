"use client";

import { useState } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { MemberList } from "./MemberList";
import type { MockMessage, MockUser } from "@/lib/mock-data";
import type { NavOrientation } from "@/components/redesign/nav/NavRail";

interface ChatShellProps {
  channelName: string;
  channelType?: "text" | "dm";
  description?: string;
  messages: MockMessage[];
  onlineMembers: MockUser[];
  offlineMembers: MockUser[];
  onSendMessage?: (content: string) => void;
  orientation?: NavOrientation;
  onToggleOrientation?: () => void;
}

export function ChatShell({
  channelName, channelType = "text", description,
  messages, onlineMembers, offlineMembers, onSendMessage,
  orientation, onToggleOrientation,
}: ChatShellProps) {
  const [membersVisible, setMembersVisible] = useState(true);

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        <ChatHeader
          channelName={channelName}
          channelType={channelType}
          description={description}
          onToggleMembers={() => setMembersVisible((v) => !v)}
          membersVisible={membersVisible}
          orientation={orientation}
          onToggleOrientation={onToggleOrientation}
        />
        <MessageList messages={messages} channelName={channelName} />
        <Composer channelName={channelName} onSend={onSendMessage} />
      </div>

      {membersVisible && (
        <div className="border-l border-sep animate-slide-left">
          <MemberList online={onlineMembers} offline={offlineMembers} />
        </div>
      )}
    </div>
  );
}
