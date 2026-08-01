"use client";

import { FileText, Download } from "lucide-react";
import { resolveMediaUrl } from "@/lib/api";

export interface ParsedAttachment {
  type: "img" | "file";
  url: string;
  name?: string;
}

/**
 * Sépare le texte d'un message de ses pièces jointes encodées en markers
 * (`[attach:img]:URL` ou `[attach:file]:nom|URL`) — format de `chat-area.tsx`.
 */
export function parseContent(content: string): { text: string; attachments: ParsedAttachment[] } {
  const attachments: ParsedAttachment[] = [];
  const textLines: string[] = [];
  for (const line of content.split("\n")) {
    const img = line.match(/^\[attach:img\]:(.+)$/);
    if (img) { attachments.push({ type: "img", url: img[1].trim() }); continue; }
    const file = line.match(/^\[attach:file\]:(.+)$/);
    if (file) {
      const rest = file[1];
      const sep = rest.indexOf("|");
      if (sep >= 0) attachments.push({ type: "file", name: rest.slice(0, sep), url: rest.slice(sep + 1) });
      else attachments.push({ type: "file", url: rest });
      continue;
    }
    textLines.push(line);
  }
  return { text: textLines.join("\n").trim(), attachments };
}

export function AttachmentList({ attachments }: { attachments: ParsedAttachment[] }) {
  if (attachments.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-col gap-2">
      {attachments.map((a, i) => {
        const url = resolveMediaUrl(a.url) ?? a.url;
        if (a.type === "img") {
          return (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={a.name ?? "image"} className="max-h-80 max-w-sm rounded-xl border border-sep object-cover transition-opacity hover:opacity-90" />
            </a>
          );
        }
        return (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
            className="flex w-fit max-w-sm items-center gap-2.5 rounded-xl border border-sep bg-surface-2 px-3 py-2 transition-colors hover:bg-surface-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <FileText className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{a.name || "Fichier"}</span>
            <Download className="size-4 shrink-0 text-muted" />
          </a>
        );
      })}
    </div>
  );
}
