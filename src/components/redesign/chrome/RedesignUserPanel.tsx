"use client";

import { Avatar, Button } from "@heroui/react";
import { Mic, MicOff, Headphones, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMobileNav } from "@/hooks/use-mobile-nav";
import { useVoice } from "@/hooks/use-voice";
import { resolveMediaUrl } from "@/lib/api";
import { statusLabel, SELECTABLE_STATUSES, type UserStatus } from "@/lib/status";
import { Popover } from "@/components/redesign/ui/Popover";
import { PresenceDot } from "@/components/redesign/ui/PresenceDot";

function toDot(s?: UserStatus): "online" | "away" | "dnd" | "offline" {
  if (s === "online") return "online";
  if (s === "idle") return "away";
  if (s === "dnd") return "dnd";
  return "offline";
}
function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

export function RedesignUserPanel() {
  const { user, updateUser } = useAuth();
  const { openSettings } = useMobileNav();
  const voice = useVoice();

  if (!user) return null;
  const name = user.displayName || user.username;
  const avatar = user.avatarUrl ? resolveMediaUrl(user.avatarUrl) : undefined;

  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-sep bg-surface-2 px-2 py-2">
      {/* Avatar + status menu */}
      <Popover
        placement="top"
        align="start"
        trigger={
          <button className="relative shrink-0 outline-none transition-transform active:scale-95" aria-label="Changer le statut">
            <Avatar size="sm" className="size-8">
              {avatar && <Avatar.Image src={avatar} alt={name} />}
              <Avatar.Fallback className="border-none bg-accent text-xs font-bold text-accent-fg">{initials(name)}</Avatar.Fallback>
            </Avatar>
            <PresenceDot status={toDot(user.status as UserStatus)} size="sm" className="absolute -bottom-0.5 -right-0.5" />
          </button>
        }
      >
        {(close) => (
          <div className="w-48 rounded-2xl bg-overlay p-1.5 shadow-xl shadow-black/30 ring-1 ring-sep">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted/50">Statut</p>
            {SELECTABLE_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { updateUser({ status: s }); close(); }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-2 ${
                  user.status === s ? "text-foreground" : "text-muted"
                }`}
              >
                <PresenceDot status={toDot(s)} size="sm" />
                {statusLabel(s)}
              </button>
            ))}
          </div>
        )}
      </Popover>

      {/* Name + status */}
      <button onClick={openSettings} className="flex min-w-0 flex-1 flex-col text-left leading-tight outline-none">
        <span className="truncate text-xs font-semibold text-foreground hover:underline">{name}</span>
        <span className="truncate text-[10px] text-muted">{user.customStatus || statusLabel(user.status as UserStatus)}</span>
      </button>

      {/* Controls */}
      <div className="flex items-center gap-0.5">
        <Button
          isIconOnly variant="ghost" size="sm"
          className={`size-7 transition-transform active:scale-90 ${voice?.isMuted ? "text-danger" : "text-muted hover:text-foreground"}`}
          onPress={() => voice?.toggleMute()}
          aria-label={voice?.isMuted ? "Réactiver le micro" : "Couper le micro"}
        >
          {voice?.isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </Button>
        <Button
          isIconOnly variant="ghost" size="sm"
          className={`size-7 transition-transform active:scale-90 ${voice?.isDeafened ? "text-danger" : "text-muted hover:text-foreground"}`}
          onPress={() => voice?.toggleDeafen()}
          aria-label={voice?.isDeafened ? "Réactiver le son" : "Mettre en sourdine"}
        >
          <Headphones className="size-4" />
        </Button>
        <Button
          isIconOnly variant="ghost" size="sm"
          className="size-7 text-muted transition-transform hover:text-foreground active:scale-90"
          onPress={openSettings}
          aria-label="Paramètres"
        >
          <Settings className="size-4" />
        </Button>
      </div>
    </div>
  );
}
