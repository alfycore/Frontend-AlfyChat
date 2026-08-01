"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { SearchField, Disclosure, Button, ListBox, Surface } from "@heroui/react";
import {
  UserPlus, Users, Hash, Volume2, Megaphone, Settings, MicOff,
  MessagesSquare, Radio, Image as ImageIcon, BarChart3, Lightbulb, FileText,
  Flame, MessageCircle, Film, Gamepad2, HelpCircle,
} from "lucide-react";
import { api, resolveMediaUrl } from "@/lib/api";
import { socketService } from "@/lib/socket";
import { useAuth } from "@/hooks/use-auth";
import { useVoice, type VoiceParticipant } from "@/hooks/use-voice";
import { conversationsStore, type CachedConversation } from "@/lib/conversations-store";
import { serverListStore } from "@/lib/server-list-store";
import { useNotificationStore } from "@/lib/notification-store";
import { PresenceDot } from "@/components/redesign/ui/PresenceDot";
import { AvatarFallback } from "@/components/redesign/ui/AvatarFallback";
import { CallBar } from "@/components/chat/call-bar";

interface Props {
  serverId: string | null;
  selectedChannel: string | null;
  onSelectChannel: (channelId: string | null) => void;
  onOpenSettings: () => void;
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}
function toDot(s?: string): "online" | "away" | "dnd" | "offline" {
  if (s === "online") return "online";
  if (s === "idle") return "away";
  if (s === "dnd") return "dnd";
  return "offline";
}

