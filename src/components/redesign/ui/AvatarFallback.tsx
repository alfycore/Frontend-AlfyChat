"use client";

import { useState } from "react";
import { Avatar } from "@heroui/react";
import { getAvatarImageSrc, getAvatarFallbackBg, getDefaultAvatarUrl } from "@/lib/avatar-utils";

interface AvatarFallbackProps {
  avatarUrl?: string | null;
  name?: string;
  seed?: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function initialsOf(name?: string) {
  return name?.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

export function AvatarFallback({ avatarUrl, name, seed, alt, size = "sm", className }: AvatarFallbackProps) {
  const fallbackSeed = seed ?? name ?? "";
  const defaultSrc = getDefaultAvatarUrl(fallbackSeed);
  const [src, setSrc] = useState<string>(() => getAvatarImageSrc(avatarUrl, fallbackSeed));
  const bgColor = getAvatarFallbackBg(fallbackSeed);

  const handleError = () => {
    if (src !== defaultSrc) {
      setSrc(defaultSrc);
    } else {
      setSrc("");
    }
  };

  return (
    <Avatar size={size} className={className} style={{ backgroundColor: bgColor }}>
      {src ? (
        <Avatar.Image src={src} alt={alt ?? name} onError={handleError} />
      ) : null}
      <Avatar.Fallback className="border-none text-xs font-semibold text-foreground/70" style={{ backgroundColor: bgColor }}>
        {initialsOf(name || alt)}
      </Avatar.Fallback>
    </Avatar>
  );
}
