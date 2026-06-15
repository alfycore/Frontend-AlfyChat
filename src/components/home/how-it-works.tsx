'use client';

import { Badge } from '@/components/ui/badge';
import { Reveal, Eyebrow, SectionTitle } from './section';

const STEPS = [
  {
    number: '01',
    title: 'Créer un compte',
    desc: "Inscription en 30 secondes. Sans numéro de téléphone, sans carte bancaire, sans vérification d'identité.",
    tag: 'Gratuit',
    tagClass: 'border-success/30 bg-success/10 text-success',
  },
  {
    number: '02',
    title: 'Inviter vos contacts',
    desc: "Partagez un lien ou cherchez directement par nom d'utilisateur. Aucune importation de carnet d'adresses.",
    tag: 'Aucune donnée collectée',
    tagClass: 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    number: '03',
    title: 'Discuter en privé',
    desc: "Chaque message est chiffré sur votre appareil avant d'être envoyé. Même nos serveurs ne peuvent pas lire vos échanges.",
    tag: 'Chiffrement E2E',
    tagClass: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
];

export function HomeHowItWorks() {
  return (
    <section className="relative overflow-hidden border-t border-border bg-background py-28">
      {/* profondeur ambiante */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 100%, color-mix(in oklch, var(--foreground) 4%, transparent), transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-8">
        <Reveal className="mb-16 max-w-xl">
          <Eyebrow>Processus</Eyebrow>
          <SectionTitle>
            Simple à utiliser,
            <br />
            impossible à espionner.
          </SectionTitle>
        </Reveal>

        <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {STEPS.map(({ number, title, desc, tag, tagClass }, i) => (
            <Reveal key={number} delay={i * 0.1} className="px-0 py-10 first:pl-0 last:pr-0 md:px-10 md:py-0">
              <p className="mb-6 select-none font-heading text-[3.5rem] leading-none font-bold text-foreground/10" aria-hidden>
                {number}
              </p>

              <Badge variant="outline" className={`uppercase tracking-[0.06em] ${tagClass}`}>
                {tag}
              </Badge>

              <h3 className="mt-3 font-heading text-[17px] leading-snug font-semibold text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
