'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MediaIcon, PlusIcon, XIcon, PlayIcon, PauseIcon, DownloadIcon, MenuIcon, VideoIcon, MusicIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { socketService } from '@/lib/socket';
import { api, resolveMediaUrl } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────────────────────────── */

type MediaType = 'video' | 'audio' | 'image' | 'file';

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  mediaType: MediaType;
  caption?: string;
  authorId: string;
  author?: { username: string; displayName?: string; avatarUrl?: string };
  createdAt: string;
}
interface MediaViewProps { serverId: string; channelId: string; channelName?: string }

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function detectType(url: string, filename: string): MediaType {
  const ext = (filename || url).split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'ogv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'opus'].includes(ext)) return 'audio';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp'].includes(ext)) return 'image';
  return 'file';
}

function parseMedia(msg: any): MediaItem | null {
  const url = msg.content || '';
  if (!url) return null;
  // Must be a URL (starts with http, /, or /uploads)
  const isUrl = url.startsWith('http') || url.startsWith('/') || url.includes('/uploads/');
  if (!isUrl) return null;
  const filename = url.split('/').pop()?.split('?')[0] || 'media';
  const mediaType = detectType(url, filename);
  if (mediaType === 'file' && !url.includes('/uploads/')) return null;
  return {
    id: msg.id,
    url: resolveMediaUrl(url) || url,
    filename,
    mediaType,
    authorId: msg.senderId || msg.authorId || msg.sender_id,
    author: msg.sender || msg.author,
    createdAt: msg.createdAt || msg.created_at,
  };
}

/* ── AudioPlayer ───────────────────────────────────────────────────────────── */

