'use client';

import { Button, Popover, ScrollShadow, SearchField, Spinner, Tabs, Tooltip } from '@heroui/react';
import {
  Clock,
  Film,
  Flag,
  Hash,
  Leaf,
  Package,
  Plane,
  Search,
  Smile,
  SmilePlus,
  Sparkles,
  Trophy,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { api } from '@/lib/api';
import { getRecentEmojis, loadEmojiSet, recordRecentEmoji, type EmojiSection } from '@/components/alfy/chat/emoji-data';
import { searchGifs, trendingGifs, type GifResult } from '@/components/alfy/chat/tenor';
import { Twemoji } from '@/lib/twemoji';
import { cn } from '@/lib/utils';

const CATEGORY_ICON: Record<string, LucideIcon> = {
  Fréquents: Clock,
  'Visages & Personnes': Smile,
  'Animaux & Nature': Leaf,
  'Nourriture & Boissons': Utensils,
  Activités: Trophy,
  'Voyages & Lieux': Plane,
  Objets: Package,
  Symboles: Hash,
  Drapeaux: Flag,
  'Émoji du serveur': Sparkles,
};

interface ServerEmoji {
  id: string;
  name: string;
  imageUrl: string;
  animated: boolean;
}

interface HoverPreview {
  label: string;
  category: string;
  imageUrl?: string;
}

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  /** Insertion d'un GIF (URL directe) dans le message. */
  onPickGif?: (url: string) => void;
  /** Préférence « Afficher les autocollants et GIF » — masque l'onglet GIF. */
  showStickers?: boolean;
  /** Serveur courant — inclut ses émoji même s'ils sont réservés à lui-même. */
  serverId?: string;
}

