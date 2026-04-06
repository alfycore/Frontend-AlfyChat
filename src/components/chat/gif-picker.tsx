'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SearchIcon, Loader2Icon } from '@/components/icons';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

// Clés API publiques (rate-limited, usage frontend uniquement)
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
const GIPHY_API_KEY = 'mUaaGxrenI6xna63x7dqfSEsVqFyvqXU';
const PAGE_SIZE = 30;

interface GifResult {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  title: string;
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  children?: React.ReactNode;
}

export function GifPicker({ onSelect, children }: GifPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [provider, setProvider] = useState<'tenor' | 'giphy'>('tenor');
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);
  // Tenor uses a cursor string, Giphy uses numeric offset
  const tenorNextRef = useRef<string>('');
  const giphyOffsetRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTenorGifs = useCallback(async (query: string, next?: string) => {
    try {
      let endpoint = query
        ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=${PAGE_SIZE}&media_filter=gif,tinygif`
        : `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=${PAGE_SIZE}&media_filter=gif,tinygif`;
      if (next) endpoint += `&pos=${next}`;

      const res = await fetch(endpoint);
      const data = await res.json();
      tenorNextRef.current = data.next || '';

      return (data.results || []).map((item: any) => ({
        id: item.id,
        url: item.media_formats?.gif?.url || item.media_formats?.mediumgif?.url || '',
        previewUrl: item.media_formats?.tinygif?.url || item.media_formats?.nanogif?.url || '',
        width: item.media_formats?.tinygif?.dims?.[0] || 200,
        height: item.media_formats?.tinygif?.dims?.[1] || 200,
        title: item.title || '',
      }));
    } catch (error) {
      console.error('Tenor error:', error);
      return [];
    }
  }, []);

  const fetchGiphyGifs = useCallback(async (query: string, offset: number = 0) => {
    try {
      const endpoint = query
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&offset=${offset}&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=${PAGE_SIZE}&offset=${offset}&rating=g`;

      const res = await fetch(endpoint);
      const data = await res.json();
      giphyOffsetRef.current = offset + (data.data?.length || 0);

      return (data.data || []).map((item: any) => ({
        id: item.id,
        url: item.images?.original?.url || '',
        previewUrl: item.images?.fixed_width_small?.url || item.images?.preview_gif?.url || '',
        width: parseInt(item.images?.fixed_width_small?.width || '200', 10),
        height: parseInt(item.images?.fixed_width_small?.height || '200', 10),
        title: item.title || '',
      }));
    } catch (error) {
      console.error('Giphy error:', error);
      return [];
    }
  }, []);

  const loadGifs = useCallback(
    async (query: string, append = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        tenorNextRef.current = '';
        giphyOffsetRef.current = 0;
      }

      const results = provider === 'tenor'
        ? await fetchTenorGifs(query, append ? tenorNextRef.current : undefined)
        : await fetchGiphyGifs(query, append ? giphyOffsetRef.current : 0);

      setHasMore(results.length >= PAGE_SIZE);

      if (append) {
        setGifs(prev => {
          const existingIds = new Set(prev.map(g => g.id));
          const newGifs = results.filter((g: GifResult) => !existingIds.has(g.id));
          return [...prev, ...newGifs];
        });
        setIsLoadingMore(false);
      } else {
        setGifs(results);
        setIsLoading(false);
      }
    },
    [provider, fetchTenorGifs, fetchGiphyGifs]
  );

  useEffect(() => {
    if (open) {
      loadGifs('');
      setSearch('');
    } else {
      setGifs([]);
      setHasMore(true);
    }
  }, [open, provider, loadGifs]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadGifs(search);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, open, loadGifs]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    loadGifs(search, true);
  }, [isLoadingMore, hasMore, search, loadGifs]);

  const handleSelect = (gif: GifResult) => {
    onSelect(gif.url);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-96 overflow-hidden rounded-xl p-3 shadow-2xl">
        <Tabs value={provider} onValueChange={(val) => setProvider(val as 'tenor' | 'giphy')}>
          <TabsList>
            <TabsTrigger value="tenor">Tenor</TabsTrigger>
            <TabsTrigger value="giphy">Giphy</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative my-2">
          <SearchIcon size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="Rechercher un GIF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <GifGrid
          gifs={gifs}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onSelect={handleSelect}
          onLoadMore={handleLoadMore}
        />
        <p className="mt-1 text-center text-[10px] text-[var(--muted)]/50">
          Powered by {provider === 'tenor' ? 'Tenor' : 'GIPHY'}
        </p>
      </PopoverContent>
    </Popover>
  );
}

function GifGrid({
  gifs,
  isLoading,
  isLoadingMore,
  hasMore,
  onSelect,
  onLoadMore,
}: {
  gifs: GifResult[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onSelect: (gif: GifResult) => void;
  onLoadMore: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, onLoadMore]);

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2Icon size={24} className="animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  if (gifs.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center">
        <p className="text-sm text-[var(--muted)]">Aucun GIF trouvé</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-60">
      <div className="columns-2 gap-1">
        {gifs.map((gif) => (
          <button
            key={gif.id}
            type="button"
            className="mb-1 block w-full overflow-hidden rounded-lg transition-all duration-200 hover:opacity-80 hover:scale-[1.02]"
            onClick={() => onSelect(gif)}
          >
            <img
              src={gif.previewUrl}
              alt={gif.title}
              className="w-full rounded-lg"
              loading="lazy"
            />
          </button>
        ))}
      </div>
      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="flex h-8 items-center justify-center">
        {isLoadingMore && (
          <Loader2Icon size={18} className="animate-spin text-[var(--muted)]" />
        )}
      </div>
    </ScrollArea>
  );
}
