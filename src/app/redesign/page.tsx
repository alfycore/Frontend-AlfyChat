"use client";

import { useState } from "react";
import { NavRail, type NavOrientation } from "@/components/redesign/nav/NavRail";
import { ContextSidebar } from "@/components/redesign/sidebar/ContextSidebar";
import { ChatShell } from "@/components/redesign/chat/ChatShell";
import { SettingsSheet } from "@/components/redesign/settings/SettingsSheet";
import {
  MOCK_SERVERS, MOCK_DMS, MOCK_MESSAGES,
  ONLINE_MEMBERS, OFFLINE_MEMBERS, CURRENT_USER,
} from "@/lib/mock-data";
import type { MockMessage } from "@/lib/mock-data";

export default function DemoPage() {
  const [selectedServerId, setSelectedServerId] = useState<string | null>(MOCK_SERVERS[0].id);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(MOCK_SERVERS[0].channels[0].id);
  const [selectedDmId, setSelectedDmId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<MockMessage[]>(MOCK_MESSAGES);
  const [orientation, setOrientation] = useState<NavOrientation>("horizontal");

  const handleSelectServer = (id: string | null) => {
    setSelectedServerId(id);
    if (id !== null) {
      const s = MOCK_SERVERS.find((s) => s.id === id);
      if (s) setSelectedChannelId(s.channels[0].id);
      setSelectedDmId(null);
    } else {
      setSelectedChannelId(null);
    }
  };

  const handleSend = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}`, author: CURRENT_USER, content, timestamp: new Date() },
    ]);
  };

  const selectedServer = MOCK_SERVERS.find((s) => s.id === selectedServerId);
  const selectedChannel = selectedServer?.channels.find((c) => c.id === selectedChannelId);
  const selectedDm = MOCK_DMS.find((d) => d.id === selectedDmId);
  const channelName = selectedChannel?.name ?? selectedDm?.user.name ?? "général";

  const rail = (
    <NavRail
      servers={MOCK_SERVERS}
      selectedServerId={selectedServerId}
      onSelectServer={handleSelectServer}
      onOpenSettings={() => setSettingsOpen(true)}
      orientation={orientation}
    />
  );

  const sidebar = (
    <ContextSidebar
      selectedServerId={selectedServerId}
      servers={MOCK_SERVERS}
      dms={MOCK_DMS}
      selectedChannelId={selectedChannelId}
      selectedDmId={selectedDmId}
      orientation={orientation}
      onSelectChannel={setSelectedChannelId}
      onSelectDm={setSelectedDmId}
      onOpenSettings={() => setSettingsOpen(true)}
    />
  );

  const chat = (
    <ChatShell
      channelName={channelName}
      channelType={selectedDm ? "dm" : "text"}
      description={selectedChannel?.type === "announce" ? "Canal d'annonces" : undefined}
      messages={messages}
      onlineMembers={ONLINE_MEMBERS}
      offlineMembers={OFFLINE_MEMBERS}
      onSendMessage={handleSend}
      orientation={orientation}
      onToggleOrientation={() => setOrientation((o) => o === "vertical" ? "horizontal" : "vertical")}
    />
  );

  if (orientation === "horizontal") {
    return (
      <div className="flex flex-col h-dvh overflow-hidden bg-background">
        {rail}
        <div className="flex flex-row flex-1 overflow-hidden">
          {sidebar}
          {chat}
        </div>
        <SettingsSheet
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          orientation={orientation}
          onSetOrientation={setOrientation}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-row h-dvh overflow-hidden bg-background">
      {rail}
      {sidebar}
      {chat}
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        orientation={orientation}
        onSetOrientation={setOrientation}
      />
    </div>
  );
}
