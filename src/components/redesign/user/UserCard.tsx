"use client";

import { Button, Chip } from "@heroui/react";
import { AvatarFallback } from "@/components/redesign/ui/AvatarFallback";
import { MessageSquare } from "lucide-react";
import { PresenceDot } from "@/components/redesign/ui/PresenceDot";
import { CURRENT_USER } from "@/lib/mock-data";
import type { MockUser } from "@/lib/mock-data";

const STATUS_LABEL: Record<MockUser["status"], string> = {
  online: "En ligne",
  away: "Absent",
  dnd: "Ne pas déranger",
  offline: "Hors ligne",
};

interface UserCardProps {
  user: MockUser;
  onClose?: () => void;
}

export function UserCard({ user, onClose }: UserCardProps) {
  const isSelf = user.id === CURRENT_USER.id;
  const handle = user.name.toLowerCase().replace(/\s+/g, "_");

  return (
    <div className="w-72 rounded-2xl bg-overlay p-4 shadow-xl shadow-black/30 ring-1 ring-sep">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <AvatarFallback
            avatarUrl={user.avatar}
            name={user.name}
            seed={user.name}
            size="lg"
            className="size-14"
          />
          <PresenceDot status={user.status} className="absolute -bottom-0.5 -right-0.5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted">
            @{handle}{user.pronouns ? ` · ${user.pronouns}` : ""}
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="mt-3 flex items-center gap-2 text-xs text-foreground/70">
        <PresenceDot status={user.status} size="sm" />
        {user.customStatus ?? STATUS_LABEL[user.status]}
      </div>

      {/* About */}
      {user.bio && <p className="mt-3 text-xs leading-relaxed text-muted">{user.bio}</p>}

      {/* Roles */}
      {user.roles && user.roles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {user.roles.map((r) => (
            <Chip key={r.label} size="sm" variant="secondary">
              <span className="size-1.5 shrink-0 rounded-full" style={{ background: r.color }} />
              {r.label}
            </Chip>
          ))}
        </div>
      )}

      {/* Member since */}
      {user.memberSince && (
        <p className="mt-3 text-[11px] text-muted/60">Membre depuis {user.memberSince}</p>
      )}

      {/* Action */}
      <div className="mt-4">
        {isSelf ? (
          <Button fullWidth size="sm" variant="secondary" className="text-xs" onPress={onClose}>
            Modifier le profil
          </Button>
        ) : (
          <Button fullWidth size="sm" className="bg-accent text-xs font-semibold text-accent-fg hover:opacity-90" onPress={onClose}>
            <MessageSquare className="size-3.5" />
            Envoyer un message
          </Button>
        )}
      </div>
    </div>
  );
}
