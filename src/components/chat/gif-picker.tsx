'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { SearchIcon, Loader2Icon } from '@/components/icons';
import { InputGroup, Popover, ScrollShadow, Tabs } from '@heroui/react';

// Clés API publiques (rate-limited, usage frontend uniquement)
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
const GIPHY_API_KEY = 'dc6zaTOxFJmzC';

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
  const [provider, setProvider] = useState<'tenor' | 'giphy'>('tenor');
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  const fetchTenorGifs = useCallback(async (query: string) => {
    try {
      const endpoint = query
        ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=20&media_filter=gif,tinygif`
        : `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=20&media_filter=gif,tinygif`;

      const res = await fetch(endpoint);
      const data = await res.json();

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

  const fetchGiphyGifs = useCallback(async (query: string) => {
    try {
      const endpoint = query
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`;

      const res = await fetch(endpoint);
      const data = await res.json();

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
    async (query: string) => {
      setIsLoading(true);
      const results =
        provider === 'tenor' ? await fetchTenorGifs(query) : await fetchGiphyGifs(query);
      setGifs(results);
      setIsLoading(false);
    },
    [provider, fetchTenorGifs, fetchGiphyGifs]
  );

  useEffect(() => {
    if (open) {
      loadGifs('');
      setSearch('');
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

  const handleSelect = (gif: GifResult) => {
    onSelect(gif.url);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger>{children}</Popover.Trigger>
      <Popover.Content placement="top end" className="w-96 overflow-hidden rounded-xl border-[var(--border)]/60 bg-[var(--surface)]/95 p-3 shadow-2xl backdrop-blur-xl">
        <Tabs
          selectedKey={provider}
          onSelectionChange={(key) => setProvider(key as 'tenor' | 'giphy')}
        >
          <Tabs.List>
            <Tabs.Tab id="tenor">Tenor</Tabs.Tab>
            <Tabs.Tab id="giphy">Giphy</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <div className="relative my-2">
          <InputGroup className="rounded-lg border-[var(--border)]/60 bg-[var(--background)]/60 backdrop-blur-sm">
            <InputGroup.Prefix>
              <HugeiconsIcon icon={SearchIcon} size={16} className="text-[var(--muted)]/60" />
            </InputGroup.Prefix>
            <InputGroup.Input
              placeholder="Rechercher un GIF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>

        <GifGrid gifs={gifs} isLoading={isLoading} onSelect={handleSelect} />
        <p className="mt-1 text-center text-[10px] text-[var(--muted)]/50">
          Powered by {provider === 'tenor' ? 'Tenor' : 'GIPHY'}
        </p>
      </Popover.Content>
    </Popover>
  );
}

function GifGrid({
  gifs,
  isLoading,
  onSelect,
}: {
  gifs: GifResult[];
  isLoading: boolean;
  onSelect: (gif: GifResult) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <HugeiconsIcon icon={Loader2Icon} size={24} className="animate-spin text-[var(--muted)]" />
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
    <ScrollShadow className="h-60">
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
    </ScrollShadow>
  );
}
