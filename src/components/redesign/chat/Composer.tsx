"use client";

import { useState, useRef, useCallback } from "react";
import { Button, Spinner } from "@heroui/react";
import { Smile, Plus, Send, X, Reply as ReplyIcon, FileText } from "lucide-react";
import { Popover } from "@/components/redesign/ui/Popover";
import { EmojiPicker } from "@/components/chat/emoji-picker";
import { AttachMenu } from "@/components/redesign/ui/AttachMenu";
import { api, resolveMediaUrl } from "@/lib/api";

interface ReplyInfo { id: string; authorName: string; content: string }
interface Attachment { name: string; url: string; isImage: boolean }

interface ComposerProps {
  channelName: string;
  placeholder?: string;
  replyingTo?: ReplyInfo | null;
  onCancelReply?: () => void;
  onSend?: (content: string, replyToId?: string) => void;
}

export function Composer({ channelName, placeholder, replyingTo, onCancelReply, onSend }: ComposerProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<"image" | "doc">("doc");

  const resize = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  };

  const send = useCallback(() => {
    let content = value.trim();
    for (const a of attachments) {
      const s = a.isImage ? `\n[attach:img]:${a.url}` : `\n[attach:file]:${a.name}|${a.url}`;
      content = content ? content + s : s.trimStart();
    }
    if (!content) return;
    onSend?.(content, replyingTo?.id);
    setValue("");
    setAttachments([]);
    onCancelReply?.();
    if (taRef.current) taRef.current.style.height = "auto";
  }, [value, attachments, replyingTo, onSend, onCancelReply]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === "Escape" && replyingTo) onCancelReply?.();
  };

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => { setValue(e.target.value); resize(); };

  const insertText = (text: string) => {
    const ta = taRef.current;
    if (!ta) { setValue((v) => v + text); return; }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    setValue(value.slice(0, start) + text + value.slice(end));
    requestAnimationFrame(() => { ta.focus(); const p = start + text.length; ta.setSelectionRange(p, p); resize(); });
  };

  const openPicker = (kind: string) => {
    if (kind === "image") { modeRef.current = "image"; if (fileRef.current) { fileRef.current.accept = "image/*"; fileRef.current.click(); } }
    else if (kind === "video") { modeRef.current = "doc"; if (fileRef.current) { fileRef.current.accept = "video/*"; fileRef.current.click(); } }
    else if (kind === "file") { modeRef.current = "doc"; if (fileRef.current) { fileRef.current.accept = "*"; fileRef.current.click(); } }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      if (modeRef.current === "image") {
        const res = await api.uploadImage(file, "attachment");
        if (res.success && res.data) setAttachments((a) => [...a, { name: file.name, url: res.data!.url, isImage: true }]);
      } else {
        const res = await api.uploadDocument(file);
        if (res.success && res.data) setAttachments((a) => [...a, { name: res.data!.filename || file.name, url: res.data!.url, isImage: !!res.data!.isImage }]);
      }
    } finally {
      setUploading(false);
    }
  };

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !uploading;

  const iconTrigger = "flex size-8 items-center justify-center rounded-lg text-muted transition-all hover:bg-surface-3 hover:text-foreground active:scale-90";

  return (
    <div className="shrink-0 px-4 pb-4 pt-1.5">
      <input ref={fileRef} type="file" hidden onChange={onFile} />

      {/* Barre de réponse */}
      {replyingTo && (
        <div className="mb-1 flex items-center gap-2 rounded-t-xl border border-b-0 border-sep bg-surface-2 px-3 py-1.5 text-xs">
          <ReplyIcon className="size-3.5 shrink-0 text-accent" />
          <span className="shrink-0 text-muted">Réponse à</span>
          <span className="shrink-0 font-semibold text-foreground">{replyingTo.authorName}</span>
          <span className="min-w-0 flex-1 truncate text-muted/70">{replyingTo.content}</span>
          <button onClick={onCancelReply} className="shrink-0 text-muted hover:text-foreground" aria-label="Annuler la réponse"><X className="size-3.5" /></button>
        </div>
      )}

      {/* Pièces jointes en attente */}
      {(attachments.length > 0 || uploading) && (
        <div className="mb-1 flex flex-wrap items-center gap-2 rounded-xl border border-sep bg-surface-2 px-2.5 py-2">
          {attachments.map((a, i) => (
            <div key={i} className="group relative">
              {a.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveMediaUrl(a.url) ?? a.url} alt={a.name} className="size-16 rounded-lg border border-sep object-cover" />
              ) : (
                <div className="flex h-16 w-32 items-center gap-1.5 rounded-lg border border-sep bg-surface px-2 text-xs">
                  <FileText className="size-4 shrink-0 text-accent" /><span className="truncate">{a.name}</span>
                </div>
              )}
              <button onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-danger text-danger-fg shadow ring-2 ring-background" aria-label="Retirer">
                <X className="size-3" />
              </button>
            </div>
          ))}
          {uploading && <div className="flex size-16 items-center justify-center rounded-lg border border-dashed border-sep"><Spinner size="sm" /></div>}
        </div>
      )}

      <div className={`flex items-end gap-1 rounded-2xl bg-surface-2 px-2 py-1.5 ring-1 transition-all duration-200 ${focused || canSend ? "ring-accent/40" : "ring-transparent"} ${replyingTo ? "rounded-t-none" : ""}`}>
        {/* Pièces jointes */}
        <div className="pb-0.5">
          <Popover placement="top" align="start" trigger={<span className={iconTrigger} aria-label="Ajouter"><Plus className="size-5" /></span>}>
            {(close) => <AttachMenu onPick={(k) => { openPicker(k); close(); }} />}
          </Popover>
        </div>

        <textarea
          ref={taRef}
          value={value}
          onChange={onInput}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder ?? `Message #${channelName}`}
          rows={1}
          className="max-h-40 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm leading-relaxed text-foreground placeholder:text-field-ph outline-none"
          style={{ height: "auto" }}
        />

        {/* Emoji / GIF / Stickers — picker complet */}
        <div className="pb-0.5">
          <EmojiPicker onSelect={(e) => insertText(e)} onGifSelect={(url) => onSend?.(url)}>
            <span className={iconTrigger} aria-label="Emoji"><Smile className="size-[18px]" /></span>
          </EmojiPicker>
        </div>

        {/* Envoyer */}
        <div className="pb-0.5">
          <Button isIconOnly size="sm"
            className={`size-8 transition-all duration-150 ${canSend ? "bg-accent text-accent-fg hover:opacity-90 active:scale-90" : "cursor-not-allowed bg-transparent text-muted/50"}`}
            onPress={send} isDisabled={!canSend} aria-label="Envoyer">
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
