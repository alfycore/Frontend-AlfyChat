import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface LegalSection {
  heading: string;
  body: React.ReactNode;
}

/**
 * Rendu d'un document légal — mise en page éditoriale, statique et lisible.
 * En-tête sobre, sommaire cliquable (ancres internes), sections numérotées
 * séparées par des filets. Entièrement piloté par les variables de thème.
 */
export function LegalPage({
  icon: Icon,
  title,
  subtitle,
  updatedAt,
  sections,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <article className="mx-auto max-w-2xl px-6 py-10">

        {/* ── En-tête ── */}
        <header className="border-b border-border/50 pb-8">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Icon size={20} />
          </div>
          <h1 className="mt-5 font-heading text-2xl leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] tabular-nums text-muted-foreground/60">
            <span className="size-1.5 rounded-full bg-green-500" />
            Dernière mise à jour&nbsp;: {updatedAt}
          </p>
        </header>

        {/* ── Sommaire ── */}
        <nav aria-label="Sommaire" className="border-b border-border/50 py-8">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Sommaire
          </p>
          <ol className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={i}>
                <a
                  href={`#sec-${i + 1}`}
                  className="group flex items-baseline gap-2.5 text-[13px] leading-snug text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-accent/60 transition-colors group-hover:text-accent">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="underline-offset-2 group-hover:underline">{s.heading}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ── Sections ── */}
        <div>
          {sections.map((s, i) => (
            <section
              key={i}
              id={`sec-${i + 1}`}
              className={cn('scroll-mt-6 py-8', i > 0 && 'border-t border-border/30')}
            >
              <h2 className="mb-4 flex items-baseline gap-3 text-[15px] font-semibold tracking-tight text-foreground">
                <span className="font-mono text-[13px] tabular-nums text-accent/70">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {s.heading}
              </h2>
              <div
                className={cn(
                  'text-[13px] leading-relaxed text-muted-foreground/85',
                  '[&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5',
                  '[&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5',
                  '[&_li]:text-[13px]',
                  '[&_h3]:mt-4 [&_h3]:mb-1',
                  '[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2',
                  '[&_strong]:font-semibold [&_strong]:text-foreground/90',
                  '[&_p+p]:mt-2.5',
                )}
              >
                {s.body}
              </div>
            </section>
          ))}
        </div>

        {/* ── Pied de page contact ── */}
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card/40 px-5 py-4">
          <div>
            <p className="text-[13px] font-medium text-foreground">Une question sur ce document&nbsp;?</p>
            <p className="text-[12px] text-muted-foreground/70">L'équipe AlfyCore vous répond.</p>
          </div>
          <a
            href="mailto:contact@alfycore.org"
            className="text-[13px] font-medium text-accent underline underline-offset-2"
          >
            contact@alfycore.org
          </a>
        </footer>

      </article>
    </ScrollArea>
  );
}
