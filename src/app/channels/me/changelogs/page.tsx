'use client';

import {
  Button,
  Chip,
  EmptyState,
  ScrollShadow,
  SearchField,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react';
import { ArrowLeft, Flame, Megaphone, Menu, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';

import { MarkdownRenderer } from '@/components/chat/markdown-renderer';
import { useTranslation } from '@/components/locale-provider';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { api, resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface FeedEntry {
  id: string;
  version: string;
  title: string;
  content: string;
  type: 'feature' | 'fix' | 'improvement' | 'security' | 'breaking' | 'news';
  banner_url?: string | null;
  author_username?: string | null;
  created_at: string;
}

type FilterType = 'all' | FeedEntry['type'];

/* ── Config ─────────────────────────────────────────────────────────────────
 * Chaque type emprunte une couleur sémantique du thème (accent / success /
 * warning / danger) : la page suit donc automatiquement la palette choisie,
 * au lieu de figer des couleurs Tailwind.
 * ───────────────────────────────────────────────────────────────────────── */

type ChipColor = 'accent' | 'success' | 'warning' | 'danger';

const TYPE_CFG: Record<FeedEntry['type'], { color: ChipColor; icon: LucideIcon; token: string }> = {
  news: { color: 'accent', icon: Megaphone, token: 'var(--accent)' },
  feature: { color: 'success', icon: Sparkles, token: 'var(--success)' },
  improvement: { color: 'accent', icon: Zap, token: 'var(--accent)' },
  fix: { color: 'warning', icon: Flame, token: 'var(--warning)' },
  security: { color: 'danger', icon: ShieldCheck, token: 'var(--danger)' },
  breaking: { color: 'danger', icon: Flame, token: 'var(--danger)' },
};

const FILTER_KEYS: FilterType[] = ['all', 'news', 'feature', 'improvement', 'fix', 'security', 'breaking'];

/* ── Composant ──────────────────────────────────────────────────────────── */

export default function ChangelogsPage() {
  const router = useRouter();
  const { isMobile, toggleSidebar } = useMobileNav();
  const { t, locale } = useTranslation();
  const cl = t.changelogs;

  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState<FilterType>('all');

  useEffect(() => {
    let annule = false;
    api
      .getChangelogs(200, 0)
      .then((res) => {
        if (annule) return;
        const raw = res.data as unknown;
        const liste: FeedEntry[] = Array.isArray(raw)
          ? (raw as FeedEntry[])
          : Array.isArray((raw as { changelogs?: FeedEntry[] })?.changelogs)
            ? ((raw as { changelogs: FeedEntry[] }).changelogs)
            : Array.isArray((raw as { data?: FeedEntry[] })?.data)
              ? ((raw as { data: FeedEntry[] }).data)
              : [];
        setEntries(liste);
      })
      .catch(() => {
        if (!annule) setEntries([]);
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });
    return () => {
      annule = true;
    };
  }, []);

  const comptes = useMemo(() => {
    const m: Record<string, number> = { all: entries.length };
    for (const e of entries) m[e.type] = (m[e.type] ?? 0) + 1;
    return m;
  }, [entries]);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return entries.filter((e) => {
      if (filtre !== 'all' && e.type !== filtre) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.version.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q)
      );
    });
  }, [entries, recherche, filtre]);

  const libelleType = (type: FeedEntry['type']) =>
    (
      {
        news: cl.typeNews,
        feature: cl.typeNew,
        improvement: cl.typeImprovement,
        fix: cl.typeFix,
        security: cl.typeSecurity,
        breaking: cl.typeBreaking,
      } as Record<string, string>
    )[type] ?? type;

  const libelleFiltre = (type: FilterType) =>
    (
      {
        all: cl.filterAllShort,
        news: (cl as Record<string, string>).filterNews ?? cl.typeNews,
        feature: cl.typeNew,
        improvement: cl.typeImprovement,
        fix: cl.typeFix,
        security: cl.typeSecurity,
        breaking: cl.typeBreakingShort,
      } as Record<string, string>
    )[type] ?? type;

  const filtrePose = recherche.trim() !== '' || filtre !== 'all';

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* ── Barre de navigation ─────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center gap-2 bg-surface px-3">
        {isMobile && (
          <Button isIconOnly variant="ghost" aria-label="Ouvrir la navigation" onPress={toggleSidebar}>
            <Menu className="size-4.5" />
          </Button>
        )}
        <Button isIconOnly variant="ghost" aria-label="Retour" onPress={() => router.back()}>
          <ArrowLeft className="size-4.5" />
        </Button>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-muted" aria-hidden />
          <span className="truncate text-sm font-semibold">{cl.title}</span>
        </span>
        {!chargement && entries.length > 0 && (
          <Chip size="sm" variant="soft" className="cursor-default tabular-nums">
            <Chip.Label>{entries.length}</Chip.Label>
          </Chip>
        )}
      </header>

      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto" orientation="vertical">
        <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
          {/* ── Titre éditorial ───────────────────────────────────── */}
          <div className="at-fade-up mb-8">
            <h1 className="font-heading text-3xl leading-tight tracking-tighter sm:text-4xl">
              {cl.title}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
              Tout ce qui change dans AlfyChat, version après version.
            </p>
          </div>

          {/* ── Recherche + filtres ───────────────────────────────── */}
          {(!chargement && entries.length > 0) && (
            <div
              className="at-fade-up mb-8 flex flex-col gap-4"
              style={{ animationDelay: '40ms' } as CSSProperties}
            >
              <SearchField
                value={recherche}
                onChange={setRecherche}
                aria-label={cl.searchPlaceholder}
                className="w-full sm:max-w-xs"
              >
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder={cl.searchPlaceholder} />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>

              <ToggleButtonGroup
                isDetached
                aria-label="Filtrer par type"
                selectionMode="single"
                disallowEmptySelection
                selectedKeys={[filtre]}
                onSelectionChange={(cles) => {
                  const [premiere] = [...(cles as Iterable<string>)];
                  if (premiere) setFiltre(premiere as FilterType);
                }}
                className="flex w-full flex-wrap gap-2"
              >
                {FILTER_KEYS.filter((type) => type === 'all' || (comptes[type] ?? 0) > 0).map((type) => (
                  <ToggleButton key={type} id={type} size="sm">
                    {libelleFiltre(type)}
                    <span className="ml-1 text-[10px] tabular-nums opacity-60">
                      {comptes[type] ?? 0}
                    </span>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </div>
          )}

          {/* ── Chargement ────────────────────────────────────────── */}
          {chargement ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-3xl bg-surface">
                  <Skeleton className="h-32 w-full" />
                  <div className="p-6">
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-24 rounded-full" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                    <Skeleton className="mt-4 h-5 w-2/3 rounded-lg" />
                    <Skeleton className="mt-3 h-3 w-full rounded-lg" />
                    <Skeleton className="mt-1.5 h-3 w-4/5 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtres.length === 0 ? (
            /* ── Vide ────────────────────────────────────────────── */
            <EmptyState className="flex flex-col items-center gap-4 rounded-3xl bg-surface px-6 py-20 text-center">
              <span className="flex size-16 items-center justify-center rounded-3xl bg-surface-2">
                <Sparkles className="size-7 text-muted" aria-hidden />
              </span>
              <span>
                <span className="block text-base font-semibold">
                  {filtrePose ? cl.noResultsShort : cl.noChangelogsShort}
                </span>
                <span className="mt-1 block text-sm text-muted">
                  {filtrePose ? cl.noResultsHint : cl.comingSoonShort}
                </span>
              </span>
              {filtrePose && (
                <Button
                  variant="secondary"
                  onPress={() => {
                    setRecherche('');
                    setFiltre('all');
                  }}
                >
                  {cl.clearFilters}
                </Button>
              )}
            </EmptyState>
          ) : (
            /* ── Fil ─────────────────────────────────────────────── */
            <div className="flex flex-col gap-5">
              {filtres.map((entry, i) => {
                const cfg = TYPE_CFG[entry.type] ?? TYPE_CFG.feature;
                const Icon = cfg.icon;
                const derniere = i === 0 && filtre === 'all' && recherche.trim() === '';
                const banniere = entry.banner_url
                  ? (resolveMediaUrl(entry.banner_url) ?? entry.banner_url)
                  : null;

                return (
                  <article
                    key={entry.id}
                    className={cn(
                      'at-fade-up overflow-hidden rounded-3xl bg-surface',
                      'transition-transform duration-300 ease-out hover:-translate-y-0.5 hover:shadow-xl',
                    )}
                    style={{ animationDelay: `${Math.min(i, 8) * 50 + 80}ms` } as CSSProperties}
                  >
                    {banniere && (
                      <img src={banniere} alt="" className="max-h-48 w-full object-cover" />
                    )}

                    <div className="p-6">
                      {/* Type, version, date */}
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <Chip size="sm" color={cfg.color} variant="soft" className="cursor-default">
                          <Icon className="size-3" aria-hidden />
                          <Chip.Label>{libelleType(entry.type)}</Chip.Label>
                        </Chip>

                        {entry.version && (
                          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-[11px] text-muted">
                            v{entry.version}
                          </span>
                        )}

                        {derniere && (
                          <Chip size="sm" color="accent" className="cursor-default">
                            <Chip.Label>{cl.latestVersion}</Chip.Label>
                          </Chip>
                        )}

                        <time
                          dateTime={entry.created_at}
                          className="ml-auto shrink-0 text-[11px] tabular-nums text-muted"
                        >
                          {new Date(entry.created_at).toLocaleDateString(locale, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </time>
                      </div>

                      {/* Titre, souligné par la couleur du type */}
                      <h2 className="flex items-start gap-3 text-lg leading-snug font-bold tracking-tight">
                        <span
                          className="mt-2 block size-1.5 shrink-0 rounded-full"
                          style={{ background: cfg.token }}
                          aria-hidden
                        />
                        {entry.title}
                      </h2>

                      <div className="mt-3 pl-4.5 text-sm leading-relaxed wrap-anywhere text-muted">
                        <MarkdownRenderer content={entry.content} />
                      </div>

                      {entry.author_username && (
                        <p className="mt-5 pl-4.5 text-[11px] text-muted">
                          {cl.publishedBy}{' '}
                          <span className="font-medium text-foreground/70">@{entry.author_username}</span>
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </ScrollShadow>
    </div>
  );
}
