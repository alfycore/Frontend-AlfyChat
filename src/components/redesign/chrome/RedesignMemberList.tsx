"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, Spinner, Surface } from "@heroui/react";
import { socketService } from "@/lib/socket";
import { resolveMediaUrl } from "@/lib/api";
import { isVisibleOnline, type UserStatus } from "@/lib/status";
import { Popover } from "@/components/redesign/ui/Popover";
import { UserCard } from "@/components/redesign/user/UserCard";
import { PresenceDot } from "@/components/redesign/ui/PresenceDot";
import type { MockUser } from "@/lib/mock-data";

interface Role { id: string; name: string; color: string; position: number }
interface Member { id: string; username: string; displayName?: string | null; avatarUrl?: string; status: UserStatus; roles: string[] }

interface Props { serverId: string }

function parseMember(m: any): Member {
  return {
    id: m.userId || m.user_id || m.id,
    username: m.username,
    displayName: m.displayName || m.display_name || null,
    avatarUrl: m.avatarUrl || m.avatar_url,
    status: m.status || (m.is_online ? "online" : "offline"),
    roles: m.roleIds || m.role_ids
      ? typeof (m.roleIds || m.role_ids) === "string"
        ? (() => { try { return JSON.parse(m.roleIds || m.role_ids); } catch { return []; } })()
        : (m.roleIds || m.role_ids)
      : [],
  };
}
function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}
function toDot(s: UserStatus): "online" | "away" | "dnd" | "offline" {
  if (s === "online") return "online";
  if (s === "idle") return "away";
  if (s === "dnd") return "dnd";
  return "offline";
}

export function RedesignMemberList({ serverId }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    socketService.requestMembers(serverId, (memberData: any) => {
      setMembers((memberData?.members || []).map(parseMember));
      socketService.requestRoles(serverId, (roleData: any) => {
        const rr: Role[] = (roleData?.roles || []).map((r: any) => ({
          id: r.id, name: r.name, color: r.color || "#99AAB5", position: r.position || 0,
        }));
        rr.sort((a, b) => b.position - a.position);
        setRoles(rr);
        setLoading(false);
      });
    });
  }, [serverId]);

  useEffect(() => {
    const handlePresence = (data: any) => {
      const p = (data?.payload || data) as { userId?: string; status?: string };
      if (!p?.userId || !p?.status) return;
      setMembers((prev) => prev.map((m) => (m.id === p.userId ? { ...m, status: p.status as UserStatus } : m)));
    };
    const handleJoin = (data: any) => {
      const m = parseMember(data?.payload || data);
      if (!m.id) return;
      setMembers((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    };
    const handleLeave = (data: any) => {
      const id = (data?.payload || data)?.userId || (data?.payload || data)?.id;
      if (id) setMembers((prev) => prev.filter((m) => m.id !== id));
    };
    const handleUpdate = (data: any) => {
      const p = (data?.payload || data) as { userId?: string; displayName?: string; avatarUrl?: string };
      if (!p?.userId) return;
      setMembers((prev) => prev.map((m) => m.id === p.userId
        ? { ...m, displayName: p.displayName !== undefined ? p.displayName : m.displayName, avatarUrl: p.avatarUrl !== undefined ? p.avatarUrl : m.avatarUrl }
        : m));
    };
    socketService.onPresenceUpdate(handlePresence);
    socketService.onMemberJoin(handleJoin);
    socketService.onMemberLeave(handleLeave);
    socketService.onMemberUpdate(handleUpdate);
    return () => {
      socketService.off("PRESENCE_UPDATE", handlePresence);
      socketService.off("MEMBER_JOIN", handleJoin);
      socketService.off("MEMBER_LEAVE", handleLeave);
      socketService.off("MEMBER_UPDATE", handleUpdate);
    };
  }, [serverId]);

  const roleColor = useMemo(() => {
    const byId = new Map(roles.map((r) => [r.id, r]));
    return (m: Member): string | undefined => {
      let top: Role | undefined;
      for (const id of m.roles) {
        const r = byId.get(id);
        if (r && r.color && r.color !== "#99AAB5" && (!top || r.position > top.position)) top = r;
      }
      return top?.color;
    };
  }, [roles]);

  const { online, offline } = useMemo(() => {
    const on: Member[] = [], off: Member[] = [];
    for (const m of members) (isVisibleOnline(m.status) ? on : off).push(m);
    const byName = (a: Member, b: Member) => (a.displayName || a.username).localeCompare(b.displayName || b.username);
    on.sort(byName); off.sort(byName);
    return { online: on, offline: off };
  }, [members]);

  const Row = (m: Member) => {
    const name = m.displayName || m.username;
    const color = roleColor(m);
    const avatar = m.avatarUrl ? resolveMediaUrl(m.avatarUrl) : undefined;
    const offlineStyle = !isVisibleOnline(m.status);
    const card: MockUser = {
      id: m.id, name, initials: initials(name), status: toDot(m.status), avatar,
    };
    return (
      <Popover
        key={m.id}
        placement="left"
        align="start"
        triggerClassName="block w-full"
        trigger={
          <div className={`group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2 ${offlineStyle ? "opacity-50" : ""}`}>
            <div className="relative shrink-0">
              <Avatar size="sm" className="size-8">
                {avatar && <Avatar.Image src={avatar} alt={name} />}
                <Avatar.Fallback className="border-none bg-surface-3 text-xs font-semibold text-foreground/70">{initials(name)}</Avatar.Fallback>
              </Avatar>
              <PresenceDot status={toDot(m.status)} size="sm" className="absolute -bottom-0.5 -right-0.5" />
            </div>
            <span className="truncate text-sm font-medium" style={color ? { color } : undefined}>
              <span className={color ? "" : "text-foreground/80"}>{name}</span>
            </span>
          </div>
        }
      >
        {(close) => <UserCard user={card} onClose={close} />}
      </Popover>
    );
  };

  return (
    <Surface variant="default" className="flex h-full w-60 shrink-0 flex-col overflow-y-auto px-2 py-3">
      {loading ? (
        <div className="flex h-full items-center justify-center"><Spinner size="sm" /></div>
      ) : (
        <>
          {online.length > 0 && (
            <>
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted/60">En ligne — {online.length}</p>
              <div className="mb-4 flex flex-col gap-0.5">{online.map(Row)}</div>
            </>
          )}
          {offline.length > 0 && (
            <>
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted/60">Hors ligne — {offline.length}</p>
              <div className="flex flex-col gap-0.5">{offline.map(Row)}</div>
            </>
          )}
          {members.length === 0 && <p className="px-2 text-xs text-muted">Aucun membre.</p>}
        </>
      )}
    </Surface>
  );
}
