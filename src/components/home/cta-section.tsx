'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon, ShieldCheckIcon } from '@/components/icons';
import { EASE } from './section';

export function HomeCta() {
  const reduce = useReducedMotion();

  return (
    <section id="download" className="border-t border-border bg-background py-28">
      <div className="mx-auto max-w-4xl px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <Card className="relative items-center gap-0 overflow-hidden rounded-2xl px-10 py-20 text-center">
            {/* halo de marque */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-40"
              aria-hidden
              style={{
                background:
                  'radial-gradient(ellipse 50% 100% at 50% 0%, color-mix(in oklch, var(--primary) 12%, transparent), transparent 70%)',
              }}
            />

            {/* Logo */}
            <div className="relative mb-8 flex size-14 items-center justify-center rounded-2xl border border-border bg-muted">
              <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={32} height={32} />
            </div>

            <h2 className="relative mb-4 font-heading text-[2rem] leading-[1.1] font-bold tracking-[-0.02em] text-foreground md:text-[2.4rem]">
              Prêt à reprendre le contrôle ?
            </h2>

            <p className="relative mx-auto mb-10 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
              Rejoignez AlfyChat dès aujourd&apos;hui. Gratuit, sans engagement, sans numéro de téléphone.
            </p>

            <div className="relative flex flex-wrap justify-center gap-3">
              <Button asChild className="group h-11 rounded-lg px-7 text-[14px]">
                <Link href="/register">
                  Créer un compte gratuit
                  <ArrowRightIcon size={13} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-lg px-6 text-[14px]">
                <Link href="/about">En savoir plus</Link>
              </Button>
            </div>

            <div className="relative mt-8 flex items-center justify-center gap-2 text-[11.5px] text-muted-foreground">
              <ShieldCheckIcon size={11} className="text-success" />
              Sans carte bancaire, sans engagement
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
