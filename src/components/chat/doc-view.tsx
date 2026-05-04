'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DocIcon, PlusIcon, ArrowLeftIcon, PencilIcon, Trash2Icon, CheckIcon, XIcon, MenuIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface Doc {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author?: { username: string; displayName?: string; avatarUrl?: string };
  createdAt: string;
  updatedAt?: string;
}
interface DocViewProps { serverId: string; channelId: string; channelName?: string }

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function parseDoc(msg: any): Doc | null {
  try {
    const c = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
    if (c?.__type !== 'doc') return null;
    return {
      id: msg.id,
      title: c.title,
      content: c.content || '',
      authorId: msg.senderId || msg.authorId || msg.sender_id,
      author: msg.sender || msg.author,
      createdAt: msg.createdAt || msg.created_at,
      updatedAt: c.updatedAt,
    };
  } catch { return null; }
}

/* ── DocCard (list item) ───────────────────────────────────────────────────── */

function DocCard({ doc, onClick, isOwner, onDelete }: { doc: Doc; onClick: () => void; isOwner: boolean; onDelete: (id: string) => void }) {
  const ui = useUIStyle();
  const preview = doc.content.replace(/[#*`_~\[\]()]/g, '').slice(0, 120);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={cn(
        'group relative mx-4 mb-3 w-[calc(100%-2rem)] cursor-pointer rounded-2xl border p-4 text-left transition-all',
        ui.isGlass
          ? 'border-white/12 bg-white/7 backdrop-blur-xl hover:bg-white/12 hover:border-white/20'
          : 'border-border/50 bg-card shadow-sm hover:border-primary/30 hover:shadow-md',
      )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-sky-400/15">
            <DocIcon size={14} className="text-sky-400" />
          </div>
          <p className="truncate text-[14px] font-semibold text-foreground">{doc.title}</p>
        </div>
        {isOwner && (
          <button onClick={e => { e.stopPropagation(); onDelete(doc.id); }}
            className="size-6 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive">
            <Trash2Icon size={12} />
          </button>
        )}
      </div>
      {preview && <p className="mt-2 pl-10.5 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">{preview}…</p>}
      <p className="mt-2 pl-10.5 text-[11px] text-muted-foreground/60">
        {doc.author?.displayName || doc.author?.username || 'Inconnu'} · {timeAgo(doc.updatedAt || doc.createdAt)}
      </p>
    </div>
  );
}

/* ── Editor ────────────────────────────────────────────────────────────────── */

