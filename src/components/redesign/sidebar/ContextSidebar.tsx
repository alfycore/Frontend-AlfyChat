"use client";

import { useState } from "react";
import { Button, Avatar, Tooltip } from "@heroui/react";
import {
  Search, ChevronDown, UserPlus, Settings,
  Mic, MicOff, Headphones, Bell, BellOff, Plus, Users,
} from "lucide-react";
import { ChannelItem } from "./ChannelItem";
import { ConversationItem } from "./ConversationItem";
import { PresenceDot } from "@/components/redesign/ui/PresenceDot";
import { CURRENT_USER } from "@/lib/mock-data";
import type { MockServer, MockDM } from "@/lib/mock-data";
import type { NavOrientation } from "@/components/redesign/nav/NavRail";

interface ContextSidebarProps {
  selectedServerId: string | null;
  servers: MockServer[];
  dms: MockDM[];
  selectedChannelId: string | null;
  selectedDmId: string | null;
  orientation?: NavOrientation;
  onSelectChannel: (id: string) => void;
  onSelectDm: (id: string) => void;
  onOpenSettings: () => void;
}

/* ─── User panel (vertical mode only) ──────────────────────── */
function UserPanel({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  return (
    <div className="shrink-0 border-t border-sep bg-surface-2 animate-slide-top">
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          onClick={onOpenSettings}
          className="relative outline-none transition-transform active:scale-95"
        >
          <Avatar size="sm" className="size-8">
            <Avatar.Fallback className="text-xs font-bold bg-accent text-accent-fg border-none">
              {CURRENT_USER.initials}
            </Avatar.Fallback>
          </Avatar>
          <PresenceDot status={CURRENT_USER.status} size="sm" className="absolute -bottom-0.5 -right-0.5" />
        </button>

        <div className="flex min-w-0 flex-1 flex-col leading-tight cursor-pointer" onClick={onOpenSettings}>
          <span className="truncate text-xs font-semibold text-foreground hover:underline">{CURRENT_USER.name}</span>
          <span className="truncate text-[10px] text-muted">{CURRENT_USER.customStatus ?? "En ligne"}</span>
        </div>

        <div className="flex gap-0.5">
          <Button isIconOnly variant="ghost" size="sm"
            className={`size-7 transition-transform active:scale-90 ${muted ? "text-danger" : "text-muted hover:text-foreground"}`}
            onPress={() => setMuted(!muted)} aria-label="Micro">
            {muted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
          </Button>
          <Button isIconOnly variant="ghost" size="sm"
            className={`size-7 transition-transform active:scale-90 ${deafened ? "text-danger" : "text-muted hover:text-foreground"}`}
            onPress={() => setDeafened(!deafened)} aria-label="Son">
            <Headphones className="size-3.5" />
          </Button>
          <Button isIconOnly variant="ghost" size="sm"
            className="size-7 text-muted hover:text-foreground transition-transform active:scale-90"
            onPress={onOpenSettings} aria-label="Paramètres">
            <Settings className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Server view ──────────────────────────────────────────── */
function ServerSidebar({
  server,
  selectedChannelId,
  orientation,
  onSelectChannel,
  onOpenSettings,
}: {
  server: MockServer;
  selectedChannelId: string | null;
  orientation: NavOrientation;
  onSelectChannel: (id: string) => void;
  onOpenSettings: () => void;
}) {
  const [query, setQuery] = useState("");
  const [textOpen, setTextOpen] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(true);
  const [notif, setNotif] = useState(true);

  const textChannels = server.channels.filter(
    (c) => ["text", "announce", "forum"].includes(c.type) &&
      c.name.toLowerCase().includes(query.toLowerCase())
  );
  const voiceChannels = server.channels.filter(
    (c) => c.type === "voice" && c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex h-full w-64 shrink-0 flex-col bg-surface">
      {/* ── Server header ── */}
      <div
        className="relative flex h-14 shrink-0 items-center justify-between px-4 cursor-pointer group"
        style={{
          background: `linear-gradient(135deg, ${server.color} 0%, color-mix(in oklch, ${server.color} 40%, var(--background)) 100%)`,
        }}
      >
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-bold text-accent-fg drop-shadow-sm">{server.name}</span>
          <span className="text-[10px] text-accent-fg/60 flex items-center gap-1">
            <Users className="size-2.5" /> {server.members} membres
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip delay={0}>
            <Tooltip.Trigger aria-label="Inviter">
              <Button isIconOnly variant="ghost" size="sm"
                className="size-7 text-accent-fg/70 hover:bg-accent-fg/15 hover:text-accent-fg transition-all active:scale-90">
                <UserPlus className="size-3.5" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content showArrow placement="bottom">
              <Tooltip.Arrow /><p>Inviter des membres</p>
            </Tooltip.Content>
          </Tooltip>
          <Tooltip delay={0}>
            <Tooltip.Trigger aria-label="Notifications">
              <Button isIconOnly variant="ghost" size="sm"
                className="size-7 text-accent-fg/70 hover:bg-accent-fg/15 hover:text-accent-fg transition-all active:scale-90"
                onPress={() => setNotif(!notif)}>
                {notif ? <Bell className="size-3.5" /> : <BellOff className="size-3.5" />}
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content showArrow placement="bottom">
              <Tooltip.Arrow /><p>{notif ? "Couper les notifs" : "Activer les notifs"}</p>
            </Tooltip.Content>
          </Tooltip>
          <Tooltip delay={0}>
            <Tooltip.Trigger aria-label="Paramètres du serveur">
              <Button isIconOnly variant="ghost" size="sm"
                className="size-7 text-accent-fg/70 hover:bg-accent-fg/15 hover:text-accent-fg transition-all active:scale-90">
                <Settings className="size-3.5" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content showArrow placement="bottom">
              <Tooltip.Arrow /><p>Paramètres du serveur</p>
            </Tooltip.Content>
          </Tooltip>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="px-2 pt-2.5 pb-1">
        <div className="flex items-center gap-2 rounded-md bg-field/80 border border-sep px-2.5 py-1.5 transition-all focus-within:border-accent/50 focus-within:bg-field">
          <Search className="size-3.5 shrink-0 text-muted" />
          <input
            type="text"
            placeholder="Chercher un canal…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-foreground placeholder:text-field-ph outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted hover:text-foreground transition-transform active:scale-90">
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Channels ── */}
      <div key={server.id} className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5 animate-fade-in">
        {/* Text section */}
        <div>
          <button
            onClick={() => setTextOpen(!textOpen)}
            className="group/cat flex w-full items-center gap-1 rounded px-1 py-1 outline-none hover:bg-surface-2/50 transition-colors"
          >
            <ChevronDown className={`size-3 text-muted/50 transition-transform duration-200 ${textOpen ? "" : "-rotate-90"}`} />
            <span className="flex-1 text-left text-[10px] font-semibold uppercase tracking-widest text-muted/50 group-hover/cat:text-muted">
              Canaux texte
            </span>
            <Plus className="size-3 text-muted/40 opacity-0 group-hover/cat:opacity-100 transition-opacity" />
          </button>

          {textOpen && (
            <div className="mt-0.5 flex flex-col gap-px">
              {textChannels.map((ch) => (
                <ChannelItem
                  key={ch.id} channel={ch}
                  selected={selectedChannelId === ch.id}
                  onSelect={onSelectChannel}
                />
              ))}
            </div>
          )}
        </div>

        {/* Voice section */}
        <div className="pt-1">
          <button
            onClick={() => setVoiceOpen(!voiceOpen)}
            className="group/cat flex w-full items-center gap-1 rounded px-1 py-1 outline-none hover:bg-surface-2/50 transition-colors"
          >
            <ChevronDown className={`size-3 text-muted/50 transition-transform duration-200 ${voiceOpen ? "" : "-rotate-90"}`} />
            <span className="flex-1 text-left text-[10px] font-semibold uppercase tracking-widest text-muted/50 group-hover/cat:text-muted">
              Canaux vocal
            </span>
            <Plus className="size-3 text-muted/40 opacity-0 group-hover/cat:opacity-100 transition-opacity" />
          </button>

          {voiceOpen && (
            <div className="mt-0.5 flex flex-col gap-px">
              {voiceChannels.map((ch) => (
                <ChannelItem
                  key={ch.id} channel={ch}
                  selected={selectedChannelId === ch.id}
                  onSelect={onSelectChannel}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {orientation === "vertical" && <UserPanel onOpenSettings={onOpenSettings} />}
    </div>
  );
}

/* ─── DM view ──────────────────────────────────────────────── */
function DmSidebar({
  dms,
  selectedDmId,
  orientation,
  onSelectDm,
  onOpenSettings,
}: {
  dms: MockDM[];
  selectedDmId: string | null;
  orientation: NavOrientation;
  onSelectDm: (id: string) => void;
  onOpenSettings: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = dms.filter((d) => d.user.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex h-full w-64 shrink-0 flex-col bg-surface">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-sep">
        <span className="text-sm font-semibold text-foreground">Messages directs</span>
        <Tooltip delay={0}>
          <Tooltip.Trigger aria-label="Nouvelle conversation">
            <Button isIconOnly variant="ghost" size="sm"
              className="size-7 text-muted hover:text-foreground transition-transform active:scale-90">
              <UserPlus className="size-4" />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content showArrow placement="bottom">
            <Tooltip.Arrow /><p>Nouvelle conversation</p>
          </Tooltip.Content>
        </Tooltip>
      </div>

      {/* Search */}
      <div className="px-2 pt-2.5 pb-1">
        <div className="flex items-center gap-2 rounded-md bg-field/80 border border-sep px-2.5 py-1.5 focus-within:border-accent/50 focus-within:bg-field transition-all">
          <Search className="size-3.5 shrink-0 text-muted" />
          <input
            type="text"
            placeholder="Chercher ou démarrer une DM…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-foreground placeholder:text-field-ph outline-none"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 animate-fade-in">
        <p className="mb-1 mt-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted/50">
          Conversations récentes
        </p>
        <div className="flex flex-col gap-px">
          {filtered.map((dm) => (
            <ConversationItem
              key={dm.id} dm={dm}
              selected={selectedDmId === dm.id}
              onSelect={onSelectDm}
            />
          ))}
        </div>
      </div>

      {orientation === "vertical" && <UserPanel onOpenSettings={onOpenSettings} />}
    </div>
  );
}

/* ─── Root export ──────────────────────────────────────────── */
export function ContextSidebar({
  selectedServerId, servers, dms, selectedChannelId,
  selectedDmId, orientation = "vertical", onSelectChannel, onSelectDm, onOpenSettings,
}: ContextSidebarProps) {
  const server = servers.find((s) => s.id === selectedServerId);

  if (selectedServerId && server) {
    return (
      <ServerSidebar
        server={server}
        selectedChannelId={selectedChannelId}
        orientation={orientation}
        onSelectChannel={onSelectChannel}
        onOpenSettings={onOpenSettings}
      />
    );
  }

  return (
    <DmSidebar
      dms={dms}
      selectedDmId={selectedDmId}
      orientation={orientation}
      onSelectDm={onSelectDm}
      onOpenSettings={onOpenSettings}
    />
  );
}
