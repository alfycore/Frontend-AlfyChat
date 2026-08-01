'use client';

import { motion, useReducedMotion } from 'motion/react';
import { EASE } from './section';

const CHANGES = [
  {
    n: '01',
    headline: 'Vos messages ne lisent personne d autre que vos proches.',
    body: 'Chaque message est chiffré sur votre appareil avant d atteindre nos serveurs. Nous ne pouvons pas lire ce que vous partagez. Personne entre vous et votre interlocuteur ne peut le faire non plus.',
    visual: (
      <div className="font-mono text-[11px] leading-[2] text-muted-foreground/60 select-none" aria-hidden>
        <div>Alice <span className="text-foreground/20">──────────</span> [<span className="text-primary/80">████████████</span>] <span className="text-foreground/20">──────────</span> Bob</div>
        <div className="mt-3 text-muted-foreground/30">Protocole Signal · AES-256-GCM · E2E activé par défaut</div>
      </div>
    ),
  },
  {
    n: '02',
    headline: 'Vous n avez pas besoin d être un numéro de téléphone.',
    body: 'Inscription en 30 secondes avec un nom d utilisateur. Aucun numéro, aucune carte bancaire, aucune vérification d identité. Vous choisissez qui vous êtes.',
    visual: (
      <div className="font-mono text-[11px] leading-[2] text-muted-foreground/60 select-none" aria-hidden>
        <div className="inline-block rounded-lg border border-foreground/[0.08] px-3 py-2 text-foreground">
          @votre_pseudo
        </div>
        <div className="mt-3 text-muted-foreground/30">Pas de numéro  ·  Pas de carte  ·  Pas de vérification</div>
      </div>
    ),
  },
  {
    n: '03',
    headline: 'Votre communauté reste la vôtre, même si nous disparaissons.',
    body: 'Hébergez votre propre nœud AlfyChat sur votre serveur ou votre PC. Vos données ne quittent jamais votre infrastructure. Vous n'êtes dépendant de personne.',
    visual: (
      <div className="font-mono text-[11px] leading-[2] text-muted-foreground/60 select-none" aria-hidden>
        <div><span className="text-primary/60">$</span> alfychat-server start</div>
        <div className="text-muted-foreground/40">  --server-id=<span className="text-foreground/60">42</span> --token=<span className="text-foreground/60">••••••••</span></div>
        <div className="mt-1 text-emerald-500/70">  ✓ Votre nœud est en ligne</div>
      </div>
    ),
  },
];

export function HomeFeatures() {
  const reduce = useReducedMotion();

  return (
    <section id="changes" className="bg-background py-28">
      <div className="mx-auto max-w-6xl px-8">

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-20 font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground"
        >
          Ce qui change pour vous
        </motion.p>

        <div className="space-y-0 divide-y divide-foreground/[0.06]">
          {CHANGES.map(({ n, headline, body, visual }, i) => (
            <div
              key={n}
              className="grid grid-cols-1 gap-10 py-16 lg:grid-cols-2 lg:gap-24 lg:items-start"
            >
              {/* Gauche */}
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.7, delay: i * 0.04, ease: EASE }}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.09em] text-muted-foreground/40">
                  {n}
                </span>
                <h3
                  className="mt-4 font-heading font-bold leading-[1.1] tracking-[-0.025em] text-foreground"
                  style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)' }}
                >
                  {headline}
                </h3>
                <p className="mt-5 max-w-[440px] text-[14.5px] leading-[1.75] text-muted-foreground">
                  {body}
                </p>
              </motion.div>

              {/* Droite — visuel éditorial */}
              <motion.div
                initial={reduce ? false : { opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.7, delay: i * 0.04 + 0.08, ease: EASE }}
                className="flex items-center lg:justify-end"
              >
                <div className="rounded-2xl border border-foreground/[0.06] bg-muted/30 px-8 py-7">
                  {visual}
                </div>
              </motion.div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
