'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { GalleryIcon, PlusIcon, XIcon, DownloadIcon, Maximize2Icon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { api, resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  authorId: string;
  author?: { username: string; displayName?: string; avatarUrl?: string };
  createdAt: string;
  width?: number;
  height?: number;
}

interface GalleryViewProps {
  serverId: string;
  channelId: string;
  channelName?: string;
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `il y a ${days}j`;
  return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)(\?.*)?$/i.test(url) || url.includes('/uploads/attachments/');
}

/* ── Lightbox ────────────────────────────────────────────────────────────────── */

function Lightbox({
  image,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  image: GalleryImage;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        onClick={onClose}
      >
        <XIcon size={18} />
      </button>

      {/* Nav left */}
      {hasPrev && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
      )}

      {/* Nav right */}
      {hasNext && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      )}

      {/* Image */}
      <div
        className="relative max-h-[88vh] max-w-[88vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={image.url}
          alt={image.caption || 'image'}
          className="max-h-[80vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
        />
        {/* Info bar */}
        <div className="mt-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            {image.caption && (
              <p className="truncate text-sm font-medium text-white">{image.caption}</p>
            )}
            <p className="text-[11px] text-white/50">
              Partagé par <span className="text-white/80">{image.author?.displayName || image.author?.username || 'Inconnu'}</span>
              {' · '}{timeAgo(image.createdAt)}
            </p>
          </div>
          <a
            href={image.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <DownloadIcon size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Pin card (masonry item) ─────────────────────────────────────────────────── */

function PinCard({
  image,
  onClick,
}: {
  image: GalleryImage;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group relative mb-3 w-full cursor-pointer overflow-hidden rounded-2xl bg-[var(--surface)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Image */}
      {!loaded && (
        <Skeleton
          className="w-full rounded-2xl"
          style={{ height: `${120 + Math.random() * 160}px` }}
        />
      )}
      <img
        src={image.url}
        alt={image.caption || ''}
        className={cn(
          'w-full rounded-2xl object-cover transition-transform duration-300',
          hovered && 'scale-[1.02]',
          !loaded && 'hidden',
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />

      {/* Overlay on hover */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl bg-gradient-to-b from-black/10 via-transparent to-black/60 transition-opacity duration-200',
          hovered ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Expand icon */}
      {hovered && (
        <div className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full bg-white/90 text-black shadow">
          <Maximize2Icon size={13} />
        </div>
      )}

      {/* Bottom info */}
      {(image.caption || image.author) && hovered && (
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {image.caption && (
            <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-white drop-shadow">
              {image.caption}
            </p>
          )}
          <p className="mt-0.5 text-[10px] text-white/70">
            {image.author?.displayName || image.author?.username}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Masonry grid ────────────────────────────────────────────────────────────── */

function MasonryGrid({
  images,
  onImageClick,
  columns,
}: {
  images: GalleryImage[];
  onImageClick: (index: number) => void;
  columns: number;
}) {
  const cols: GalleryImage[][] = useMemo(() => {
    const result: GalleryImage[][] = Array.from({ length: columns }, () => []);
    images.forEach((img, i) => result[i % columns].push(img));
    return result;
  }, [images, columns]);

  const globalIndex = useMemo(() => {
    const map = new Map<string, number>();
    images.forEach((img, i) => map.set(img.id, i));
    return map;
  }, [images]);

  return (
    <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
      {cols.map((col, ci) => (
        <div key={ci} className="flex-1 min-w-0">
          {col.map((image) => (
            <PinCard
              key={image.id}
              image={image}
              onClick={() => onImageClick(globalIndex.get(image.id)!)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Upload button ───────────────────────────────────────────────────────────── */

function UploadModal({
  onClose,
  onUpload,
}: {
  onClose: () => void;
  onUpload: (file: File, caption: string) => void;
}) {
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  };

  const handleSubmit = () => {
    if (!file) return;
    onUpload(file, caption.trim());
  };

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border)]/40 bg-[var(--surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)]/30 px-5 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-pink-500/10">
            <GalleryIcon size={15} className="text-pink-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--foreground)]">Partager une image</p>
          </div>
          <Button size="icon-sm" variant="ghost" className="size-8 rounded-lg text-muted-foreground" onClick={onClose}>
            <XIcon size={15} />
          </Button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Drop zone */}
          <div
            className={cn(
              'relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors',
              dragging
                ? 'border-pink-400 bg-pink-500/10'
                : preview
                  ? 'border-[var(--border)]/30 bg-[var(--background)]'
                  : 'border-[var(--border)]/40 bg-[var(--background)] hover:border-pink-400/50 hover:bg-pink-500/5',
            )}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !preview && document.getElementById('gallery-file-input')?.click()}
          >
            <input
              id="gallery-file-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {preview ? (
              <>
                <img src={preview} alt="preview" className="max-h-[200px] rounded-lg object-contain" />
                <button
                  className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-white"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                >
                  <XIcon size={12} />
                </button>
              </>
            ) : (
              <>
                <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-pink-500/10">
                  <GalleryIcon size={22} className="text-pink-400" />
                </div>
                <p className="text-sm font-medium text-[var(--foreground)]">Glissez une image ici</p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">ou cliquez pour parcourir · JPG, PNG, GIF, WebP</p>
              </>
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[var(--muted)]">LÉGENDE <span className="opacity-50">(optionnel)</span></label>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Décrivez votre image…"
              maxLength={200}
              className="w-full rounded-xl border border-[var(--border)]/50 bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-pink-500/40 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[var(--border)]/30 px-5 py-3">
          <Button size="sm" variant="ghost" className="rounded-lg text-muted-foreground" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            className="rounded-lg bg-pink-500 text-white hover:bg-pink-600"
            onClick={handleSubmit}
            disabled={!file}
          >
            Partager
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Main GalleryView ────────────────────────────────────────────────────────── */

export function GalleryView({ serverId, channelId, channelName }: GalleryViewProps) {
  const { user } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [columns, setColumns] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Responsive columns */
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setColumns(w < 480 ? 2 : w < 720 ? 3 : w < 1100 ? 4 : 5);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  /* Load messages and extract images */
  useEffect(() => {
    setImages([]);
    setIsLoading(true);

    socketService.requestMessageHistory(serverId, channelId, { limit: 200 }, (res: any) => {
      if (res?.messages) {
        const imgs: GalleryImage[] = (res.messages as any[])
          .filter((m: any) => isImageUrl(m.content || ''))
          .map((m: any) => ({
            id: m.id,
            url: m.content,
            caption: m.caption || undefined,
            authorId: m.authorId || m.senderId || m.sender_id,
            author: m.sender ?? (m.senderName ? { username: m.senderName, displayName: m.senderName, avatarUrl: m.senderAvatar || undefined } : undefined),
            createdAt: m.createdAt || m.created_at || new Date().toISOString(),
          }))
          .reverse();
        setImages(imgs);
      }
      setIsLoading(false);
    });

    socketService.joinChannel(channelId);
    return () => socketService.leaveChannel(channelId);
  }, [serverId, channelId]);

  /* Real-time new messages */
  useEffect(() => {
    const handleNew = (data: any) => {
      const msg = data?.payload ?? data;
      if (msg.channelId !== channelId && msg.channel_id !== channelId) return;
      if (!isImageUrl(msg.content || '')) return;
      const img: GalleryImage = {
        id: msg.id,
        url: msg.content,
        caption: msg.caption || undefined,
        authorId: msg.senderId || msg.sender_id,
        author: msg.sender ?? (msg.senderName ? { username: msg.senderName, displayName: msg.senderName, avatarUrl: msg.senderAvatar || undefined } : undefined),
        createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
      };
      setImages((prev) => {
        if (prev.some((i) => i.id === img.id)) return prev;
        return [...prev, img];
      });
    };

    socketService.onServerMessageNew(handleNew);
    return () => socketService.off('SERVER_MESSAGE_NEW', handleNew);
  }, [channelId]);

  /* Upload handler */
  const handleUpload = useCallback(async (file: File, caption: string) => {
    setShowUpload(false);
    const res = await api.uploadServerFile(serverId, file, channelId);
    if (res.success && res.data) {
      const fileUrl = resolveMediaUrl(`/api/servers/${serverId}${res.data.url}`) || res.data.url;
      socketService.sendServerMessage({
        serverId,
        channelId,
        content: fileUrl,
      });
    }
  }, [serverId, channelId]);

  const lightboxImage = lightboxIndex !== null ? images[lightboxIndex] : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--background)]">
      {/* ── Header ── */}
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-[var(--border)]/30 bg-[var(--background)]/60 px-4">
        <div className="flex size-7 items-center justify-center rounded-lg bg-pink-500/10">
          <GalleryIcon size={14} className="text-pink-400" />
        </div>
        <h2 className="font-semibold text-[var(--foreground)]">{channelName || 'galerie'}</h2>
        {images.length > 0 && (
          <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
            {images.length} image{images.length > 1 ? 's' : ''}
          </span>
        )}
        <div className="ml-auto">
          <Button
            size="sm"
            className="gap-1.5 rounded-xl bg-pink-500 text-white hover:bg-pink-600"
            onClick={() => setShowUpload(true)}
          >
            <PlusIcon size={14} />
            Partager
          </Button>
        </div>
      </div>

      {/* ── Gallery grid ── */}
      <ScrollArea className="min-h-0 flex-1">
        <div ref={containerRef} className="p-4">
          {isLoading ? (
            /* Skeleton masonry */
            <div className="flex gap-3">
              {Array.from({ length: columns }).map((_, ci) => (
                <div key={ci} className="flex-1 space-y-3">
                  {Array.from({ length: 4 }).map((_, ri) => (
                    <Skeleton
                      key={ri}
                      className="w-full rounded-2xl"
                      style={{ height: `${100 + ((ci * 3 + ri * 7) % 5) * 40}px` }}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : images.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="relative mb-5 flex size-20 items-center justify-center rounded-3xl bg-pink-500/10">
                <div className="absolute inset-0 rounded-3xl bg-pink-500/8 " />
                <GalleryIcon size={36} className="relative text-pink-400" />
              </div>
              <h3 className="mb-1.5 text-xl font-bold text-[var(--foreground)]">Galerie vide</h3>
              <p className="mb-5 text-sm text-[var(--muted)]">Soyez le premier à partager une image dans #{channelName || 'galerie'}</p>
              <Button
                className="gap-1.5 rounded-xl bg-pink-500 text-white hover:bg-pink-600"
                onClick={() => setShowUpload(true)}
              >
                <PlusIcon size={15} />
                Partager une image
              </Button>
            </div>
          ) : (
            <MasonryGrid
              images={images}
              columns={columns}
              onImageClick={setLightboxIndex}
            />
          )}
        </div>
      </ScrollArea>

      {/* ── Lightbox ── */}
      {lightboxImage && (
        <Lightbox
          image={lightboxImage}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setLightboxIndex((i) => (i !== null && i < images.length - 1 ? i + 1 : i))}
          hasPrev={lightboxIndex! > 0}
          hasNext={lightboxIndex! < images.length - 1}
        />
      )}

      {/* ── Upload modal ── */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={handleUpload}
        />
      )}
    </div>
  );
}