function DmSidebar({ selectedChannel, onSelectChannel }: Omit<Props, "serverId" | "onOpenSettings">) {
  const { user } = useAuth();
  const notif = useNotificationStore();
  const [conversations, setConversations] = useState<CachedConversation[]>(() => conversationsStore.get());
  const [presence, setPresence] = useState<Map<string, string>>(() => conversationsStore.getPresence());
  const [query, setQuery] = useState("");
  const loadRef = useRef<(attempt?: number) => void>(() => {});

  const loadConversations = useCallback(async (attempt = 0) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("alfychat_token") : null;
    if (!token) return;
    try {
      const res = await api.getConversations();
      if (!res.success || !res.data) {
        if (attempt < 3) setTimeout(() => loadRef.current(attempt + 1), attempt === 0 ? 1500 : 3000);
        return;
      }
      const raw = res.data as Record<string, unknown>[];
      const initialPresence = new Map<string, string>();
      const initialCustom = new Map<string, string | null>();
      const withNames = await Promise.all(
        raw.map(async (conv): Promise<CachedConversation> => {
          if (conv.type === "dm" && conv.recipientId) {
            const ur = await api.getUser(conv.recipientId as string).catch(() => null);
            const u = (ur?.success && ur.data) ? (ur.data as Record<string, unknown>) : null;
            if (u?.status) initialPresence.set(conv.recipientId as string, u.status as string);
            if (u?.customStatus !== undefined) initialCustom.set(conv.recipientId as string, (u.customStatus as string) ?? null);
            return {
              id: conv.id as string,
              type: "dm",
              recipientId: conv.recipientId as string,
              recipientName: (u?.displayName as string) || (u?.username as string) || (conv.name as string) || (conv.recipientId as string),
              recipientAvatar: u?.avatarUrl as string | undefined,
              lastMessage: conv.lastMessage as string | undefined,
              lastMessageAt: (conv.lastMessageAt ?? conv.updatedAt) as string | undefined,
            };
          }
          return {
            id: conv.id as string,
            type: (conv.type as "dm" | "group") || "group",
            recipientId: (conv.recipientId as string) || (conv.id as string),
            recipientName: (conv.name as string) || "Groupe",
            recipientAvatar: conv.avatarUrl as string | undefined,
            lastMessage: conv.lastMessage as string | undefined,
            lastMessageAt: (conv.lastMessageAt ?? conv.updatedAt) as string | undefined,
            participants: conv.participants as string[] | undefined,
          };
        }),
      );
      const sorted = withNames.sort((a, b) =>
        (b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0) -
        (a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0),
      );
      conversationsStore.set(sorted, initialPresence, initialCustom);
      setConversations(sorted);
      setPresence(new Map(initialPresence));

      const dmIds = sorted.filter((c) => c.type === "dm").map((c) => c.recipientId).filter(Boolean);
      if (dmIds.length) {
        socketService.requestBulkPresence(dmIds, (list) => {
          if (!list?.length) return;
          const next = new Map(conversationsStore.getPresence());
          list.forEach((p) => next.set(p.userId, p.status));
          conversationsStore.set(conversationsStore.get(), next, conversationsStore.getCustomStatus());
          setPresence(next);
        });
      }
    } catch {
      if (attempt < 3) setTimeout(() => loadRef.current(attempt + 1), attempt === 0 ? 1500 : 3000);
    }
  }, []);
  loadRef.current = loadConversations;

  // Sync depuis le store + chargement initial
  useEffect(() => {
    const unsub = conversationsStore.subscribe(() => {
      setConversations([...conversationsStore.get()]);
      setPresence(new Map(conversationsStore.getPresence()));
    });
    if (conversationsStore.isLoaded()) {
      setConversations(conversationsStore.get());
      setPresence(new Map(conversationsStore.getPresence()));
    } else {
      loadConversations();
    }
    return unsub;
  }, [loadConversations]);

  // Socket DM events
  useEffect(() => {
    const handleMessageNew = (message: any) => {
      const convId = message.conversationId as string | undefined;
      const authorId = (message.senderId ?? message.authorId) as string | undefined;
      const recipientId = message.recipientId as string | undefined;
      const content = (message.content as string) || "";
      const createdAt = (message.createdAt as string) || new Date().toISOString();
      const cur = conversationsStore.get();
      const match = cur.find((c) => c.id === convId || (recipientId && c.type === "dm" && (c.recipientId === authorId || c.recipientId === recipientId)));
      if (!match) { loadRef.current(); return; }
      conversationsStore.updateLastMessage(match.id, content, createdAt);
    };
    const handlePresence = (data: any) => {
      const p = (data?.payload as Record<string, unknown>) || data;
      const uid = p?.userId as string | undefined;
      if (!uid) return;
      conversationsStore.setPresence(uid, p.status as string, (p.text ?? p.customStatus) as string | null | undefined, p.emoji as string | null | undefined);
    };
    const handleConvCreate = (data: any) => {
      if (!data?.id) return;
      conversationsStore.addConversation({
        id: data.id as string,
        type: ((data.type as "dm" | "group") || "dm"),
        recipientId: (data.recipientId as string) || "",
        recipientName: (data.recipientName as string) || "",
        recipientAvatar: (data.recipientAvatar as string) || undefined,
      });
    };
    const handleProfile = (data: any) => {
      const p = (data?.payload as Record<string, unknown>) || data;
      if (!p?.userId) return;
      conversationsStore.updateRecipientProfile(p.userId as string, { displayName: p.displayName as string, avatarUrl: p.avatarUrl as string });
    };
    const handleRefresh = () => loadRef.current();

    socketService.on("message:new", handleMessageNew);
    socketService.onPresenceUpdate(handlePresence);
    socketService.onFriendAccepted(handleRefresh);
    socketService.on("CONVERSATION_CREATE", handleConvCreate);
    socketService.on("PROFILE_UPDATE", handleProfile);
    socketService.on("socket:reconnected", handleRefresh);
    return () => {
      socketService.off("message:new", handleMessageNew);
      socketService.off("PRESENCE_UPDATE", handlePresence);
      socketService.off("FRIEND_ACCEPT", handleRefresh);
      socketService.off("CONVERSATION_CREATE", handleConvCreate);
      socketService.off("PROFILE_UPDATE", handleProfile);
      socketService.off("socket:reconnected", handleRefresh);
    };
  }, []);

  const unreadOf = (c: CachedConversation) => {
    const u = (notif as { unread?: Map<string, number> }).unread ?? new Map();
    return u.get(`dm:${c.recipientId}`) ?? u.get(c.recipientId) ?? u.get(c.id) ?? 0;
  };

  const list = conversations.filter((c) => c.recipientName.toLowerCase().includes(query.toLowerCase()));
  const dmSelectedKeys =
    selectedChannel && (selectedChannel.startsWith("dm:") || selectedChannel.startsWith("group:"))
      ? new Set<string>([selectedChannel])
      : new Set<string>();

  return (
    <Surface variant="default" className="flex h-full w-full flex-col ">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between p-4 border-b border-sep">
        <span className="text-sm font-semibold text-foreground">Messages directs</span>
        <button
          onClick={() => onSelectChannel("friends")}
          className="flex size-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground active:scale-90"
          aria-label="Amis"
        >
          <Users className="size-4" />
        </button>
      </div>

      {/* Friends shortcut */}
      <div className="px-2 pt-2">
        <button
          onClick={() => onSelectChannel("friends")}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors ${
            selectedChannel === "friends" ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2/60 hover:text-foreground"
          }`}
        >
          <Users className="size-4" /> Amis
        </button>
      </div>

      {/* Search */}
      <div className="px-2 pt-2 pb-1">
        <SearchField aria-label="Rechercher une conversation" value={query} onChange={setQuery}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Trouver une conversation…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <p className="mb-1 mt-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted/50">
          Messages directs
        </p>
        <ListBox
          aria-label="Conversations directes"
          selectionMode="single"
          selectedKeys={dmSelectedKeys}
          onAction={(key) => onSelectChannel(String(key))}
          className="border-0 bg-transparent p-0"
        >
          {list.map((c) => {
            const key = c.type === "group" ? `group:${c.id}` : `dm:${c.recipientId}`;
            const unread = unreadOf(c);
            const avatar = c.recipientAvatar ? resolveMediaUrl(c.recipientAvatar) : undefined;
            return (
              <ListBox.Item key={key} id={key} textValue={c.recipientName}>
                <div className="relative shrink-0">
                  <AvatarFallback
                    avatarUrl={c.recipientAvatar}
                    name={c.recipientName}
                    seed={c.recipientId ?? c.id}
                    size="sm"
                    className="size-8"
                  />
                  {c.type === "dm" && (
                    <PresenceDot status={toDot(presence.get(c.recipientId))} size="sm" className="absolute -bottom-0.5 -right-0.5" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className={`truncate text-sm ${unread ? "font-medium text-foreground" : ""}`}>{c.recipientName}</span>
                  {c.lastMessage && <span className="truncate text-[11px] text-muted/60">{c.lastMessage}</span>}
                </div>
                {unread > 0 && (
                  <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-fg">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </ListBox.Item>
            );
          })}
        </ListBox>
        {list.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
            <UserPlus className="size-6 text-muted/50" />
            <p className="text-xs text-muted">Aucune conversation. Ajoute un ami pour démarrer.</p>
          </div>
        )}
      </div>
    </Surface>
  );
}

interface Channel { id: string; name: string; type: string; position?: number }

const VOICE_TYPES = new Set(["voice", "stage"]);
/* Icône + couleur par type de canal (15 types, comme l'original). */
const CHANNEL_META: Record<string, { icon: ComponentType<{ className?: string }>; cls: string }> = {
  text:         { icon: Hash, cls: "text-muted" },
  announcement: { icon: Megaphone, cls: "text-amber-400" },
  voice:        { icon: Volume2, cls: "text-online" },
  stage:        { icon: Radio, cls: "text-purple-400" },
  forum:        { icon: MessagesSquare, cls: "text-blue-400" },
  gallery:      { icon: ImageIcon, cls: "text-pink-400" },
  poll:         { icon: BarChart3, cls: "text-orange-400" },
  suggestion:   { icon: Lightbulb, cls: "text-emerald-400" },
  doc:          { icon: FileText, cls: "text-sky-400" },
  counting:     { icon: Hash, cls: "text-rose-400" },
  vent:         { icon: Flame, cls: "text-red-400" },
  thread:       { icon: MessageCircle, cls: "text-violet-400" },
  media:        { icon: Film, cls: "text-cyan-400" },
  minigame:     { icon: Gamepad2, cls: "text-indigo-400" },
  trivia:       { icon: HelpCircle, cls: "text-yellow-400" },
};
const channelMeta = (type: string) => CHANNEL_META[type] ?? CHANNEL_META.text;
function workspaceTone(name: string): string {
  const palette = ["#5865F2", "#2ECC71", "#FAA819", "#ED4245", "#EB459E", "#9C84EF", "#1ABC9C", "#3498DB"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function ServerSidebar({ serverId, selectedChannel, onSelectChannel, onOpenSettings }: Props & { serverId: string }) {
  const notif = useNotificationStore();
  const voice = useVoice();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [serverName, setServerName] = useState("Serveur");
  const [serverIcon, setServerIcon] = useState<string | null>(null);
  const [serverBanner, setServerBanner] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [textOpen, setTextOpen] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(true);

  // Chargement canaux + infos serveur
  useEffect(() => {
    if (!serverId) return;
    // Icône depuis le cache du rail (déjà chargé) en attendant requestServerInfo
    setServerIcon(serverListStore.get().find((s) => s.id === serverId)?.iconUrl ?? null);
    socketService.requestServerChannels(serverId, (data: any) => {
      const raw = Array.isArray(data) ? data : data?.channels || [];
      setChannels(raw.map((ch: any) => ({ id: ch.id, name: ch.name, type: ch.type, position: ch.position ?? 0 })));
    });
    socketService.requestServerInfo(serverId, (data: any) => {
      if (data?.error) return;
      setServerName(data.name || "Serveur");
      if (data.iconUrl ?? data.icon_url) setServerIcon((data.iconUrl ?? data.icon_url) || null);
      setServerBanner((data.bannerUrl ?? data.banner_url) || null);
    });
  }, [serverId]);

  // Events temps réel : CRUD canaux + maj serveur
  useEffect(() => {
    if (!serverId) return;
    const onCreate = (data: any) => {
      const ch = data?.payload || data;
      if (ch?.serverId === serverId || ch?.server_id === serverId) {
        setChannels((prev) => prev.some((c) => c.id === ch.id) ? prev : [...prev, { id: ch.id, name: ch.name, type: ch.type, position: ch.position }]);
      }
    };
    const onUpdate = (data: any) => {
      const ch = data?.payload || data;
      setChannels((prev) => prev.map((c) => (c.id === ch.id ? { ...c, ...ch } : c)));
    };
    const onDelete = (data: any) => {
      const id = (data?.payload || data)?.channelId || (data?.payload || data)?.id;
      if (id) setChannels((prev) => prev.filter((c) => c.id !== id));
    };
    const onServerUpdate = (data: any) => {
      const s = data?.payload || data?.updates || data;
      if (s?.id === serverId || s?.serverId === serverId) {
        if (s?.name != null) setServerName(s.name);
        if (s?.iconUrl !== undefined || s?.icon_url !== undefined) setServerIcon((s.iconUrl ?? s.icon_url) || null);
        if (s?.bannerUrl !== undefined || s?.banner_url !== undefined) setServerBanner((s.bannerUrl ?? s.banner_url) || null);
      }
    };
    socketService.onChannelCreate(onCreate);
    socketService.onChannelUpdate(onUpdate);
    socketService.onChannelDelete(onDelete);
    socketService.on("SERVER_UPDATE", onServerUpdate);
    return () => {
      socketService.off("CHANNEL_CREATE", onCreate);
      socketService.off("CHANNEL_UPDATE", onUpdate);
      socketService.off("CHANNEL_DELETE", onDelete);
      socketService.off("SERVER_UPDATE", onServerUpdate);
    };
  }, [serverId]);

  const unread = (notif as { unread?: Map<string, number> }).unread ?? new Map<string, number>();
  const mentions = (notif as { mentions?: Map<string, number> }).mentions ?? new Map<string, number>();
  const channelSelectedKeys = new Set<string>(selectedChannel ? [selectedChannel] : []);

  const sorted = [...channels].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const match = (c: Channel) => c.name.toLowerCase().includes(query.toLowerCase());
  const textChannels = sorted.filter((c) => !VOICE_TYPES.has(c.type) && c.type !== "category" && match(c));
  const voiceChannels = sorted.filter((c) => VOICE_TYPES.has(c.type) && match(c));

  return (
    <Surface variant="default" className="flex h-full w-full rounded-none flex-col">
      {/* Bannière serveur */}
      {serverBanner && (
        <div className="relative h-24 w-full shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolveMediaUrl(serverBanner) ?? serverBanner} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-surface via-surface/40 to-transparent" />
        </div>
      )}

      {/* Header serveur */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sep px-3">
        <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg text-white" style={serverIcon ? undefined : { background: workspaceTone(serverName) }}>
          {serverIcon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveMediaUrl(serverIcon) ?? serverIcon} alt={serverName} className="size-full object-cover" />
          ) : (
            <span className="text-sm font-bold">{serverName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{serverName}</span>
        <button
          onClick={() => onOpenSettings()}
          className="flex size-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground active:scale-90"
          aria-label="Paramètres du serveur"
        >
          <Settings className="size-4" />
        </button>
      </div>

      {/* Recherche */}
      <div className="px-2 pt-2.5 pb-1">
        <SearchField aria-label="Rechercher un canal" value={query} onChange={setQuery}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Chercher un canal…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {/* Canaux */}
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {/* Texte */}
        <Disclosure isExpanded={textOpen} onExpandedChange={setTextOpen}>
          <Disclosure.Heading>
            <Button slot="trigger" variant="ghost" size="sm" className="h-auto w-full justify-start gap-1 px-1 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted/50 hover:text-muted">
              <Disclosure.Indicator />
              Canaux texte
            </Button>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body className="mt-0.5">
              <ListBox
                aria-label="Canaux texte"
                selectionMode="single"
                selectedKeys={channelSelectedKeys}
                onAction={(key) => onSelectChannel(String(key))}
                className="border-0 bg-transparent p-0"
              >
                {textChannels.map((ch) => {
                  const meta = channelMeta(ch.type);
                  const Icon = meta.icon;
                  const u = unread.get(`channel:${ch.id}`) ?? 0;
                  const m = mentions.get(`channel:${ch.id}`) ?? 0;
                  const isActive = selectedChannel === ch.id;
                  return (
                    <ListBox.Item key={ch.id} id={ch.id} textValue={ch.name}>
                      <Icon className={`size-4 shrink-0 ${isActive ? "text-accent" : meta.cls}`} />
                      <span className="flex-1 truncate text-sm">{ch.name}</span>
                      {m > 0 && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-fg">{m > 99 ? "99+" : m}</span>
                      )}
                      {!m && u > 0 && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">{u > 99 ? "99+" : u}</span>
                      )}
                    </ListBox.Item>
                  );
                })}
              </ListBox>
            </Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>

        {/* Vocal */}
        {voiceChannels.length > 0 && (
          <Disclosure isExpanded={voiceOpen} onExpandedChange={setVoiceOpen}>
            <Disclosure.Heading>
              <Button slot="trigger" variant="ghost" size="sm" className="h-auto w-full justify-start gap-1 px-1 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted/50 hover:text-muted">
                <Disclosure.Indicator />
                Canaux vocal
              </Button>
            </Disclosure.Heading>
            <Disclosure.Content>
              <Disclosure.Body className="mt-0.5 flex flex-col gap-px">
                {voiceChannels.map((ch) => {
                  const participants: VoiceParticipant[] = voice?.getChannelParticipants(ch.id) || [];
                  const connected = voice?.currentChannelId === ch.id;
                  const vmeta = channelMeta(ch.type);
                  const VIcon = vmeta.icon;
                  return (
                    <div key={ch.id}>
                      <button
                        onClick={() => (connected ? voice?.leaveChannel() : voice?.joinChannel(serverId, ch.id))}
                        className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left outline-none transition-colors ${
                          connected ? "bg-online/10 text-online" : "text-muted hover:bg-surface-2/60 hover:text-foreground/80"
                        }`}>
                        <VIcon className={`size-4 shrink-0 ${connected ? "text-online" : vmeta.cls}`} />
                        <span className="flex-1 truncate text-sm">{ch.name}</span>
                        {participants.length > 0 && <span className="text-[10px] font-semibold tabular-nums text-muted">{participants.length}</span>}
                      </button>
                      {participants.length > 0 && (
                        <div className="ml-7 mt-0.5 flex flex-col gap-0.5 pb-1">
                          {participants.map((p) => (
                            <div key={p.userId} className="flex items-center gap-1.5 px-1 py-0.5">
                              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-online/15 text-[8px] font-bold text-online">
                                {p.username?.charAt(0)?.toUpperCase() || "?"}
                              </span>
                              <span className="flex-1 truncate text-[11px] text-muted">{p.username}</span>
                              {p.muted && <MicOff className="size-2.5 shrink-0 text-danger" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </Disclosure.Body>
            </Disclosure.Content>
          </Disclosure>
        )}
      </div>

      <CallBar />
    </Surface>
  );
}

export function RedesignChannelList({ serverId, selectedChannel, onSelectChannel, onOpenSettings }: Props) {
  if (serverId) {
    return (
      <ServerSidebar
        serverId={serverId}
        selectedChannel={selectedChannel}
        onSelectChannel={onSelectChannel}
        onOpenSettings={onOpenSettings}
      />
    );
  }
  return <DmSidebar selectedChannel={selectedChannel} onSelectChannel={onSelectChannel} />;
}
