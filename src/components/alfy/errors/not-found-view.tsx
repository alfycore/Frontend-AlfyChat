'use client';

import '@/components/alfy/alfy-theme.css';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, Link } from '@heroui/react';
import { ArrowRight } from 'lucide-react';

import { AlfyMark } from '@/components/alfy/primitives/alfy-mark';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

/**
 * Vue 404 — texte à gauche, l'adresse demandée « décortiquée » à droite :
 * un 404 massif, puis le chemin segment par segment, le dernier barré.
 *
 * Mise en page pilotée par container queries plutôt que par le viewport :
 * la même vue sert en plein écran (`standalone`) et dans le panneau de
 * contenu du shell /channels, dont la largeur ne suit pas celle de l'écran.
 */

/** Segments affichés au maximum avant de replier le milieu du chemin. */
const MAX_SEGMENTS = 4;
/** Au-delà, un segment (souvent un ID) est abrégé au milieu. */
const MAX_SEGMENT_CHARS = 20;

function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function shorten(segment: string): string {
  if (segment.length <= MAX_SEGMENT_CHARS) return segment;
  return `${segment.slice(0, 10)}…${segment.slice(-6)}`;
}

/** Chemin découpé pour l'affichage : `null` marque un repli « … ». */
function pathSegments(pathname: string | null): (string | null)[] {
  const parts = (pathname ?? '').split('/').filter(Boolean).map(decodeSegment).map(shorten);
  if (parts.length <= MAX_SEGMENTS) return parts;
  return [parts[0], null, ...parts.slice(-(MAX_SEGMENTS - 2))];
}

export interface NotFoundAction {
  label: string;
  onPress: () => void;
}

export function NotFoundView({
  title,
  description,
  primary,
  secondary,
  standalone,
}: {
  title: string;
  description: string;
  primary: NotFoundAction;
  secondary?: NotFoundAction;
  /** Plein écran hors application : ajoute la marque en tête de colonne. */
  standalone?: boolean;
}) {
  const { t } = useTranslation();
  const nf = t.pages.notFound;
  const segments = pathSegments(usePathname());

  return (
    <div
      data-ui="alfy"
      className={cn(
        '@container bg-background text-foreground',
        standalone ? 'min-h-dvh' : 'h-full overflow-y-auto',
      )}
    >
      {/* Empilé : marque → visuel → texte. En deux colonnes, la marque et le
       * texte se partagent la gauche et le visuel occupe toute la droite. */}
      <div
        className={cn(
          'grid grid-rows-[auto_auto_1fr] @3xl:grid-cols-2 @3xl:grid-rows-[auto_1fr]',
          standalone ? 'min-h-dvh' : 'min-h-full',
        )}
      >
        {standalone && (
          <div className="px-8 pt-8 pb-2 @3xl:col-start-1 @3xl:row-start-1 @3xl:pb-0">
            <NextLink
              href="/"
              className="inline-flex items-center gap-2.5 opacity-90 transition-opacity hover:opacity-100"
            >
              <AlfyMark className="size-6" />
              <span className="font-heading text-sm font-medium tracking-wide">ALFYCHAT</span>
            </NextLink>
          </div>
        )}

        {/* Visuel — l'adresse demandée, décortiquée */}
        <div className="row-start-2 p-3 @3xl:col-start-2 @3xl:row-span-2 @3xl:row-start-1 @3xl:p-4">
          <div className="@container relative flex h-full min-h-64 flex-col justify-between gap-8 overflow-hidden rounded-2xl bg-surface-secondary p-6 @3xl:p-8">
            <p className="font-mono text-[11px] text-muted">{nf.requested}</p>

            <p
              aria-hidden
              className="nf-digits flex font-heading text-[34cqi] leading-[0.85] font-bold tracking-[-0.06em] select-none"
            >
              <span className="overflow-hidden pb-[0.04em]">
                <span className="nf-digit">4</span>
              </span>
              <span className="overflow-hidden pb-[0.04em]">
                <span className="nf-digit text-accent">0</span>
              </span>
              <span className="overflow-hidden pb-[0.04em]">
                <span className="nf-digit">4</span>
              </span>
            </p>

            {segments.length > 0 && (
              <p className="nf-path flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-sm">
                {segments.map((segment, i) => {
                  const last = i === segments.length - 1;
                  return (
                    <span key={i} className="inline-flex items-center gap-x-1.5">
                      <span className="text-muted/60">/</span>
                      {segment === null ? (
                        <span className="text-muted/60">…</span>
                      ) : (
                        <span
                          className={cn('break-all', last ? 'nf-strike text-muted' : 'text-foreground')}
                        >
                          {segment}
                        </span>
                      )}
                    </span>
                  );
                })}
                <span className="err-caret text-muted" aria-hidden>
                  |
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Texte */}
        <div className="row-start-3 flex min-w-0 items-start px-8 py-10 @3xl:col-start-1 @3xl:row-start-2 @3xl:items-center @3xl:px-12 @3xl:py-12 @5xl:px-16">
          <div className="nf-stagger flex max-w-md flex-col">
            <p className="font-mono text-xs text-accent">{nf.eyebrow}</p>

            <h1 className="mt-4 font-heading text-3xl leading-[1.1] font-bold tracking-tight text-balance @lg:text-4xl @5xl:text-5xl">
              {title}
            </h1>

            <p className="mt-4 text-[15px] leading-relaxed text-pretty text-muted">{description}</p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button onPress={primary.onPress}>{primary.label}</Button>
              {secondary && (
                <Link
                  onPress={secondary.onPress}
                  className="group gap-1.5 text-sm text-foreground hover:text-accent"
                >
                  {secondary.label}
                  <ArrowRight
                    className="size-3.5 transition-transform duration-(--dur-2) group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
