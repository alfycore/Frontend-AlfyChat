'use client';

import { Button, Popover, ScrollShadow, SearchField, Tabs, Tooltip } from '@heroui/react';
import {
  Clock,
  Film,
  Hand,
  Leaf,
  Package,
  Search,
  Smile,
  SmilePlus,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { EMOJI_SET, GIF_CATEGORIES } from '@/components/alfy/mock/data';
import { cn } from '@/lib/utils';

const CATEGORY_ICON: Record<string, LucideIcon> = {
  Fréquents: Clock,
  Visages: Smile,
  Gestes: Hand,
  Objets: Package,
  Nature: Leaf,
};

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  /** Insertion d'un lien GIF (mock) dans le message. */
  onPickGif?: (url: string) => void;
  /** Préférence « Afficher les autocollants et GIF » — masque l'onglet GIF. */
  showStickers?: boolean;
}

export function EmojiPicker({ onPick, onPickGif, showStickers = true }: EmojiPickerProps) {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState(EMOJI_SET[0]?.category ?? '');
  const [hovered, setHovered] = useState<{ emoji: string; category: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const searching = query.trim().length > 0;

  const emojiSections = useMemo(() => {
    if (!searching) return EMOJI_SET;
    const q = query.toLowerCase();
    return EMOJI_SET.map((s) => ({
      ...s,
      emojis: s.category.toLowerCase().includes(q) ? s.emojis : [],
    })).filter((s) => s.emojis.length > 0);
  }, [query, searching]);

  const gifSections = useMemo(() => {
    if (!searching) return GIF_CATEGORIES;
    const q = query.toLowerCase();
    return GIF_CATEGORIES.map((s) => ({
      ...s,
      gifs: s.gifs.filter((g) => g.label.toLowerCase().includes(q)),
    })).filter((s) => s.gifs.length > 0);
  }, [query, searching]);

  const jumpTo = (category: string) => {
    const el = sectionRefs.current[category];
    const container = scrollRef.current;
    if (el && container) {
      container.scrollTo({ top: el.offsetTop - 4, behavior: 'smooth' });
      setActiveCat(category);
    }
  };

  // Scroll-spy : la catégorie active suit le défilement.
  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const top = container.scrollTop + 8;
    let current = emojiSections[0]?.category ?? '';
    for (const section of emojiSections) {
      const el = sectionRefs.current[section.category];
      if (el && el.offsetTop <= top) current = section.category;
    }
    setActiveCat(current);
  };

  return (
    <Popover>
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
          <Tabs defaultSelectedKey="emoji" variant="secondary" className="flex min-h-0 flex-1 flex-col">
            {/* Barre : recherche + bascule Emoji/GIF */}
            <div className="flex shrink-0 items-center gap-2 border-b border-separator p-2">
              <SearchField value={query} onChange={setQuery} aria-label="Chercher" className="flex-1">
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Chercher…" />
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
              {!searching && (
                <div className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-separator py-2">
                  {EMOJI_SET.map((section) => {
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
                          <p className="capitalize">{section.category}</p>
                        </Tooltip.Content>
                      </Tooltip>
                    );
                  })}
                </div>
              )}

              <div className="flex min-w-0 flex-1 flex-col">
                <ScrollShadow
                  ref={scrollRef}
                  onScroll={handleScroll}
                  orientation="vertical"
                  className="min-h-0 flex-1 overflow-y-auto px-3 py-2"
                >
                  {emojiSections.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted">
                      <Search className="size-5" aria-hidden />
                      <p className="text-xs">Aucun emoji ne correspond</p>
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
                            onClick={() => onPick(e)}
                            onMouseEnter={() => setHovered({ emoji: e, category: section.category })}
                            onFocus={() => setHovered({ emoji: e, category: section.category })}
                            className="flex size-9 cursor-pointer items-center justify-center rounded-md text-xl outline-none transition-transform hover:scale-115 hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
                          >
                            {e}
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
                      <span className="text-2xl leading-none">{hovered.emoji}</span>
                      <span className="truncate text-xs text-muted">{hovered.category}</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted">Survolez un emoji pour l’aperçu</span>
                  )}
                </div>
              </div>
            </Tabs.Panel>

            {/* GIF : masonry */}
            <Tabs.Panel id="gif" className={cn('min-h-0 flex-1', !showStickers && 'hidden')}>
              <ScrollShadow orientation="vertical" className="h-full overflow-y-auto px-3 py-2">
                {gifSections.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted">
                    <Search className="size-5" aria-hidden />
                    <p className="text-xs">Aucun GIF ne correspond</p>
                  </div>
                )}
                {gifSections.map((section) => (
                  <div key={section.category} className="mb-3">
                    <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
                      {section.category}
                    </p>
                    <div className="columns-2 gap-1.5">
                      {section.gifs.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          aria-label={`Envoyer le GIF ${g.label}`}
                          onClick={() => onPickGif?.(g.url)}
                          className="group/gif relative mb-1.5 block w-full cursor-pointer overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        >
                          <img
                            src={g.url}
                            alt={g.label}
                            width={g.width}
                            height={g.height}
                            loading="lazy"
                            className="h-auto w-full object-cover transition-transform duration-200 group-hover/gif:scale-105"
                          />
                          <span className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/70 to-transparent px-2 pt-4 pb-1 text-left text-[10px] font-medium text-white opacity-0 transition-opacity group-hover/gif:opacity-100">
                            {g.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </ScrollShadow>
            </Tabs.Panel>
          </Tabs>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