function DocEditor({
  doc, serverId, channelId, onSave, onCancel,
}: { doc?: Doc; serverId: string; channelId: string; onSave: (d: Doc) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(doc?.title || '');
  const [content, setContent] = useState(doc?.content || '');
  const [preview, setPreview] = useState(false);
  const { user } = useAuth();
  const ui = useUIStyle();

  const handleSave = useCallback(() => {
    if (!title.trim()) return;
    const now = new Date().toISOString();
    const payload = JSON.stringify({ __type: 'doc', title: title.trim(), content, updatedAt: now });
    if (doc) {
      socketService.editServerMessage(serverId, doc.id, payload, channelId);
      onSave({ ...doc, title: title.trim(), content, updatedAt: now });
    } else {
      socketService.sendServerMessage({ serverId, channelId, content: payload });
      onCancel(); // will be updated via socket new event
    }
  }, [title, content, doc, serverId, channelId, onSave, onCancel]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* toolbar */}
      <div className={cn('flex shrink-0 items-center gap-2 border-b px-4 py-2', ui.isGlass ? 'border-white/10' : 'border-border/50')}>
        <Button size="icon-sm" variant="ghost" className="size-7 rounded-lg text-muted-foreground" onClick={onCancel}>
          <ArrowLeftIcon size={14} />
        </Button>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre du document…"
          className="flex-1 rounded-xl border-0 bg-transparent text-[14px] font-semibold shadow-none focus-visible:ring-0" />
        <div className={cn('flex rounded-xl p-0.5 text-[11px] font-medium', ui.isGlass ? 'bg-white/8' : 'bg-muted/60')}>
          {(['edit', 'preview'] as const).map(m => (
            <button key={m} onClick={() => setPreview(m === 'preview')}
              className={cn('rounded-[9px] px-2.5 py-1 transition-colors',
                (m === 'preview') === preview ? 'bg-background/80 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {m === 'edit' ? 'Éditer' : 'Aperçu'}
            </button>
          ))}
        </div>
        <Button size="sm" className="h-7 rounded-xl text-[12px]" onClick={handleSave} disabled={!title.trim()}>
          <CheckIcon size={13} className="mr-1.5" /> Enregistrer
        </Button>
      </div>

      {/* editor / preview */}
      <div className="min-h-0 flex-1 overflow-auto">
        {preview ? (
          <div className="px-6 py-4">
            <MarkdownRenderer content={content || '*Aucun contenu*'} />
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`# ${title || 'Mon document'}\n\nCommencez à écrire en Markdown…\n\n## Section\n\nDu **texte** avec du *style*.`}
            className="h-full min-h-full resize-none rounded-none border-0 bg-transparent px-6 py-4 font-mono text-[13px] leading-relaxed shadow-none focus-visible:ring-0"
          />
        )}
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────────── */

export function DocView({ serverId, channelId, channelName }: DocViewProps) {
  const { user } = useAuth();
  const ui = useUIStyle();
  const { isMobile, toggleSidebar } = useMobileNav();

  const [docs, setDocs] = useState<Doc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewDoc, setViewDoc] = useState<Doc | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setDocs([]);
    setIsLoading(true);
    socketService.requestMessageHistory(serverId, channelId, { limit: 100 }, (res: any) => {
      if (res?.messages) {
        const parsed = (res.messages as any[]).map(parseDoc).filter(Boolean) as Doc[];
        setDocs(parsed.reverse());
      }
      setIsLoading(false);
    });
    socketService.joinChannel(channelId);
    return () => { socketService.leaveChannel(channelId); };
  }, [serverId, channelId]);

  useEffect(() => {
    const handleNew = (data: any) => {
      const msg = data?.payload ?? data;
      if (msg.channelId !== channelId && msg.channel_id !== channelId) return;
      const d = parseDoc(msg);
      if (d) setDocs(prev => [d, ...prev]);
    };
    const handleEdited = (data: any) => {
      const p = data?.payload ?? data;
      setDocs(prev => prev.map(d => {
        if (d.id !== p.messageId) return d;
        try {
          const c = JSON.parse(p.content);
          const updated = { ...d, title: c.title ?? d.title, content: c.content ?? d.content, updatedAt: c.updatedAt ?? d.updatedAt };
          if (viewDoc?.id === d.id) setViewDoc(updated);
          return updated;
        } catch { return d; }
      }));
    };
    const handleDeleted = (data: any) => {
      const id = (data?.payload ?? data)?.messageId;
      if (id) { setDocs(prev => prev.filter(d => d.id !== id)); if (viewDoc?.id === id) setViewDoc(null); }
    };
    socketService.onServerMessageNew(handleNew);
    socketService.onServerMessageEdited(handleEdited);
    socketService.onServerMessageDeleted(handleDeleted);
    return () => {
      socketService.off('SERVER_MESSAGE_NEW', handleNew);
      socketService.off('SERVER_MESSAGE_EDITED', handleEdited);
      socketService.off('SERVER_MESSAGE_DELETED', handleDeleted);
    };
  }, [channelId, viewDoc]);

  const handleDelete = useCallback((id: string) => {
    socketService.deleteServerMessage(serverId, id, channelId);
  }, [serverId, channelId]);

  /* ── Rendering ── */

  if (creating) {
    return (
      <div className={`flex h-full min-h-0 flex-col ${ui.contentBg}`}>
        <div className={`flex h-14 shrink-0 items-center gap-2 px-3 ${ui.header}`}>
          <span className="text-[14px] font-semibold">Nouveau document</span>
        </div>
        <DocEditor serverId={serverId} channelId={channelId}
          onSave={() => setCreating(false)}
          onCancel={() => setCreating(false)} />
      </div>
    );
  }

  if (viewDoc && editing) {
    return (
      <div className={`flex h-full min-h-0 flex-col ${ui.contentBg}`}>
        <div className={`flex h-14 shrink-0 items-center gap-2 px-3 ${ui.header}`}>
          <span className="text-[14px] font-semibold">Modifier le document</span>
        </div>
        <DocEditor doc={viewDoc} serverId={serverId} channelId={channelId}
          onSave={d => { setViewDoc(d); setEditing(false); }}
          onCancel={() => setEditing(false)} />
      </div>
    );
  }

  if (viewDoc) {
    return (
      <div className={`flex h-full min-h-0 flex-col ${ui.contentBg}`}>
        {/* doc header */}
        <div className={`flex h-14 shrink-0 items-center gap-2.5 px-3 ${ui.header}`}>
          <Button size="icon-sm" variant="ghost" className="size-8 shrink-0 rounded-xl text-muted-foreground" onClick={() => setViewDoc(null)}>
            <ArrowLeftIcon size={15} />
          </Button>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-sky-400/15">
            <DocIcon size={13} className="text-sky-400" />
          </div>
          <h2 className="flex-1 truncate text-[14px] font-semibold text-foreground">{viewDoc.title}</h2>
          {viewDoc.authorId === user?.id && (
            <Button size="icon-sm" variant="ghost" className="size-8 rounded-xl text-muted-foreground hover:text-foreground" onClick={() => setEditing(true)}>
              <PencilIcon size={14} />
            </Button>
          )}
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-6 py-5">
            <MarkdownRenderer content={viewDoc.content || '*Document vide*'} />
          </div>
          <p className="px-6 pb-6 text-[11px] text-muted-foreground/60">
            Dernière modification {timeAgo(viewDoc.updatedAt || viewDoc.createdAt)} par {viewDoc.author?.displayName || viewDoc.author?.username || 'Inconnu'}
          </p>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className={`flex h-full min-h-0 flex-col ${ui.contentBg}`}>
      {/* Header */}
      <div className={`flex h-14 shrink-0 items-center gap-2.5 px-3 ${ui.header}`}>
        {isMobile && (
          <Button size="icon-sm" variant="ghost" className="size-8 shrink-0 rounded-xl text-muted-foreground" onClick={toggleSidebar}>
            <MenuIcon size={16} />
          </Button>
        )}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-sky-400/15">
          <DocIcon size={13} className="text-sky-400" />
        </div>
        <h2 className="truncate text-[14px] font-semibold text-foreground">{channelName || 'Documents'}</h2>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setCreating(true)}
            className="h-7 gap-1.5 rounded-xl border-0 bg-sky-400/15 text-[12px] font-medium text-sky-400 shadow-none hover:bg-sky-400/25">
            <PlusIcon size={13} /> Nouveau doc
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 pt-3">
        {isLoading ? (
          <div className="space-y-3 px-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-[18px] bg-sky-400/10">
              <DocIcon size={28} className="text-sky-400/50" />
            </div>
            <p className="mb-1 text-[15px] font-semibold text-foreground">Aucun document</p>
            <p className="text-[13px] text-muted-foreground">Créez votre premier document Markdown&nbsp;!</p>
          </div>
        ) : (
          docs.map(doc => (
            <DocCard key={doc.id} doc={doc} onClick={() => setViewDoc(doc)}
              isOwner={doc.authorId === user?.id} onDelete={handleDelete} />
          ))
        )}
        <div className="h-4" />
      </ScrollArea>
    </div>
  );
}
