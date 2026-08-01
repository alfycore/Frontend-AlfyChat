"use client";

import { Avatar } from "@heroui/react";
import { PresenceDot } from "@/components/redesign/ui/PresenceDot";
import { Popover } from "@/components/redesign/ui/Popover";
import { UserCard } from "@/components/redesign/user/UserCard";
import type { MockUser } from "@/lib/mock-data";

function MemberRow({ user }: { user: MockUser }) {
  return (
    <Popover
      placement="left"
      align="start"
      triggerClassName="block w-full"
      trigger={
        <div className={`group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-2 transition-colors duration-150 ${
          user.status === "offline" ? "opacity-60" : ""
        }`}>
          <div className="relative shrink-0">
            <Avatar size="sm" className="size-8">
              <Avatar.Fallback className="text-xs font-semibold bg-surface-3 text-foreground/70 border-none">
                {user.initials}
              </Avatar.Fallback>
            </Avatar>
            <PresenceDot status={user.status} size="sm" className="absolute -bottom-0.5 -right-0.5" />
          </div>
          <div className="flex min-w-0 flex-col text-left">
            <span className={`truncate text-sm font-medium ${
              user.status === "offline" ? "text-muted/50" : "text-foreground/80"
            }`}>
              {user.name}
            </span>
            {user.customStatus && (
              <span className="truncate text-[10px] text-muted/60">{user.customStatus}</span>
            )}
          </div>
        </div>
      }
    >
      {(close) => <UserCard user={user} onClose={close} />}
    </Popover>
  );
}

interface MemberListProps {
  online: MockUser[];
  offline: MockUser[];
}

export function MemberList({ online, offline }: MemberListProps) {
  return (
    <div className="flex h-full w-60 shrink-0 flex-col overflow-y-auto bg-surface px-2 py-3">
      {online.length > 0 && (
        <>
          <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted/60">
            En ligne — {online.length}
          </p>
          <div className="flex flex-col gap-0.5 mb-4">
            {online.map((u) => <MemberRow key={u.id} user={u} />)}
          </div>
        </>
      )}
      {offline.length > 0 && (
        <>
          <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted/60">
            Hors ligne — {offline.length}
          </p>
          <div className="flex flex-col gap-0.5">
            {offline.map((u) => <MemberRow key={u.id} user={u} />)}
          </div>
        </>
      )}
    </div>
  );
}
