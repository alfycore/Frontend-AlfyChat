import { ScrollArea } from '@/components/ui/scroll-area';
import { BorderBeam } from '@/components/ui/border-beam';
import { cn } from '@/lib/utils';

export interface LegalSection {
  heading: string;
  body: React.ReactNode;
}

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
      <div className="mx-auto max-w-2xl px-6 py-8">

        {/* En-tête */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border bg-card p-6">
          <BorderBeam colorFrom="#7c3aed" colorTo="#9E7AFF" duration={10} size={80} borderWidth={1} />
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Icon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[17px] font-bold leading-snug text-foreground">{title}</h1>
              <p className="mt-0.5 text-[13px] text-muted-foreground/70">{subtitle}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/30 px-2.5 py-0.5 text-[10px] tabular-nums text-muted-foreground/60">
                <span className="size-1 rounded-full bg-green-500" />
                Mise à jour : {updatedAt}
              </span>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {sections.map((s, i) => (
            <div
              key={i}
              className="group rounded-xl border border-border/30 bg-card/50 px-5 py-4 transition-colors hover:border-border/60 hover:bg-card"
            >
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-accent/10 text-[9px] font-bold tabular-nums text-accent">
                  {i + 1}
                </span>
                <h2 className="text-[13px] font-semibold text-foreground">{s.heading}</h2>
              </div>
              <div
                className={cn(
                  'text-[13px] leading-relaxed text-muted-foreground/80',
                  '[&_ul]:mt-1.5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5',
                  '[&_ol]:mt-1.5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5',
                  '[&_li]:text-[13px]',
                  '[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2',
                  '[&_strong]:font-semibold [&_strong]:text-foreground/90',
                  '[&_p+p]:mt-2',
                )}
              >
                {s.body}
              </div>
            </div>
          ))}
        </div>

        {/* Footer contact */}
        <div className="mt-6 flex items-center justify-between rounded-xl border border-border/20 bg-muted/10 px-4 py-3 text-[12px] text-muted-foreground/60">
          <span>Des questions ?</span>
          <a href="mailto:contact@alfycore.org" className="font-medium text-accent underline underline-offset-2">
            contact@alfycore.org
          </a>
        </div>

      </div>
    </ScrollArea>
  );
}
