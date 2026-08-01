"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Tooltip, Surface, Button, Chip, Avatar, Dropdown, Label, Header } from "@heroui/react";
import { MessageCircle, Plus, Compass, Users, Mic, MicOff, Headphones, Phone, PhoneOff, Settings, LogOut } from "lucide-react";
import { api, resolveMediaUrl } from "@/lib/api";
import { socketService } from "@/lib/socket";
import { serverListStore, type CachedServer } from "@/lib/server-list-store";
import { useNotificationStore } from "@/lib/notification-store";
import { useAuth } from "@/hooks/use-auth";
import { useMobileNav } from "@/hooks/use-mobile-nav";
import { useVoice } from "@/hooks/use-voice";
import { PresenceDot } from "@/components/redesign/ui/PresenceDot";
import { NotificationCenter } from "@/components/chat/notification-center";

interface Props {
  selectedServer: string | null;
  onSelectServer: (id: string | null) => void;
  horizontal?: boolean;
}

const TONE_PALETTE = [
  "#5865F2", "#2ECC71", "#FAA819", "#ED4245", "#EB459E",
  "#9C84EF", "#1ABC9C", "#E67E22", "#3498DB", "#57D7A1",
];
function tone(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return TONE_PALETTE[Math.abs(h) % TONE_PALETTE.length];
}
function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

