'use client';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { CheckIcon, MinusIcon } from '@/components/icons';
import { Reveal, Eyebrow, SectionTitle } from './section';

const APPS = ['AlfyChat', 'Stoat', 'Signal', 'Telegram', 'Discord', 'WhatsApp'];

const FEATURES: { label: string; values: boolean[] }[] = [
  //                                       Alfy   Stoat  Signal Telegram Discord WhatsApp
  { label: 'Chiffrement E2E par défaut',  values: [true,  false, true,  false, false, true]  },
  { label: 'Code source ouvert',          values: [true,  true,  true,  true,  false, false] },
  { label: 'Données hébergées en Europe', values: [true,  true,  false, false, false, false] },
  { label: 'Zéro tracking publicitaire',  values: [true,  true,  true,  false, false, false] },
  { label: 'Auto-hébergement possible',   values: [true,  true,  false, false, false, false] },
  { label: 'Sans numéro de téléphone',    values: [true,  true,  false, false, true,  false] },
  { label: 'Serveurs communautaires',     values: [true,  true,  false, false, true,  false] },
  { label: 'API ouverte pour bots',       values: [true,  true,  false, true,  true,  false] },
];

function Cell({ value, highlight }: { value: boolean; highlight: boolean }) {
  if (!value) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted">
        <MinusIcon size={11} className="text-muted-foreground/40" />
      </span>
    );
  }
  return (
    <span
      className={`inline-flex size-6 items-center justify-center rounded-full ${
        highlight ? 'bg-primary/12' : 'bg-foreground/[0.06]'
      }`}
    >
      <CheckIcon size={12} className={highlight ? 'text-primary' : 'text-foreground/45'} />
    </span>
  );
}

export function HomeComparison() {
  return (
    <section className="border-t border-border bg-muted/30 py-28">
      <div className="mx-auto max-w-6xl px-8">

        <Reveal className="mb-14 max-w-xl">
          <Eyebrow>Comparaison</Eyebrow>
          <SectionTitle>
            Pourquoi choisir
            <br />
            AlfyChat plutôt qu&apos;une autre ?
          </SectionTitle>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            La plupart des messageries populaires font des compromis sur votre vie privée. AlfyChat n&apos;en fait aucun.
          </p>
        </Reveal>

        <Reveal delay={0.06}>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <Table className="min-w-[780px]">
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[200px] min-w-[200px]" />
                  {APPS.map((name, i) => (
                    <TableHead
                      key={name}
                      className={`border-l border-border py-5 text-center ${i === 0 ? 'bg-primary/[0.04]' : ''}`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-heading text-[12px] font-semibold ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {name}
                        </span>
                        {i === 0 && (
                          <Badge variant="outline" className="border-primary/25 bg-primary/10 text-[9px] uppercase tracking-[0.06em] text-primary">
                            Recommandé
                          </Badge>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {FEATURES.map(({ label, values }) => (
                  <TableRow key={label} className="border-border">
                    <TableCell className="px-6 py-4 text-[13px] text-foreground">{label}</TableCell>
                    {values.map((val, colIdx) => (
                      <TableCell
                        key={colIdx}
                        className={`border-l border-border py-4 text-center ${colIdx === 0 ? 'bg-primary/[0.04]' : ''}`}
                      >
                        <Cell value={val} highlight={colIdx === 0} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mt-5 font-mono text-[11px] text-muted-foreground/70">
            Comparaison basée sur les politiques de confidentialité publiques — mai 2026.
          </p>
        </Reveal>

      </div>
    </section>
  );
}
