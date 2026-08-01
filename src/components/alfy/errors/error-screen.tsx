'use client';

import '@/components/alfy/alfy-theme.css';

import { useEffect, useState } from 'react';
import { Hash, Lock } from 'lucide-react';

import { AlfyMark } from '@/components/alfy/primitives/alfy-mark';
import { cn } from '@/lib/utils';

/**
 * Écran d'erreur présenté comme un message reçu dans un salon.
 *
 * Plutôt qu'une page générique, l'incident est annoncé par Alfy dans un fil :
 * le vocabulaire visuel reste celui du produit et les recours deviennent des
 * réponses rapides. Tout est scopé `data-ui="alfy"` — donc rendu dans la
 * vraie DA (violet #7627FF, neutres propres, clair/sombre) où qu'il soit monté.
 */

export type ErrorTone = 'danger' | 'accent';

const TONES: Record<ErrorTone, { chip: string; avatar: string; halo: string }> = {
  danger: {
    chip: 'border-danger/30 bg-danger/10 text-danger',
    avatar: 'ring-danger/25 bg-danger/10',
    halo: 'bg-danger/12',
  },
  accent: {
    chip: 'border-accent/30 bg-accent/10 text-accent',
    avatar: 'ring-accent/25 bg-accent/10',
    halo: 'bg-accent/12',
  },
};

/** Durée de la frappe simulée avant l'apparition du message. */
const TYPING_MS = 520;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ErrorScreen({
  code,
  channel,
  title,
  message,
  tone = 'accent',
  reference,
  actions,
  /** Version compacte, pour un écran déjà encadré par la coquille de l'app. */
  compact,
}: {
  /** Code affiché en tête de salon — « 404 », « 500 »… */
  code: string;
  /** Nom du salon fictif dans lequel arrive le message. */
  channel: string;
  title: string;
  message: React.ReactNode;
  tone?: ErrorTone;
  /** Identifiant technique de l'incident, s'il existe. */
  reference?: string;
  /** Recours proposés, rendus comme des réponses rapides. */
  actions?: React.ReactNode;
  compact?: boolean;
}) {
  // Le message se révèle après une frappe simulée — sautée si l'utilisateur
  // a demandé moins d'animations.
  const [delivered, setDelivered] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDelivered(true);
      return;
    }
    const timer = setTimeout(() => setDelivered(true), TYPING_MS);
    return () => clearTimeout(timer);
  }, []);

  const t = TONES[tone];
  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      data-ui="alfy"
      className={cn(
        'err-thread relative w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-black/5',
        compact ? 'max-w-lg' : 'max-w-xl',
      )}
    >
      {/* Halo diffus, teinté par le ton, posé derrière l'en-tête */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full blur-3xl',
          t.halo,
        )}
      />

      {/* En-tête de salon */}
      <header className="relative flex items-center gap-2 border-b border-separator px-4 py-3">
        <Hash className="size-4 shrink-0 text-muted" aria-hidden />
        <span className="truncate text-sm font-medium text-foreground">{channel}</span>
        <span
          className={cn(
            'ml-auto shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold',
            t.chip,
          )}
        >
          {code}
        </span>
      </header>

      {/* Fil */}
      <div className={cn('relative px-4', compact ? 'py-5' : 'py-7')}>
        <div className="flex gap-3">
          {/* Avatar système — vrai logo de marque */}
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset',
              t.avatar,
            )}
            aria-hidden
          >
            <AlfyMark className="size-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground">Alfy</span>
              <span className="rounded-md bg-accent/12 px-1.5 py-px text-[10px] font-semibold tracking-wide text-accent uppercase">
                Système
              </span>
              <span className="text-[11px] text-muted tabular-nums">{now}</span>
            </div>

            {!delivered ? (
              /* Frappe en cours */
              <div className="mt-2 flex h-6 items-center gap-1" aria-hidden>
                <span className="err-typing-dot size-1.5 rounded-full bg-muted" />
                <span className="err-typing-dot size-1.5 rounded-full bg-muted" />
                <span className="err-typing-dot size-1.5 rounded-full bg-muted" />
              </div>
            ) : (
              <div className="err-message mt-1">
                <p
                  className={cn(
                    'font-heading tracking-tight text-foreground',
                    compact ? 'text-lg' : 'text-xl',
                  )}
                >
                  {title}
                </p>
                <div className="mt-1.5 text-sm leading-relaxed text-muted">{message}</div>

                {reference && (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface-secondary px-2.5 py-1.5 font-mono text-[11px] text-muted">
                    <span className="text-muted/60">réf</span>
                    {reference}
                  </p>
                )}

                {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zone de saisie inerte — la conversation ne se poursuit pas ici */}
      <div className="flex items-center gap-2 border-t border-separator bg-surface-secondary/60 px-4 py-3">
        <Lock className="size-3.5 shrink-0 text-(--alfy-e2e)" aria-hidden />
        <span className="flex-1 truncate text-sm text-muted">
          Envoyer un message dans #{channel}
          <span className="err-caret ml-px inline-block text-muted">|</span>
        </span>
        <span className="shrink-0 text-[11px] text-muted/70">lecture seule</span>
      </div>
    </div>
  );
}

/**
 * Mise en page plein écran des erreurs hors application : fil centré, vraie
 * marque au-dessus, fond ambiant discret et ligne de confiance en pied.
 * Porte `data-ui="alfy"` : la page entière est rendue dans la DA alfy.
 */
export function ErrorPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-ui="alfy"
      className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-background px-5 py-12 text-foreground"
    >
      {/* Fond ambiant — halos violets très diffus, neutres par ailleurs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 size-96 rounded-full bg-accent/8 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-32 size-96 rounded-full bg-accent/6 blur-3xl"
      />

      <a
        href="/"
        className="alfy-enter relative flex items-center gap-2.5 text-foreground/80 transition-colors hover:text-foreground"
      >
        <AlfyMark className="size-7" />
        <span className="font-heading text-sm tracking-tight">AlfyChat</span>
      </a>

      <div className="relative">{children}</div>

      <p className="relative flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center font-mono text-[10px] text-muted/60">
        <span className="inline-flex items-center gap-1 text-(--alfy-e2e)">
          <Lock className="size-2.5" aria-hidden />
          Chiffré de bout en bout
        </span>
        <span aria-hidden>·</span>
        <span>Hébergé en France</span>
        <span aria-hidden>·</span>
        <span>Open source</span>
      </p>
    </div>
  );
}