export function RedesignServerList({ selectedServer, onSelectServer, horizontal = false }: Props) {
  const router = useRouter();
  const notif = useNotificationStore();
  const { user, updateUser, logout } = useAuth();
  const { openSettings } = useMobileNav();
  const voice = useVoice();

  const onProfileAction = (key: string) => {
    if (key === "settings") openSettings();
    else if (key === "logout") void logout();
    else if (key.startsWith("status-")) updateUser({ status: key.slice(7) as "online" | "idle" | "dnd" | "invisible" });
  };
  const side = horizontal ? "bottom" : "right";

  const servers = useSyncExternalStore(
    serverListStore.subscribe,
    serverListStore.getSnapshot,
    serverListStore.getServerSnapshot,
  );
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  const loadServers = useCallback(async () => {
    const res = await api.getServers();
    if (res.success && res.data) {
      const raw = res.data as Record<string, unknown>[];
      const list: CachedServer[] = raw.map((s) => ({
        id: String(s.id),
        name: String(s.name ?? ""),
        iconUrl: (s.iconUrl ?? s.icon_url ?? undefined) as string | undefined,
        ownerId: (s.ownerId ?? s.owner_id ?? undefined) as string | undefined,
      }));
      try {
        const order = JSON.parse(localStorage.getItem("alfychat_server_order") ?? "[]") as string[];
        if (order.length) {
          const rank = new Map(order.map((id, i) => [id, i]));
          list.sort((a, b) => (rank.get(a.id) ?? list.length) - (rank.get(b.id) ?? list.length));
        }
      } catch { /* ignore */ }
      serverListStore.set(list);
      const cmap = new Map<string, number>();
      raw.forEach((s) => {
        const mc = (s.memberCount ?? s.member_count) as number | undefined;
        if (typeof mc === "number") cmap.set(String(s.id), mc);
      });
      setCounts(cmap);
    }
  }, []);

  useEffect(() => { loadServers(); }, [loadServers]);

  // Socket : présence node + mutations serveur
  useEffect(() => {
    const getId = (d: unknown): string | null => {
      const o = d as { payload?: { serverId?: string }; serverId?: string } | null;
      return o?.payload?.serverId ?? o?.serverId ?? null;
    };
    const onOnline = (d: unknown) => { const id = getId(d); if (id) setOnlineIds((p) => new Set(p).add(id)); };
    const onOffline = (d: unknown) => { const id = getId(d); if (id) setOnlineIds((p) => { const s = new Set(p); s.delete(id); return s; }); };
    const onUpdate = (d: any) => {
      const p = d?.payload ?? d;
      const id = (p?.id ?? p?.serverId) as string | undefined;
      if (!id) return;
      serverListStore.update(id, {
        ...(p.name != null ? { name: p.name as string } : {}),
        ...(p.iconUrl !== undefined ? { iconUrl: (p.iconUrl as string) || undefined } : {}),
      });
    };
    const onGone = (d: unknown) => { const id = getId(d); if (!id) return; serverListStore.remove(id); if (selectedServer === id) onSelectServer(null); };
    const onAdded = (d: any) => {
      const p = d?.payload ?? d;
      if (!p?.id || serverListStore.get().some((s) => s.id === p.id)) return;
      serverListStore.add({ id: String(p.id), name: (p.name as string) ?? "", iconUrl: (p.iconUrl as string) ?? undefined, ownerId: (p.ownerId as string) ?? undefined });
    };

    socketService.on("SERVER_NODE_ONLINE", onOnline);
    socketService.on("SERVER_NODE_OFFLINE", onOffline);
    socketService.on("SERVER_UPDATE", onUpdate);
    socketService.on("SERVER_DELETE", onGone);
    socketService.on("SERVER_KICKED", onGone);
    socketService.on("SERVER_BANNED", onGone);
    socketService.on("SERVER_JOINED", onAdded);
    return () => {
      socketService.off("SERVER_NODE_ONLINE", onOnline);
      socketService.off("SERVER_NODE_OFFLINE", onOffline);
      socketService.off("SERVER_UPDATE", onUpdate);
      socketService.off("SERVER_DELETE", onGone);
      socketService.off("SERVER_KICKED", onGone);
      socketService.off("SERVER_BANNED", onGone);
      socketService.off("SERVER_JOINED", onAdded);
    };
  }, [selectedServer, onSelectServer]);

  const unread = (notif as { unread?: Map<string, number> }).unread ?? new Map<string, number>();
  const mentions = (notif as { mentions?: Map<string, number> }).mentions ?? new Map<string, number>();
  let totalDmUnread = 0;
  unread.forEach((count, key) => { if (key.startsWith("dm:") || key.startsWith("group:")) totalDmUnread += count; });

  /* ════════ HORIZONTAL — topbar de cartes serveur (HeroUI) ════════ */
  if (horizontal) {
    const meName = user?.displayName || user?.username || "Moi";
    const meAvatar = user?.avatarUrl ? resolveMediaUrl(user.avatarUrl) : undefined;
    const meStatus = (user?.status as string) ?? "online";
    const toDot = (s: string): "online" | "away" | "dnd" | "offline" =>
      s === "online" ? "online" : s === "idle" ? "away" : s === "dnd" ? "dnd" : "offline";

    return (
      <Surface variant="transparent" aria-label="Serveurs" className="flex h-full w-full flex-row items-center gap-2 bg-background px-3">
        {/* Accueil / DM */}
        <Tooltip delay={0}>
          <Tooltip.Trigger aria-label="Messages directs">
            <Button
              isIconOnly
              variant="ghost"
              onPress={() => onSelectServer(null)}
              className={`size-10 shrink-0 rounded-xl ${selectedServer === null ? "bg-accent text-accent-fg" : "text-muted hover:text-foreground"}`}
            >
              <MessageCircle className="size-5" />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content showArrow placement="bottom"><Tooltip.Arrow /><p className="font-medium">Messages directs</p></Tooltip.Content>
        </Tooltip>

        {/* Cartes serveur */}
        <div className="flex flex-1 flex-row items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {servers.map((server) => {
            const active = selectedServer === server.id;
            const u = unread.get(`server:${server.id}`) ?? 0;
            const m = mentions.get(`server:${server.id}`) ?? 0;
            const icon = server.iconUrl ? resolveMediaUrl(server.iconUrl) : undefined;
            const online = onlineIds.has(server.id);
            const members = counts.get(server.id);
            return (
              <Button
                key={server.id}
                variant="ghost"
                onPress={() => onSelectServer(server.id)}
                aria-label={server.name}
                className={`group h-auto shrink-0 justify-start gap-2.5 rounded-xl py-1.5 pl-1.5 pr-3 ${
                  active ? "bg-surface ring-2 ring-inset ring-accent" : "bg-surface/50 ring-1 ring-inset ring-transparent hover:bg-surface hover:ring-border"
                }`}
              >
                <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-bold text-white" style={icon ? undefined : { background: tone(server.name) }}>
                  {icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={icon} alt={server.name} className="size-full object-cover" />
                  ) : initials(server.name)}
                  {online && <span className="absolute bottom-0 left-0 size-2 rounded-full bg-online ring-2 ring-surface" />}
                </span>
                <span className="flex min-w-0 flex-col items-start">
                  <span className="max-w-[130px] truncate text-sm font-semibold leading-tight text-foreground">{server.name}</span>
                  <span className="mt-1 flex items-center gap-1">
                    {typeof members === "number" && (
                      <Chip color="success" size="sm" variant="secondary">{members}</Chip>
                    )}
                    {(u > 0 || m > 0) && (
                      <Chip color="danger" size="sm">{(m || u) > 99 ? "99+" : (m || u)}</Chip>
                    )}
                  </span>
                </span>
              </Button>
            );
          })}

          {/* Ajouter */}
          <Tooltip delay={0}>
            <Tooltip.Trigger aria-label="Ajouter un serveur">
              <Button isIconOnly variant="ghost" onPress={() => router.push("/channels/discover-server")}
                className="size-10 shrink-0 rounded-xl border border-dashed border-border text-muted hover:border-accent hover:text-accent">
                <Plus className="size-5" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content showArrow placement="bottom"><Tooltip.Arrow /><p className="font-medium">Ajouter un serveur</p></Tooltip.Content>
          </Tooltip>
        </div>

        {/* Cluster droit */}
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip delay={0}>
            <Tooltip.Trigger aria-label="Amis">
              <Button isIconOnly variant="ghost" className="size-9 text-muted hover:text-foreground" onPress={() => onSelectServer(null)}>
                <Users className="size-[18px]" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content showArrow placement="bottom"><Tooltip.Arrow /><p>Amis</p></Tooltip.Content>
          </Tooltip>

          {/* Notifications + activité fusionnées — centre de notifications réel */}
          <NotificationCenter />

          <Tooltip delay={0}>
            <Tooltip.Trigger aria-label="Découvrir">
              <Button isIconOnly variant="ghost" className="size-9 text-muted hover:text-accent" onPress={() => router.push("/channels/discover-server")}><Compass className="size-[18px]" /></Button>
            </Tooltip.Trigger>
            <Tooltip.Content showArrow placement="bottom"><Tooltip.Arrow /><p>Découvrir</p></Tooltip.Content>
          </Tooltip>

          {/* Contrôles vocaux — micro / casque / appel */}
          <Tooltip delay={0}>
            <Tooltip.Trigger aria-label={voice?.isMuted ? "Réactiver le micro" : "Couper le micro"}>
              <Button isIconOnly variant="ghost" className={`size-9 ${voice?.isMuted ? "text-danger" : "text-muted hover:text-foreground"}`} onPress={() => voice?.toggleMute()}>
                {voice?.isMuted ? <MicOff className="size-[18px]" /> : <Mic className="size-[18px]" />}
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content showArrow placement="bottom"><Tooltip.Arrow /><p>{voice?.isMuted ? "Réactiver le micro" : "Couper le micro"}</p></Tooltip.Content>
          </Tooltip>

          <Tooltip delay={0}>
            <Tooltip.Trigger aria-label={voice?.isDeafened ? "Réactiver le son" : "Mettre en sourdine"}>
              <Button isIconOnly variant="ghost" className={`size-9 ${voice?.isDeafened ? "text-danger" : "text-muted hover:text-foreground"}`} onPress={() => voice?.toggleDeafen()}>
                <Headphones className="size-[18px]" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content showArrow placement="bottom"><Tooltip.Arrow /><p>{voice?.isDeafened ? "Réactiver le son" : "Mettre en sourdine"}</p></Tooltip.Content>
          </Tooltip>

          <Tooltip delay={0}>
            <Tooltip.Trigger aria-label={voice?.currentChannelId ? "Quitter l'appel" : "Appel"}>
              <Button isIconOnly variant="ghost" className={`size-9 ${voice?.currentChannelId ? "text-danger" : "text-muted hover:text-foreground"}`} onPress={() => { if (voice?.currentChannelId) voice.leaveChannel(); }}>
                {voice?.currentChannelId ? <PhoneOff className="size-[18px]" /> : <Phone className="size-[18px]" />}
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content showArrow placement="bottom"><Tooltip.Arrow /><p>{voice?.currentChannelId ? "Quitter l'appel" : "Aucun appel en cours"}</p></Tooltip.Content>
          </Tooltip>

          {/* Avatar utilisateur → menu profil déroulant */}
          <Dropdown>
            <Dropdown.Trigger>
              <span className="relative inline-block shrink-0 cursor-pointer outline-none transition-transform active:scale-95" aria-label="Menu profil">
                <Avatar size="sm" className="size-8">
                  {meAvatar && <Avatar.Image src={meAvatar} alt={meName} />}
                  <Avatar.Fallback className="border-none bg-accent text-xs font-bold text-accent-fg">{initials(meName)}</Avatar.Fallback>
                </Avatar>
                <PresenceDot status={toDot(meStatus)} size="sm" className="absolute -bottom-0.5 -right-0.5" />
              </span>
            </Dropdown.Trigger>
            <Dropdown.Popover className="min-w-56">
              <Dropdown.Menu onAction={(key) => onProfileAction(String(key))}>
                <Dropdown.Section>
                  <Header>{meName}</Header>
                  <Dropdown.Item id="status-online" textValue="En ligne"><PresenceDot status="online" size="sm" /><Label>En ligne</Label></Dropdown.Item>
                  <Dropdown.Item id="status-idle" textValue="Absent"><PresenceDot status="away" size="sm" /><Label>Absent</Label></Dropdown.Item>
                  <Dropdown.Item id="status-dnd" textValue="Ne pas déranger"><PresenceDot status="dnd" size="sm" /><Label>Ne pas déranger</Label></Dropdown.Item>
                  <Dropdown.Item id="status-invisible" textValue="Invisible"><PresenceDot status="offline" size="sm" /><Label>Invisible</Label></Dropdown.Item>
                </Dropdown.Section>
                <Dropdown.Item id="settings" textValue="Paramètres"><Settings className="size-4" /><Label>Paramètres</Label></Dropdown.Item>
                <Dropdown.Item id="logout" textValue="Se déconnecter" variant="danger"><LogOut className="size-4" /><Label>Se déconnecter</Label></Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </Surface>
    );
  }

  /* ════════ VERTICAL — rail d'icônes ════════ */
  return (
    <Surface variant="transparent" aria-label="Serveurs" className="flex h-full w-[72px] flex-col items-center gap-2 bg-background py-3">
      <Tooltip delay={0}>
        <Tooltip.Trigger aria-label="Messages directs">
          <button
            onClick={() => onSelectServer(null)}
            className={`group relative flex size-11 shrink-0 items-center justify-center rounded-2xl outline-none transition-all duration-200 active:scale-95 ${
              selectedServer === null ? "rounded-[16px] bg-accent text-accent-fg" : "bg-surface-2 text-muted hover:rounded-[16px] hover:bg-accent hover:text-accent-fg"
            }`}
          >
            <MessageCircle className="size-5" />
            {totalDmUnread > 0 && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-danger-fg ring-2 ring-background">
                {totalDmUnread > 99 ? "99+" : totalDmUnread}
              </span>
            )}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow placement={side}><Tooltip.Arrow /><p className="font-medium">Messages directs</p></Tooltip.Content>
      </Tooltip>

      <div className="my-1 h-px w-7 shrink-0 rounded-full bg-sep" />

      <div className="flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {servers.map((server) => {
          const active = selectedServer === server.id;
          const u = unread.get(`server:${server.id}`) ?? 0;
          const m = mentions.get(`server:${server.id}`) ?? 0;
          const icon = server.iconUrl ? resolveMediaUrl(server.iconUrl) : undefined;
          const online = onlineIds.has(server.id);
          return (
            <Tooltip key={server.id} delay={0}>
              <Tooltip.Trigger aria-label={server.name}>
                <button
                  onClick={() => onSelectServer(server.id)}
                  className={`group relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl outline-none transition-all duration-200 active:scale-95 ${
                    active ? "rounded-[16px] ring-2 ring-accent ring-offset-2 ring-offset-background" : "opacity-90 hover:rounded-[16px] hover:opacity-100"
                  }`}
                  style={icon ? undefined : { background: tone(server.name) }}
                >
                  <span className={`absolute -left-3 w-1 rounded-full bg-foreground transition-all duration-200 ${active ? "h-5 opacity-100" : "h-0 opacity-0 group-hover:h-3 group-hover:opacity-60"}`} />
                  {icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={icon} alt={server.name} className="size-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-white">{initials(server.name)}</span>
                  )}
                  {online && <span className="absolute bottom-0.5 left-0.5 size-2 rounded-full bg-online ring-2 ring-background" />}
                  {(u > 0 || m > 0) && !active && (
                    <span className={`absolute -bottom-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ring-2 ring-background ${m > 0 ? "bg-danger text-danger-fg" : "bg-foreground text-background"}`}>
                      {(m || u) > 99 ? "99+" : (m || u)}
                    </span>
                  )}
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content showArrow placement={side}><Tooltip.Arrow /><p className="font-medium">{server.name}</p></Tooltip.Content>
            </Tooltip>
          );
        })}
      </div>

      <div className="my-1 h-px w-7 shrink-0 rounded-full bg-sep" />

      <Tooltip delay={0}>
        <Tooltip.Trigger aria-label="Ajouter un serveur">
          <button onClick={() => router.push("/channels/discover-server")}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-online outline-none transition-all duration-200 hover:rounded-[16px] hover:bg-online/15 active:scale-95">
            <Plus className="size-5" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow placement={side}><Tooltip.Arrow /><p className="font-medium">Ajouter / rejoindre</p></Tooltip.Content>
      </Tooltip>

      <Tooltip delay={0}>
        <Tooltip.Trigger aria-label="Découvrir">
          <button onClick={() => router.push("/channels/discover-server")}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-muted outline-none transition-all duration-200 hover:rounded-[16px] hover:bg-accent/15 hover:text-accent active:scale-95">
            <Compass className="size-5" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow placement={side}><Tooltip.Arrow /><p className="font-medium">Découvrir</p></Tooltip.Content>
      </Tooltip>
    </Surface>
  );
}
