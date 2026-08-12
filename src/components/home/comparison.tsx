'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Chip, Table, Typography } from '@heroui/react';
import { CheckIcon } from '@/components/icons';

const KRONA = { fontFamily: 'var(--font-krona), sans-serif' } as const;
const MONO = { fontFamily: 'var(--font-geist-mono, monospace)' } as const;

const APPS = ['AlfyChat', 'Stoat', 'Signal', 'Telegram', 'Discord', 'WhatsApp'];

const FEATURES: { label: string; values: boolean[] }[] = [
  { label: 'Chiffrement E2E par défaut',  values: [true,  false, true,  false, false, true]  },
  { label: 'Code source ouvert',          values: [true,  true,  true,  true,  false, false] },
  { label: 'Données hébergées en Europe', values: [true,  true,  false, false, false, false] },
  { label: 'Zéro tracking publicitaire',  values: [true,  true,  true,  false, false, false] },
  { label: 'Auto-hébergement possible',   values: [true,  true,  false, false, false, false] },
  { label: 'Sans numéro de téléphone',    values: [true,  true,  false, false, true,  false] },
  { label: 'Serveurs communautaires',     values: [true,  true,  false, false, true,  false] },
  { label: 'API ouverte pour bots',       values: [true,  true,  false, true,  true,  false] },
];

function Cell({ on, primary }: { on: boolean; primary: boolean }) {
  if (!on) {
    return (
      <span
        className="inline-block h-px w-3 rounded-full"
        style={{ background: 'var(--muted)', opacity: 0.4 }}
        aria-label="non"
      />
    );
  }
  return (
    <span
      className="inline-flex size-6 items-center justify-center rounded-full"
      style={{ background: `color-mix(in oklch, var(--${primary ? 'accent' : 'success'}) 14%, transparent)` }}
      aria-label="oui"
    >
      <CheckIcon size={11} style={{ color: `var(--${primary ? 'accent' : 'success'})` }} />
    </span>
  );
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

export function HomeComparison() {
  return (
    <section className="bg-background py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-12">

        <Reveal className="mb-14 flex max-w-xl flex-col gap-4">
          <Chip color="accent" variant="soft" size="sm" className="w-fit">
            <Chip.Label>Comparaison</Chip.Label>
          </Chip>
          <Typography
            type="h2"
            weight="bold"
            className="text-foreground"
            style={{ ...KRONA, fontSize: 'clamp(1.9rem, 3vw, 2.6rem)', lineHeight: 1.1, letterSpacing: '-0.025em' }}
          >
            Pourquoi choisir AlfyChat plutôt qu'une autre ?
          </Typography>
          <Typography type="body" color="muted">
            La plupart des messageries populaires font des compromis sur votre vie privée. AlfyChat n'en fait aucun.
          </Typography>
        </Reveal>

        <Reveal delay={0.06}>
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Comparaison des messageries" className="min-w-190">
                <Table.Header>
                  <Table.Column isRowHeader>Fonctionnalité</Table.Column>
                  {APPS.map((app, i) => (
                    <Table.Column key={app}>
                      <div className="flex flex-col items-center gap-1">
                        <Typography
                          type="body-sm"
                          weight={i === 0 ? 'bold' : 'medium'}
                          className={i === 0 ? 'text-accent' : 'text-muted'}
                          style={KRONA}
                        >
                          {app}
                        </Typography>
                        {i === 0 && (
                          <Chip color="accent" variant="soft" size="sm">
                            <Chip.Label>Recommandé</Chip.Label>
                          </Chip>
                        )}
                      </div>
                    </Table.Column>
                  ))}
                </Table.Header>
                <Table.Body>
                  {FEATURES.map(({ label, values }) => (
                    <Table.Row key={label}>
                      <Table.Cell>
                        <Typography type="body-sm" className="text-foreground">{label}</Typography>
                      </Table.Cell>
                      {values.map((v, colIdx) => (
                        <Table.Cell key={colIdx}>
                          <div className="flex items-center justify-center">
                            <Cell on={v} primary={colIdx === 0} />
                          </div>
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Reveal>

        <Reveal delay={0.1}>
          <Typography type="body-xs" color="muted" className="mt-5 block" style={MONO}>
            Comparaison basée sur les politiques de confidentialité publiques — mai 2026.
          </Typography>
        </Reveal>

      </div>
    </section>
  );
}