function AudioPlayer({ url, filename }: { url: string; filename: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-3">
      <audio ref={audioRef} src={url}
        onTimeUpdate={() => { if (audioRef.current) setProgress(audioRef.current.currentTime); }}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
        onEnded={() => setPlaying(false)} />
      <button onClick={toggle}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-400 hover:bg-cyan-400/25 transition-colors">
        {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="truncate text-[12px] font-medium text-foreground">{filename}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-foreground/10 overflow-hidden cursor-pointer"
            onClick={e => {
              if (!audioRef.current || !duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              audioRef.current.currentTime = ratio * duration;
            }}>
            <div className="h-full rounded-full bg-cyan-400 transition-all"
              style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }} />
          </div>
          <span className="text-[10px] tabular-nums text-muted-foreground/60">{fmt(progress)} / {fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── MediaCard ─────────────────────────────────────────────────────────────── */

function MediaCard({ item, onDelete, isOwner }: { item: MediaItem; onDelete: (id: string) => void; isOwner: boolean }) {
  const ui = useUIStyle();

  return (
    <div className={cn(
      'overflow-hidden rounded-2xl border transition-all',
      ui.isGlass
        ? 'border-white/12 bg-white/7 backdrop-blur-xl'
        : 'border-border/50 bg-card shadow-sm',
    )}>
      {/* media preview */}
      {item.mediaType === 'video' && (
        <video src={item.url} controls className="w-full max-h-64 bg-black" />
      )}
      {item.mediaType === 'image' && (
        <img src={item.url} alt={item.caption || item.filename}
          className="w-full max-h-64 object-cover" loading="lazy" />
      )}

      {/* meta */}
      <div className="p-3">
        {item.mediaType === 'audio' && <AudioPlayer url={item.url} filename={item.filename} />}
        {item.mediaType === 'file' && (
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15">
              <MediaIcon size={15} className="text-cyan-400" />
            </div>
            <p className="flex-1 truncate text-[13px] font-medium text-foreground">{item.filename}</p>
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-2">
          <Avatar className="size-5 shrink-0">
            <AvatarImage src={resolveMediaUrl(item.author?.avatarUrl || '') || undefined} />
            <AvatarFallback className="text-[9px]">{initials(item.author?.displayName || item.author?.username || '?')}</AvatarFallback>
          </Avatar>
          <span className="text-[11px] text-muted-foreground/70">
            {item.author?.displayName || item.author?.username || 'Inconnu'} · {timeAgo(item.createdAt)}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <a href={item.url} download={item.filename} target="_blank" rel="noopener noreferrer">
              <Button size="icon-sm" variant="ghost" className="size-6 rounded-lg text-muted-foreground hover:text-foreground">
                <DownloadIcon size={11} />
              </Button>
            </a>
            {isOwner && (
              <Button size="icon-sm" variant="ghost"
                className="size-6 rounded-lg text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(item.id)}>
                <XIcon size={11} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────────── */

export function MediaView({ serverId, channelId, channelName }: MediaViewProps) {
  const { user } = useAuth();
  const ui = useUIStyle();
  const { isMobile, toggleSidebar } = useMobileNav();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | MediaType>('all');

  useEffect(() => {
    setItems([]);
    setIsLoading(true);
    socketService.requestMessageHistory(serverId, channelId, { limit: 200 }, (res: any) => {
      if (res?.messages) {
        const parsed = (res.messages as any[]).map(parseMedia).filter(Boolean) as MediaItem[];
        setItems(parsed.reverse());
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
      const m = parseMedia(msg);
      if (m) setItems(prev => [m, ...prev]);
    };
    const handleDeleted = (data: any) => {
      const id = (data?.payload ?? data)?.messageId;
      if (id) setItems(prev => prev.filter(m => m.id !== id));
    };
    socketService.onServerMessageNew(handleNew);
    socketService.onServerMessageDeleted(handleDeleted);
    return () => {
      socketService.off('SERVER_MESSAGE_NEW', handleNew);
      socketService.off('SERVER_MESSAGE_DELETED', handleDeleted);
    };
  }, [channelId]);

  const handleDelete = useCallback((id: string) => {
    socketService.deleteServerMessage(serverId, id, channelId);
  }, [serverId, channelId]);

  const handleUpload = useCallback(async (file: File) => {
    const res = await api.uploadServerFile(serverId, file, channelId);
    if (res.success && res.data) {
      const fileUrl = resolveMediaUrl(`/api/servers/${serverId}${res.data.url}`) || res.data.url;
      socketService.sendServerMessage({ serverId, channelId, content: fileUrl });
    }
  }, [serverId, channelId]);

  const displayed = items.filter(m => filter === 'all' || m.mediaType === filter);

  const FILTERS: Array<{ key: 'all' | MediaType; label: string }> = [
    { key: 'all', label: 'Tout' },
    { key: 'video', label: 'Vidéos' },
    { key: 'audio', label: 'Audio' },
    { key: 'image', label: 'Images' },
  ];

  return (
    <div className={`flex h-full min-h-0 flex-col ${ui.contentBg}`}>
      {/* Header */}
      <div className={`flex h-14 shrink-0 items-center gap-2.5 px-3 ${ui.header}`}>
        {isMobile && (
          <Button size="icon-sm" variant="ghost" className="size-8 shrink-0 rounded-xl text-muted-foreground" onClick={toggleSidebar}>
            <MenuIcon size={16} />
          </Button>
        )}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-cyan-400/15">
          <MediaIcon size={13} className="text-cyan-400" />
        </div>
        <h2 className="flex-1 truncate text-[14px] font-semibold text-foreground">{channelName || 'Médias'}</h2>
        <label className="cursor-pointer">
          <input type="file" accept="video/*,audio/*,image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
          <span className="flex h-7 cursor-pointer items-center gap-1.5 rounded-xl bg-cyan-400/15 px-3 text-[12px] font-medium text-cyan-400 transition-colors hover:bg-cyan-400/25">
            <PlusIcon size={13} /> Partager
          </span>
        </label>
      </div>

      {/* Filter bar */}
      <div className="flex shrink-0 gap-1.5 px-4 pt-3 pb-1">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-xl px-3 py-1.5 text-[12px] font-medium transition-colors',
              filter === f.key
                ? 'bg-cyan-400/15 text-cyan-400'
                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/6',
            )}>
            {f.label}
          </button>
        ))}
      </div>

      <ScrollArea className="min-h-0 flex-1 pt-2">
        {isLoading ? (
          <div className="space-y-3 px-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-[18px] bg-cyan-400/10">
              <MediaIcon size={28} className="text-cyan-400/50" />
            </div>
            <p className="mb-1 text-[15px] font-semibold text-foreground">Aucun média</p>
            <p className="text-[13px] text-muted-foreground">Partagez vos vidéos, musiques et images&nbsp;!</p>
          </div>
        ) : (
          <div className="space-y-3 px-4">
            {displayed.map(item => (
              <MediaCard key={item.id} item={item}
                isOwner={item.authorId === user?.id}
                onDelete={handleDelete} />
            ))}
          </div>
        )}
        <div className="h-4" />
      </ScrollArea>
    </div>
  );
}
