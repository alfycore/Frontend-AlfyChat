"use client";

import { useEffect, useState } from "react";
import { Button, Spinner, SearchField, Input, Tabs } from "@heroui/react";
import { UserPlus, Check, X, MessageSquare, Users } from "lucide-react";
import { api } from "@/lib/api";
import { AvatarFallback } from "@/components/redesign/ui/AvatarFallback";
import { friendsStore, type CachedFriend, type CachedFriendRequest } from "@/lib/friends-store";
import { PresenceDot } from "@/components/redesign/ui/PresenceDot";

type Tab = "online" | "all" | "pending" | "add";

function initialsOf(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}
function toDot(status: CachedFriend["status"]): "online" | "away" | "dnd" | "offline" {
  if (status === "online") return "online";
  if (status === "idle") return "away";
  if (status === "dnd") return "dnd";
  return "offline";
}
const STATUS_TEXT: Record<CachedFriend["status"], string> = {
  online: "En ligne", idle: "Absent", dnd: "Ne pas déranger", invisible: "Hors ligne", offline: "Hors ligne",
};

interface Props {
  onOpenDM?: (recipientId: string, recipientName: string) => void;
}

export function RedesignFriendsPanel({ onOpenDM }: Props) {
  const [friends, setFriends] = useState<CachedFriend[]>(() => friendsStore.getFriends());
  const [requests, setRequests] = useState(() => friendsStore.getRequests());
  const [loading, setLoading] = useState(!friendsStore.isLoaded());
  const [tab, setTab] = useState<Tab>("online");
  const [query, setQuery] = useState("");
  const [addInput, setAddInput] = useState("");
  const [add, setAdd] = useState<{ loading: boolean; ok?: boolean; msg?: string }>({ loading: false });

  useEffect(() => {
    const unsub = friendsStore.subscribe(() => {
      setFriends([...friendsStore.getFriends()]);
      setRequests({ ...friendsStore.getRequests() });
    });
    (async () => {
      try {
        const [fr, rq] = await Promise.all([api.getFriends(), api.getFriendRequests()]);
        if (fr.success && fr.data) friendsStore.setFriends(fr.data as CachedFriend[]);
        if (rq.success && rq.data) friendsStore.setRequests(rq.data as { received: CachedFriendRequest[]; sent: CachedFriendRequest[] });
      } finally {
        setLoading(false);
      }
    })();
    return unsub;
  }, []);

  const refreshRequests = async () => {
    const rq = await api.getFriendRequests();
    if (rq.success && rq.data) friendsStore.setRequests(rq.data as { received: CachedFriendRequest[]; sent: CachedFriendRequest[] });
  };
  const refreshFriends = async () => {
    const fr = await api.getFriends();
    if (fr.success && fr.data) friendsStore.setFriends(fr.data as CachedFriend[]);
  };

  const accept = async (id: string) => { await api.acceptFriendRequest(id); await Promise.all([refreshRequests(), refreshFriends()]); };
  const decline = async (id: string) => { await api.declineFriendRequest(id); await refreshRequests(); };

  const submitAdd = async () => {
    const username = addInput.trim();
    if (!username || add.loading) return;
    setAdd({ loading: true });
    try {
      const sr = await api.searchUsers(username);
      const data = sr.data as { users?: { id: string; username: string }[] } | { id: string; username: string }[] | undefined;
      const arr = Array.isArray((data as { users?: unknown })?.users)
        ? (data as { users: { id: string; username: string }[] }).users
        : Array.isArray(data) ? (data as { id: string; username: string }[]) : [];
      const found = arr.find((u) => u.username?.toLowerCase() === username.toLowerCase());
      if (!found) { setAdd({ loading: false, ok: false, msg: "Utilisateur introuvable." }); return; }
      const res = await api.sendFriendRequest(found.id);
      if (res.success) { setAddInput(""); setAdd({ loading: false, ok: true, msg: "Demande d'ami envoyée !" }); refreshRequests(); }
      else setAdd({ loading: false, ok: false, msg: res.error || "Échec de l'envoi." });
    } catch {
      setAdd({ loading: false, ok: false, msg: "Erreur réseau." });
    }
  };

  const filtered = friends.filter(
    (f) => f.displayName.toLowerCase().includes(query.toLowerCase()) || f.username.toLowerCase().includes(query.toLowerCase()),
  );
  const online = filtered.filter((f) => f.isOnline);
  const list = tab === "online" ? online : filtered;
  const received = requests.received ?? [];

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: "online", label: "En ligne" },
    { id: "all", label: "Tous" },
    { id: "pending", label: "En attente", badge: received.length },
    { id: "add", label: "Ajouter" },
  ];

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-sep bg-surface/80 px-4 backdrop-blur-md">
        <Users className="size-4 text-muted" />
        <span className="text-sm font-semibold text-foreground">Amis</span>
        <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as Tab)} className="ml-2">
          <Tabs.ListContainer>
            <Tabs.List aria-label="Filtres amis">
              {TABS.map((tb) => (
                <Tabs.Tab key={tb.id} id={tb.id}>
                  {tb.id === "add" && <UserPlus className="size-3.5" />}
                  <span className="whitespace-nowrap">{tb.label}</span>
                  {!!tb.badge && tb.badge > 0 && (
                    <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-fg">
                      {tb.badge}
                    </span>
                  )}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </header>

      {/* Search (not on add tab) */}
      {tab !== "add" && (
        <div className="px-4 pt-3">
          <SearchField aria-label="Rechercher un ami" value={query} onChange={setQuery}>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Rechercher un ami…" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading && friends.length === 0 ? (
          <div className="flex h-full items-center justify-center"><Spinner size="sm" /></div>
        ) : tab === "add" ? (
          <div className="mx-auto max-w-md px-2 py-4">
            <h3 className="text-base font-semibold text-foreground">Ajouter un ami</h3>
            <p className="mt-1 text-sm text-muted">Entre le nom d'utilisateur exact de la personne.</p>
            <div className="mt-4 flex items-center gap-2">
              <Input
                aria-label="Nom d'utilisateur"
                fullWidth
                value={addInput}
                onChange={(e) => { setAddInput(e.target.value); setAdd({ loading: false }); }}
                onKeyDown={(e) => { if (e.key === "Enter") submitAdd(); }}
                placeholder="nom_utilisateur"
              />
              <Button
                size="sm"
                className="shrink-0 bg-accent text-accent-fg text-xs font-medium hover:opacity-90"
                onPress={submitAdd}
                isDisabled={add.loading || !addInput.trim()}
              >
                {add.loading ? <Spinner size="sm" /> : "Envoyer"}
              </Button>
            </div>
            {add.msg && (
              <p className={`mt-2 text-xs ${add.ok ? "text-success" : "text-danger"}`}>{add.msg}</p>
            )}
          </div>
        ) : tab === "pending" ? (
          received.length === 0 ? (
            <Empty label="Aucune demande en attente." />
          ) : (
            <>
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted/50">
                Demandes reçues — {received.length}
              </p>
              {received.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-surface-2">
                  <AvatarFallback
                avatarUrl={r.avatarUrl}
                name={r.displayName || r.username}
                seed={r.displayName || r.username || r.id}
                size="sm"
                className="size-9"
              />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{r.displayName || r.username}</p>
                    <p className="truncate text-xs text-muted">Demande d'ami reçue</p>
                  </div>
                  <Button isIconOnly size="sm" className="size-8 bg-success/15 text-success hover:bg-success/25" onPress={() => accept(r.id)} aria-label="Accepter">
                    <Check className="size-4" />
                  </Button>
                  <Button isIconOnly size="sm" variant="ghost" className="size-8 text-muted hover:bg-danger/15 hover:text-danger" onPress={() => decline(r.id)} aria-label="Refuser">
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </>
          )
        ) : list.length === 0 ? (
          <Empty label={tab === "online" ? "Aucun ami en ligne." : "Aucun ami pour l'instant."} />
        ) : (
          <>
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted/50">
              {tab === "online" ? `En ligne — ${list.length}` : `Tous les amis — ${list.length}`}
            </p>
            {list.map((f) => (
              <button
                key={f.id}
                onClick={() => onOpenDM?.(f.id, f.displayName)}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface-2"
              >
                <div className="relative shrink-0">
                  <AvatarFallback
                    avatarUrl={f.avatarUrl}
                    name={f.displayName || f.username}
                    seed={f.displayName || f.username || f.id}
                    size="sm"
                    className="size-9"
                  />
                  <PresenceDot status={toDot(f.status)} size="sm" className="absolute -bottom-0.5 -right-0.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{f.displayName || f.username}</p>
                  <p className="truncate text-xs text-muted">{f.customStatus || STATUS_TEXT[f.status]}</p>
                </div>
                <span className="flex size-8 items-center justify-center rounded-lg text-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-surface-3 hover:text-foreground">
                  <MessageSquare className="size-4" />
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-2">
        <Users className="size-6 text-muted" />
      </div>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
