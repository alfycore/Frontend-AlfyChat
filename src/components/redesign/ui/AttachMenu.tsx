"use client";

import { Image, FileText, Video, BarChart3, Calendar } from "lucide-react";

interface AttachMenuProps {
  onPick?: (kind: string) => void;
}

const ITEMS = [
  { id: "image", label: "Image", icon: Image },
  { id: "video", label: "Vidéo", icon: Video },
  { id: "file", label: "Document", icon: FileText },
  { id: "poll", label: "Sondage", icon: BarChart3 },
  { id: "event", label: "Événement", icon: Calendar },
];

export function AttachMenu({ onPick }: AttachMenuProps) {
  return (
    <div className="w-52 rounded-2xl bg-overlay p-1.5 shadow-xl shadow-black/30 ring-1 ring-sep">
      {ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onPick?.(id)}
          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-foreground/85 transition-colors hover:bg-surface-2"
        >
          <Icon className="size-4 shrink-0 text-muted" />
          <span className="text-sm">{label}</span>
        </button>
      ))}
    </div>
  );
}
