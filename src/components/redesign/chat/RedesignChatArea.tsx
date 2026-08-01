"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Spinner, Button, Surface } from "@heroui/react";
import { Phone, Video, Search, Smile, Reply, MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react";
import { useMessages } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { useCallContext } from "@/hooks/use-call-context";
import { userProfileCache } from "@/lib/user-profile-cache";
import { AvatarFallback } from "@/components/redesign/ui/AvatarFallback";
import { Composer } from "@/components/redesign/chat/Composer";
import { Popover } from "@/components/redesign/ui/Popover";
import { EmojiPicker } from "@/components/chat/emoji-picker";
import { PresenceDot } from "@/components/redesign/ui/PresenceDot";
import { parseContent, AttachmentList } from "@/components/redesign/chat/attachments";

function initialsOf(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}
function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

interface DisplayReaction { emoji: string; count: number; reacted: boolean }

interface RowProps {
  authorName: string;
  initials: string;
  avatarUrl?: string | null;
  isOwn: boolean;
  grouped: boolean;
  content: string;
  time: string;
  edited?: boolean;
  pending?: boolean;
  failed?: boolean;
  reactions: DisplayReaction[];
  replyAuthor?: string;
  replyText?: string;
  editing: boolean;
  editText: string;
  onEditText: (v: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onReact: (emoji: string, reacted: boolean) => void;
  onReply: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
}

function MessageRow(p: RowProps) {
  const { text, attachments } = parseContent(p.content);
  return (
    <div className={`group relative flex items-start gap-3 px-4 py-0.5 transition-colors duration-100 hover:bg-surface/40 ${p.grouped ? "mt-0" : "mt-4"} ${p.pending ? "opacity-60" : ""}`}>
      {/* Barre d'actions au survol */}
      {!p.editing && (
        <div className="absolute -top-3 right-4 z-10 hidden items-center gap-0.5 rounded-xl bg-overlay p-0.5 shadow-lg shadow-black/20 ring-1 ring-sep group-hover:flex">
          <EmojiPicker onSelect={(e) => p.onReact(e, false)}>
            <span className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground" aria-label="Réagir"><Smile className="size-4" /></span>
          </EmojiPicker>
          <button onClick={p.onReply} className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground" aria-label="Répondre"><Reply className="size-4" /></button>
          {p.isOwn && (
            <Popover placement="top" align="end" trigger={<span className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground" aria-label="Plus"><MoreHorizontal className="size-4" /></span>}>
              {(close) => (
                <div className="w-40 rounded-xl bg-overlay p-1.5 shadow-xl shadow-black/30 ring-1 ring-sep">
                  <button onClick={() => { p.onStartEdit(); close(); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-foreground/85 transition-colors hover:bg-surface-2"><Pencil className="size-3.5" /> Modifier</button>
                  <button onClick={() => { p.onDelete(); close(); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-danger transition-colors hover:bg-danger/10"><Trash2 className="size-3.5" /> Supprimer</button>
                </div>
              )}
            </Popover>
          )}
        </div>
      )}

      {/* Avatar / heure */}
      <div className="mt-0.5 w-8 shrink-0">
        {!p.grouped ? (
          <AvatarFallback
            avatarUrl={p.avatarUrl}
            name={p.authorName}
            seed={p.authorName}
            size="sm"
            className="size-8"
          />
        ) : (
          <span className="block text-right text-[10px] text-muted/60 opacity-0 transition-opacity group-hover:opacity-100">{p.time}</span>
        )}
      </div>

      {/* Contenu */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Aperçu de réponse */}
        {p.replyAuthor && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted/70">
            <Reply className="size-3 shrink-0 -scale-x-100" />
            <span className="font-medium text-muted">{p.replyAuthor}</span>
            <span className="min-w-0 truncate">{p.replyText || "Pièce jointe"}</span>
          </div>
        )}

        {!p.grouped && (
          <div className="flex items-baseline gap-2">
            <span className={`text-sm font-semibold leading-tight ${p.isOwn ? "text-accent" : "text-foreground"}`}>{p.authorName}</span>
            <span className="text-[10px] text-muted/60">{p.time}</span>
          </div>
        )}

        {p.editing ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              autoFocus
              value={p.editText}
              onChange={(e) => p.onEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); p.onEditSave(); }
                if (e.key === "Escape") p.onEditCancel();
              }}
              rows={1}
              className="resize-none rounded-lg border border-border bg-field px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <button onClick={p.onEditSave} className="flex items-center gap-1 rounded-md bg-accent px-2 py-1 font-medium text-accent-fg hover:opacity-90"><Check className="size-3" /> Enregistrer</button>
              <button onClick={p.onEditCancel} className="flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 hover:bg-surface-3"><X className="size-3" /> Annuler</button>
            </div>
          </div>
        ) : (
          <>
            {text && (
              <p className="wrap-break-word text-sm leading-relaxed text-foreground/85">
                {text}
                {p.edited && <span className="ml-1 text-[10px] text-muted/60"><Pencil className="mb-0.5 mr-0.5 inline size-2.5" />modifié</span>}
                {p.failed && <span className="ml-1 text-[10px] font-medium text-danger">· échec</span>}
              </p>
            )}
            <AttachmentList attachments={attachments} />
          </>
        )}

        {p.reactions.length > 0 && !p.editing && (
          <div className="mt-1 flex flex-wrap gap-1">
            {p.reactions.map((r) => (
              <button key={r.emoji} onClick={() => p.onReact(r.emoji, r.reacted)}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-all duration-150 active:scale-90 ${r.reacted ? "border border-accent/40 bg-accent/20 text-accent" : "border border-border bg-surface text-muted hover:bg-surface-2"}`}>
                <span>{r.emoji}</span><span className="font-medium">{r.count}</span>
              </button>
            ))}
            <EmojiPicker onSelect={(e) => p.onReact(e, false)}>
              <span className="flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface hover:text-foreground" aria-label="Ajouter une réaction"><Smile className="size-3.5" /></span>
            </EmojiPicker>
          </div>
        )}
      </div>
    </div>
  );
}

interface Props { recipientId: string; recipientName: string }

export function RedesignChatArea({ recipientId, recipientName }: Props) {
  const { user } = useAuth();
  const {
    messages, sendMessage, isLoading, typingUsers,
    addReaction, removeReaction, editMessage, deleteMessage,
    hasMoreMessages, loadMoreMessages,
  } = useMessages(undefined, recipientId);
  const { initiateCall } = useCallContext();
  // Re-render quand le cache de profils se met à jour (avatars/noms).
  useSyncExternalStore(userProfileCache.subscribe, userProfileCache.getSnapshot, userProfileCache.getServerSnapshot);

  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string; content: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "auto" }); }, [messages.length]);

  const name = recipientName || "Conversation";
  const myId = user?.id;
  const messagesById = useMemo(() => {
    const m = new Map<string, (typeof messages)[number]>();
    for (const x of messages) m.set(x.id, x);
    return m;
  }, [messages]);

  // Nom + avatar résolus via le cache de profils (puis currentUser / sender).
  const nameOf = (m: (typeof messages)[number]) => {
    if (m.authorId === myId) return user?.displayName || user?.username || "Moi";
    const c = userProfileCache.getProfile(m.authorId);
    return c?.displayName || c?.username || m.sender?.displayName || m.sender?.username || name;
  };
  const avatarOf = (m: (typeof messages)[number]): string | null | undefined => {
    if (m.authorId === myId) return user?.avatarUrl;
    return userProfileCache.getProfile(m.authorId)?.avatarUrl ?? m.sender?.avatarUrl;
  };

  const react = (id: string, emoji: string, reacted: boolean) => { if (reacted) removeReaction(id, emoji); else addReaction(id, emoji); };
  const startReply = (m: (typeof messages)[number]) => setReplyingTo({ id: m.id, authorName: nameOf(m), content: parseContent(m.content).text || "Pièce jointe" });
  const startEdit = (m: (typeof messages)[number]) => { setEditingId(m.id); setEditText(parseContent(m.content).text); };
  const saveEdit = () => { if (editingId && editText.trim()) editMessage(editingId, editText.trim()); setEditingId(null); setEditText(""); };
  const cancelEdit = () => { setEditingId(null); setEditText(""); };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-background">
      {/* Header (topbar) */}
      <Surface variant="transparent" className="flex h-14 shrink-0 items-center gap-3 border-b border-sep bg-surface/80 px-4 backdrop-blur-md">
        <div className="relative">
          <AvatarFallback
            avatarUrl={userProfileCache.getProfile(recipientId)?.avatarUrl}
            name={name}
            seed={recipientId}
            size="sm"
            className="size-8"
          />
          <PresenceDot status="online" size="sm" className="absolute -bottom-0.5 -right-0.5" />
        </div>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{name}</p>
        <div className="flex items-center gap-0.5">
          <Button isIconOnly variant="ghost" size="sm" className="size-8 text-muted hover:text-foreground" onPress={() => initiateCall(recipientId, "voice", undefined, name)} aria-label="Appel vocal"><Phone className="size-4" /></Button>
          <Button isIconOnly variant="ghost" size="sm" className="size-8 text-muted hover:text-foreground" onPress={() => initiateCall(recipientId, "video", undefined, name)} aria-label="Appel vidéo"><Video className="size-4" /></Button>
          <Button isIconOnly variant="ghost" size="sm" className="size-8 text-muted hover:text-foreground" aria-label="Rechercher"><Search className="size-4" /></Button>
        </div>
      </Surface>

      {/* Messages */}
      <div className="flex flex-1 flex-col overflow-y-auto py-3">
        {isLoading && messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center"><Spinner size="sm" /></div>
        ) : (
          <>
            {hasMoreMessages && (
              <div className="flex justify-center py-2">
                <button onClick={() => loadMoreMessages()} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted transition-colors hover:text-foreground">Charger les messages précédents</button>
              </div>
            )}
            {!hasMoreMessages && (
              <div className="px-4 pb-4">
                <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-accent/15"><span className="text-lg font-bold text-accent">{initialsOf(name)}</span></div>
                <h2 className="text-xl font-bold text-foreground">{name}</h2>
                <p className="text-sm text-muted">Début de votre conversation avec <strong className="text-foreground/70">{name}</strong>.</p>
              </div>
            )}

            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const grouped = !!prev && prev.authorId === m.authorId && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000 && !m.replyToId;
              const isOwn = m.authorId === myId;
              const reply = m.replyToId ? messagesById.get(m.replyToId) : null;
              return (
                <MessageRow
                  key={m.id}
                  authorName={nameOf(m)}
                  initials={initialsOf(nameOf(m))}
                  avatarUrl={avatarOf(m)}
                  isOwn={isOwn}
                  grouped={grouped}
                  content={m.content}
                  time={fmt(m.createdAt)}
                  edited={m.isEdited}
                  pending={m.pending}
                  failed={m.failed}
                  reactions={(m.reactions || []).map((r) => ({ emoji: r.emoji, count: r.count, reacted: !!myId && r.userIds.includes(myId) }))}
                  replyAuthor={reply ? nameOf(reply) : undefined}
                  replyText={reply ? parseContent(reply.content).text : undefined}
                  editing={editingId === m.id}
                  editText={editText}
                  onEditText={setEditText}
                  onEditSave={saveEdit}
                  onEditCancel={cancelEdit}
                  onReact={(emoji, reacted) => react(m.id, emoji, reacted)}
                  onReply={() => startReply(m)}
                  onStartEdit={() => startEdit(m)}
                  onDelete={() => deleteMessage(m.id)}
                />
              );
            })}

            {typingUsers.length > 0 && (
              <div className="px-4 py-1 text-xs italic text-muted">{typingUsers.map((u) => u.username).join(", ")} est en train d'écrire…</div>
            )}
            <div ref={bottomRef} className="pb-2" />
          </>
        )}
      </div>

      {/* Composer */}
      <Composer
        channelName={name}
        placeholder={`Envoyer un message à ${name}`}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSend={(c, replyId) => { void sendMessage(c, replyId); }}
      />
    </div>
  );
}