export function EmojiPicker({ onPick, onPickGif, showStickers = true, serverId }: EmojiPickerProps) {
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'emoji' | 'gif'>('emoji');

  const [emojiSet, setEmojiSet] = useState<EmojiSection[] | null>(null);
  const [serverEmojis, setServerEmojis] = useState<ServerEmoji[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeCat, setActiveCat] = useState('');
  const [hovered, setHovered] = useState<HoverPreview | null>(null);

  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifNext, setGifNext] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const gifDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Chargement paresseux : le jeu complet (~1870 émoji) et les émoji serveur
  // ne sont récupérés qu'à la première ouverture du picker.
  useEffect(() => {
    if (!opened) return;
    if (!emojiSet) loadEmojiSet().then(setEmojiSet);
    setRecent(getRecentEmojis());
    api.getAvailableEmojis(serverId).then((res) => {
      if (res.success && res.data) setServerEmojis(res.data);
    });
  }, [opened, emojiSet, serverId]);

  // GIF tendance à la première ouverture de l'onglet.
  useEffect(() => {
    if (!opened || tab !== 'gif' || gifs.length > 0 || gifLoading) return;
    setGifLoading(true);
    trendingGifs().then(({ gifs: g, next }) => {
      setGifs(g);
      setGifNext(next);
      setGifLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, tab]);

  // Recherche GIF — débattue, remplace la liste (pas de pagination pour rester simple).
  useEffect(() => {
    if (!opened || tab !== 'gif') return;
    if (gifDebounce.current) clearTimeout(gifDebounce.current);
    gifDebounce.current = setTimeout(() => {
      setGifLoading(true);
      const fetcher = query.trim() ? searchGifs(query.trim()) : trendingGifs();
      fetcher.then(({ gifs: g, next }) => {
        setGifs(g);
        setGifNext(next);
        setGifLoading(false);
      });
    }, 350);
    return () => {
      if (gifDebounce.current) clearTimeout(gifDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tab, opened]);

  const recentSection: EmojiSection | null = recent.length > 0 ? { category: 'Fréquents', emojis: recent } : null;
  const allSections = useMemo(
    () => (recentSection ? [recentSection, ...(emojiSet ?? [])] : (emojiSet ?? [])),
    [recentSection, emojiSet],
  );

  const searching = query.trim().length > 0;
  const q = query.trim().toLowerCase();

  const emojiSections = useMemo(() => {
    if (!searching || tab !== 'emoji') return allSections;
    // Pas de mots-clés par émoji chargés (dataset allégé) — on filtre par
    // catégorie, et la recherche par mot-clé complet reste possible côté GIF.
    return allSections.filter((s) => s.category.toLowerCase().includes(q));
  }, [allSections, searching, q, tab]);

  const filteredServerEmojis = useMemo(() => {
    if (!searching) return serverEmojis;
    return serverEmojis.filter((e) => e.name.toLowerCase().includes(q));
  }, [serverEmojis, searching, q]);

  const jumpTo = (category: string) => {
    const el = sectionRefs.current[category];
    const container = scrollRef.current;
    if (el && container) {
      container.scrollTo({ top: el.offsetTop - 4, behavior: 'smooth' });
      setActiveCat(category);
    }
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const top = container.scrollTop + 8;
    let current = emojiSections[0]?.category ?? '';
    for (const section of emojiSections) {
      const el = sectionRefs.current[section.category];
      if (el && el.offsetTop <= top) current = section.category;
    }
    if (filteredServerEmojis.length > 0) {
      const el = sectionRefs.current['Émoji du serveur'];
      if (el && el.offsetTop <= top) current = 'Émoji du serveur';
    }
    setActiveCat(current);
  };

  const pick = (emoji: string) => {
    recordRecentEmoji(emoji);
    onPick(emoji);
  };

  return (
    <Popover isOpen={opened} onOpenChange={setOpened}>
      <Tooltip delay={300}>
        <Button isIconOnly size="sm" variant="ghost" aria-label="Emoji et GIF" className="text-muted">
          <SmilePlus className="size-4.5" />
        </Button>
        <Tooltip.Content>
          <p>Emoji et GIF</p>
        </Tooltip.Content>
      </Tooltip>
      <Popover.Content className="w-90 p-0">
        <Popover.Dialog aria-label="Emoji et GIF" className="flex h-108 flex-col overflow-hidden p-0">
          <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as 'emoji' | 'gif')} variant="secondary" className="flex min-h-0 flex-1 flex-col">
            {/* Barre : recherche + bascule Emoji/GIF */}
            <div className="flex shrink-0 items-center gap-2 border-b border-separator p-2">
              <SearchField value={query} onChange={setQuery} aria-label="Chercher" className="flex-1">
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder={tab === 'gif' ? 'Chercher un GIF…' : 'Chercher…'} />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
              <Tabs.ListContainer>
                <Tabs.List aria-label="Emoji ou GIF" className="gap-0.5">
                  <Tabs.Tab id="emoji" aria-label="Emoji" className="px-2 py-1">
                    <Smile className="size-4" aria-hidden />
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  {showStickers && (
                    <Tabs.Tab id="gif" aria-label="GIF" className="px-2 py-1">
                      <Film className="size-4" aria-hidden />
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  )}
                </Tabs.List>
              </Tabs.ListContainer>
            </div>

            {/* Emoji : rail de catégories + grille + aperçu */}
            <Tabs.Panel id="emoji" className="flex min-h-0 flex-1">
              {!emojiSet ? (
                <div className="flex flex-1 items-center justify-center">
                  <Spinner size="sm" />
                </div>
              ) : (
                <>
                  {!searching && (
                    <div className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-separator py-2">
                      {allSections.map((section) => {
                        const Icon = CATEGORY_ICON[section.category] ?? Smile;
                        const active = section.category === activeCat;
                        return (
                          <Tooltip key={section.category} delay={300}>
                            <button
                              type="button"
                              aria-label={section.category}
                              aria-current={active ? 'true' : undefined}
                              onClick={() => jumpTo(section.category)}
                              className={cn(
                                'flex size-8 cursor-pointer items-center justify-center rounded-md outline-none transition-colors',
                                'focus-visible:ring-2 focus-visible:ring-focus',
                                active
                                  ? 'bg-(--accent)/15 text-accent'
                                  : 'text-muted hover:bg-surface-secondary hover:text-foreground',
                              )}
                            >
                              <Icon className="size-4" aria-hidden />
                            </button>
                            <Tooltip.Content placement="right">
                              <p>{section.category}</p>
                            </Tooltip.Content>
                          </Tooltip>
                        );
                      })}
                      {filteredServerEmojis.length > 0 && (
                        <Tooltip delay={300}>
                          <button
                            type="button"
                            aria-label="Émoji du serveur"
                            aria-current={activeCat === 'Émoji du serveur' ? 'true' : undefined}
                            onClick={() => jumpTo('Émoji du serveur')}
                            className={cn(
                              'flex size-8 cursor-pointer items-center justify-center rounded-md outline-none transition-colors',
                              'focus-visible:ring-2 focus-visible:ring-focus',
                              activeCat === 'Émoji du serveur'
                                ? 'bg-(--accent)/15 text-accent'
                                : 'text-muted hover:bg-surface-secondary hover:text-foreground',
                            )}
                          >
                            <Sparkles className="size-4" aria-hidden />
                          </button>
                          <Tooltip.Content placement="right">
                            <p>Émoji du serveur</p>
                          </Tooltip.Content>
                        </Tooltip>
                      )}
                    </div>
                  )}

                  <div className="flex min-w-0 flex-1 flex-col">
                    <ScrollShadow
                      ref={scrollRef}
                      onScroll={handleScroll}
                      orientation="vertical"
                      className="min-h-0 flex-1 overflow-y-auto px-3 py-2"
                    >
                      {emojiSections.length === 0 && filteredServerEmojis.length === 0 && (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted">
                          <Search className="size-5" aria-hidden />
                          <p className="text-xs">Aucun emoji ne correspond</p>
                        </div>
                      )}
                      {filteredServerEmojis.length > 0 && (
                        <div
                          ref={(el) => {
                            sectionRefs.current['Émoji du serveur'] = el;
                          }}
                          className="mb-2"
                        >
                          <p className="sticky top-0 z-10 -mx-3 mb-1 bg-overlay/95 px-3 py-1 text-[11px] font-semibold tracking-wider text-muted uppercase backdrop-blur-sm">
                            Émoji du serveur
                          </p>
                          <div className="grid grid-cols-8 gap-0.5">
                            {filteredServerEmojis.map((e) => (
                              <button
                                key={e.id}
                                type="button"
                                aria-label={`Emoji :${e.name}:`}
                                onClick={() => pick(`:${e.name}:`)}
                                onMouseEnter={() => setHovered({ label: `:${e.name}:`, category: 'Émoji du serveur', imageUrl: e.imageUrl })}
                                onFocus={() => setHovered({ label: `:${e.name}:`, category: 'Émoji du serveur', imageUrl: e.imageUrl })}
                                className="flex size-9 cursor-pointer items-center justify-center rounded-md p-1.5 outline-none transition-transform hover:scale-115 hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={e.imageUrl} alt={e.name} className="size-full object-contain" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {emojiSections.map((section) => (
                        <div
                          key={section.category}
                          ref={(el) => {
                            sectionRefs.current[section.category] = el;
                          }}
                          className="mb-2"
                        >
                          <p className="sticky top-0 z-10 -mx-3 mb-1 bg-overlay/95 px-3 py-1 text-[11px] font-semibold tracking-wider text-muted uppercase backdrop-blur-sm">
                            {section.category}
                          </p>
                          <div className="grid grid-cols-8 gap-0.5">
                            {section.emojis.map((e, i) => (
                              <button
                                key={`${section.category}-${i}`}
                                type="button"
                                aria-label={`Emoji ${e}`}
                                onClick={() => pick(e)}
                                onMouseEnter={() => setHovered({ label: e, category: section.category })}
                                onFocus={() => setHovered({ label: e, category: section.category })}
                                className="flex size-9 cursor-pointer items-center justify-center rounded-md outline-none transition-transform hover:scale-115 hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
                              >
                                <Twemoji emoji={e} size={24} />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </ScrollShadow>

                    {/* Aperçu de l'emoji survolé */}
                    <div className="flex h-11 shrink-0 items-center gap-2.5 border-t border-separator px-3">
                      {hovered ? (
                        <>
                          {hovered.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={hovered.imageUrl} alt="" className="size-6 object-contain" />
                          ) : (
                            <Twemoji emoji={hovered.label} size={24} />
                          )}
                          <span className="truncate text-xs text-muted">{hovered.category}</span>
                        </>
                      ) : (
                        <span className="text-xs text-muted">Survolez un emoji pour l’aperçu</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </Tabs.Panel>

            {/* GIF — recherche/tendances via l'API Tenor */}
            <Tabs.Panel id="gif" className={cn('flex min-h-0 flex-1 flex-col', !showStickers && 'hidden')}>
              <ScrollShadow orientation="vertical" className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                {gifLoading && gifs.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <Spinner size="sm" />
                  </div>
                ) : gifs.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted">
                    <Search className="size-5" aria-hidden />
                    <p className="text-xs">Aucun GIF ne correspond</p>
                  </div>
                ) : (
                  <div className="columns-2 gap-1.5">
                    {gifs.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        aria-label={`Envoyer le GIF ${g.title || 'sans titre'}`}
                        onClick={() => onPickGif?.(g.url)}
                        className="group/gif relative mb-1.5 block w-full cursor-pointer overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={g.previewUrl}
                          alt={g.title}
                          width={g.width}
                          height={g.height}
                          loading="lazy"
                          className="h-auto w-full object-cover transition-transform duration-200 group-hover/gif:scale-105"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </ScrollShadow>
              {gifNext && gifs.length > 0 && (
                <div className="flex shrink-0 justify-center border-t border-separator py-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    isDisabled={gifLoading}
                    onPress={() => {
                      setGifLoading(true);
                      const fetcher = query.trim() ? searchGifs(query.trim(), gifNext) : trendingGifs(gifNext);
                      fetcher.then(({ gifs: g, next }) => {
                        setGifs((prev) => [...prev, ...g]);
                        setGifNext(next);
                        setGifLoading(false);
                      });
                    }}
                  >
                    {gifLoading ? <Spinner size="sm" /> : 'Charger plus'}
                  </Button>
                </div>
              )}
              <p className="shrink-0 border-t border-separator py-1 text-center text-[10px] text-muted/60">Powered by Tenor</p>
            </Tabs.Panel>
          </Tabs>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
