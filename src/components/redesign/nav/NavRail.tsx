"use client";

import { Tooltip, Button, Avatar } from "@heroui/react";
import { MessageCircle, Compass, Plus, Users, Inbox, Bell } from "lucide-react";
import { ServerIcon } from "./ServerIcon";
import type { MockServer } from "@/lib/mock-data";
import { CURRENT_USER } from "@/lib/mock-data";
import { PresenceDot } from "@/components/redesign/ui/PresenceDot";

export type NavOrientation = "vertical" | "horizontal";

interface NavRailProps {
  servers: MockServer[];
  selectedServerId: string | null;
  onSelectServer: (id: string | null) => void;
  onOpenSettings: () => void;
  orientation?: NavOrientation;
}

/* ─── Rich server card (horizontal mode) ─────────────────────── */
function ServerCard({
  server, selected, index, onSelect,
}: {
  server: MockServer;
  selected: boolean;
  index: number;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(server.id)}
      className={`group animate-pop relative flex shrink-0 items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-3 outline-none transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] ${
        selected
          ? "bg-surface ring-2 ring-accent"
          : "bg-surface/50 ring-1 ring-transparent hover:bg-surface hover:ring-border"
      }`}
      style={{
        animationDelay: `${index * 50}ms`,
        ...(selected
          ? { boxShadow: "0 4px 20px -4px color-mix(in oklch, var(--accent) 45%, transparent)" }
          : {}),
      }}
      aria-label={server.name}
    >
      <Avatar
        className="size-9 shrink-0 rounded-lg"
        style={{ background: server.color }}
      >
        <Avatar.Fallback
          className="rounded-lg text-xs font-bold text-accent-fg border-none"
          style={{ background: server.color }}
        >
          {server.initials}
        </Avatar.Fallback>
      </Avatar>

      <div className="flex min-w-0 flex-col items-start">
        <span className="max-w-[130px] truncate text-sm font-semibold leading-tight text-foreground">
          {server.name}
        </span>
        <div className="mt-1 flex items-center gap-1">
          {/* Members online (green) */}
          <span className="flex items-center gap-1 rounded-md bg-success/15 px-1.5 py-px text-[10px] font-bold text-success leading-none">
            <span className="size-1.5 rounded-full bg-success animate-pulse-dot" />
            {server.members}
          </span>
          {/* Unread / mentions (red) */}
          {server.unread > 0 && (
            <span className="flex h-[15px] min-w-[15px] items-center justify-center rounded-md bg-danger px-1 text-[10px] font-bold text-danger-fg leading-none">
              {server.unread > 99 ? "99+" : server.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function NavRail({
  servers,
  selectedServerId,
  onSelectServer,
  onOpenSettings,
  orientation = "vertical",
}: NavRailProps) {
  const isH = orientation === "horizontal";
  const isDmSelected = selectedServerId === null;
  const tipSide = isH ? "bottom" : "right";

  /* ── shared DM button (vertical) ── */
  const DmButton = (
    <Tooltip delay={0}>
      <Tooltip.Trigger aria-label="Messages directs">
        <button
          onClick={() => onSelectServer(null)}
          className={`group relative flex items-center justify-center rounded-3xl outline-none transition-all duration-200 size-10 ${
            isDmSelected
              ? "rounded-[14px] bg-accent"
              : "bg-surface hover:rounded-[14px] hover:bg-accent"
          }`}
        >
          {isDmSelected && (
            <span
              className={`absolute rounded-full bg-foreground ${
                isH ? "-bottom-2 h-1 w-5" : "-left-3 h-5 w-1"
              }`}
            />
          )}
          <MessageCircle
            className={`size-5 transition-colors ${
              isDmSelected ? "text-accent-fg" : "text-muted group-hover:text-accent-fg"
            }`}
          />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content showArrow placement={tipSide}>
        <Tooltip.Arrow />
        <p className="font-medium">Messages directs</p>
      </Tooltip.Content>
    </Tooltip>
  );

  /* ── shared action buttons (vertical) ── */
  const Actions = (
    <>
      <Tooltip delay={0}>
        <Tooltip.Trigger aria-label="Créer un serveur">
          <Button
            isIconOnly variant="ghost"
            className="size-10 rounded-[24px] text-success hover:rounded-[14px] hover:bg-success/15 transition-all duration-200"
          >
            <Plus className="size-5" />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow placement={tipSide}>
          <Tooltip.Arrow />
          <p className="font-medium">Créer ou rejoindre un serveur</p>
        </Tooltip.Content>
      </Tooltip>

      <Tooltip delay={0}>
        <Tooltip.Trigger aria-label="Découvrir">
          <Button
            isIconOnly variant="ghost"
            className="size-10 rounded-[24px] text-muted hover:rounded-[14px] hover:bg-accent/15 hover:text-accent transition-all duration-200"
          >
            <Compass className="size-5" />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow placement={tipSide}>
          <Tooltip.Arrow />
          <p className="font-medium">Découvrir des serveurs</p>
        </Tooltip.Content>
      </Tooltip>
    </>
  );

  /* ── user avatar ── */
  const UserAvatar = (
    <div className="relative">
      <button onClick={onOpenSettings} className="group block outline-none" aria-label="Paramètres">
        <Avatar className="size-8 ring-2 ring-border group-hover:ring-accent transition-all duration-200">
          <Avatar.Fallback className="text-xs font-bold bg-accent text-accent-fg border-none">
            {CURRENT_USER.initials}
          </Avatar.Fallback>
        </Avatar>
        <PresenceDot status={CURRENT_USER.status} size="sm" className="absolute -bottom-0.5 -right-0.5" />
      </button>
    </div>
  );

  /* ── VERTICAL layout ── */
  if (!isH) {
    return (
      <nav className="flex h-full w-14 shrink-0 flex-col items-center gap-1.5 py-3 bg-background">
        {DmButton}
        <div className="my-1 h-px w-8 rounded-full bg-sep" />

        <div className="flex flex-col items-center gap-1.5 overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>
          {servers.map((s) => (
            <ServerIcon
              key={s.id} id={s.id} name={s.name} initials={s.initials}
              color={s.color} unread={s.unread} mention={s.mention}
              selected={selectedServerId === s.id}
              onSelect={onSelectServer}
              orientation="vertical"
            />
          ))}
        </div>

        <div className="my-1 h-px w-8 rounded-full bg-sep" />
        {Actions}
        <div className="flex-1" />
        {UserAvatar}
      </nav>
    );
  }

  /* ── HORIZONTAL layout (rich server cards) ── */
  const iconBtn =
    "relative flex size-9 items-center justify-center rounded-lg text-muted outline-none transition-all hover:bg-surface hover:text-foreground active:scale-90";

  return (
    <nav className="flex h-16 w-full shrink-0 flex-row items-center gap-2 border-b border-sep bg-background px-3 animate-slide-top">
      {/* App logo / home */}
      <Tooltip delay={0}>
        <Tooltip.Trigger aria-label="Accueil — Messages directs">
          <button
            onClick={() => onSelectServer(null)}
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl outline-none transition-all active:scale-90 ${
              isDmSelected ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            <MessageCircle className="size-5" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow placement="bottom">
          <Tooltip.Arrow />
          <p className="font-medium">Accueil</p>
        </Tooltip.Content>
      </Tooltip>

      <div className="mx-1 h-9 w-px shrink-0 rounded-full bg-sep" />

      {/* Server cards */}
      <div
        className="flex flex-1 flex-row items-center gap-2 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {servers.map((s, i) => (
          <ServerCard
            key={s.id}
            server={s}
            index={i}
            selected={selectedServerId === s.id}
            onSelect={onSelectServer}
          />
        ))}

        {/* Add server */}
        <Tooltip delay={0}>
          <Tooltip.Trigger aria-label="Ajouter un serveur">
            <button className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-dashed border-border text-muted outline-none transition-all hover:border-accent hover:bg-accent/10 hover:text-accent active:scale-90">
              <Plus className="size-5" />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content showArrow placement="bottom">
            <Tooltip.Arrow />
            <p className="font-medium">Ajouter un serveur</p>
          </Tooltip.Content>
        </Tooltip>
      </div>

      {/* Right cluster */}
      <div className="flex shrink-0 items-center gap-1 pl-2">
        <Tooltip delay={0}>
          <Tooltip.Trigger aria-label="Amis">
            <button className={iconBtn}><Users className="size-[18px]" /></button>
          </Tooltip.Trigger>
          <Tooltip.Content showArrow placement="bottom"><Tooltip.Arrow /><p>Amis</p></Tooltip.Content>
        </Tooltip>

        <Tooltip delay={0}>
          <Tooltip.Trigger aria-label="Activité">
            <button className={iconBtn}>
              <Inbox className="size-[18px]" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-danger-fg ring-2 ring-background">
                4
              </span>
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content showArrow placement="bottom"><Tooltip.Arrow /><p>Activité</p></Tooltip.Content>
        </Tooltip>

        <Tooltip delay={0}>
          <Tooltip.Trigger aria-label="Notifications">
            <button className={iconBtn}><Bell className="size-[18px]" /></button>
          </Tooltip.Trigger>
          <Tooltip.Content showArrow placement="bottom"><Tooltip.Arrow /><p>Notifications</p></Tooltip.Content>
        </Tooltip>

        <Tooltip delay={0}>
          <Tooltip.Trigger aria-label="Découvrir des serveurs">
            <button className={iconBtn}><Compass className="size-[18px]" /></button>
          </Tooltip.Trigger>
          <Tooltip.Content showArrow placement="bottom"><Tooltip.Arrow /><p>Découvrir</p></Tooltip.Content>
        </Tooltip>

        <div className="mx-1 h-7 w-px rounded-full bg-sep" />

        {UserAvatar}
      </div>
    </nav>
  );
}
