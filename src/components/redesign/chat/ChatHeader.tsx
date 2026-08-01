"use client";

import { Button } from "@heroui/react";
import { Hash, Phone, Video, Search, Users, Settings2, PanelLeft, PanelTop } from "lucide-react";
import type { NavOrientation } from "@/components/redesign/nav/NavRail";

interface ChatHeaderProps {
  channelName: string;
  channelType?: "text" | "voice" | "dm";
  description?: string;
  onToggleMembers?: () => void;
  membersVisible?: boolean;
  orientation?: NavOrientation;
  onToggleOrientation?: () => void;
}

export function ChatHeader({
  channelName, channelType = "text", description,
  onToggleMembers, membersVisible,
  orientation, onToggleOrientation,
}: ChatHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-sep bg-surface/80 backdrop-blur-md px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {channelType === "dm" ? (
          <div className="size-5 shrink-0 rounded-full bg-accent" />
        ) : (
          <Hash className="size-4 shrink-0 text-muted" />
        )}
        <span className="truncate text-sm font-semibold text-foreground">{channelName}</span>
        {description && (
          <>
            <div className="h-4 w-px shrink-0 bg-sep" />
            <span className="truncate text-xs text-muted">{description}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        {channelType === "dm" && (
          <>
            <Button isIconOnly variant="ghost" size="sm"
              className="size-8 text-muted hover:text-foreground" aria-label="Appel vocal">
              <Phone className="size-4" />
            </Button>
            <Button isIconOnly variant="ghost" size="sm"
              className="size-8 text-muted hover:text-foreground" aria-label="Appel vidéo">
              <Video className="size-4" />
            </Button>
          </>
        )}
        <Button isIconOnly variant="ghost" size="sm"
          className="size-8 text-muted hover:text-foreground" aria-label="Rechercher">
          <Search className="size-4" />
        </Button>
        {onToggleMembers && (
          <Button isIconOnly variant="ghost" size="sm"
            className={`size-8 transition-colors ${membersVisible ? "text-accent bg-accent/12" : "text-muted hover:text-foreground"}`}
            onPress={onToggleMembers} aria-label="Membres">
            <Users className="size-4" />
          </Button>
        )}
        {/* Layout orientation toggle */}
        {onToggleOrientation && (
          <Button isIconOnly variant="ghost" size="sm"
            className="size-8 text-muted hover:text-accent transition-colors"
            onPress={onToggleOrientation}
            aria-label={orientation === "vertical" ? "Passer en barre horizontale" : "Passer en rail vertical"}>
            {orientation === "vertical" ? <PanelTop className="size-4" /> : <PanelLeft className="size-4" />}
          </Button>
        )}
        <Button isIconOnly variant="ghost" size="sm"
          className="size-8 text-muted hover:text-foreground" aria-label="Paramètres canal">
          <Settings2 className="size-4" />
        </Button>
      </div>
    </header>
  );
}
