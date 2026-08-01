"use client";

type Status = "online" | "away" | "dnd" | "offline";

const COLOR: Record<Status, string> = {
  online:  "bg-online",
  away:    "bg-away",
  dnd:     "bg-dnd",
  offline: "bg-offline",
};

interface PresenceDotProps {
  status: Status;
  size?: "sm" | "md";
  className?: string;
}

export function PresenceDot({ status, size = "md", className = "" }: PresenceDotProps) {
  return (
    <span
      className={`block rounded-full ring-2 ring-background ${COLOR[status]} ${
        size === "sm" ? "size-2" : "size-2.5"
      } ${className}`}
    />
  );
}
