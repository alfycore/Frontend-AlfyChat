'use client';

import NextLink from 'next/link';
import { Accordion, buttonVariants } from '@heroui/react';
import { ChevronDown, Code2, EyeOff, Landmark, Server, type LucideIcon } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { ArrowLink, CONTAINER, Display, Eyebrow, Reveal } from './shared';

/* ── Association ─────────────────────────────────────────────────────── */

export function HomeAssociation() {
  const { t } = useTranslation();
  const a = t.landing.home.association;
  const legacy = t.landing.association;
  const facts: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: Landmark, ...legacy.features.nonprofit },
    { icon: Code2, ...legacy.features.code },
    { icon: EyeOff, ...legacy.features.privacy },
    { icon: Server, ...legacy.features.selfhost },
  ];

  return (
    <section className="bg-background">
      <div className={cn(CONTAINER, 'py-28 lg:py-40')}>
        <Reveal>
          <Eyebrow className="mb-6">{a.eyebrow}</Eyebrow>
        </Reveal>
        <Display size="statement" lines={a.lines} tones={{ [a.lines.length - 1]: 'text-muted' }} />

        <div className="mt-16 grid gap-14 lg:mt-24 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Reveal className="flex flex-col items-start gap-8">
            <p className="max-w-[42ch] text-[17px] leading-relaxed text-muted">{legacy.body}</p>
            <ArrowLink href="/about">{a.link}</ArrowLink>
          </Reveal>
          <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {facts.map(({ icon: Icon, title, desc }, i) => (
              <Reveal as="li" key={title} delay={0.05 + i * 0.05} className="flex flex-col gap-3">
                <Icon className="size-5 text-accent" strokeWidth={1.7} aria-hidden />
                <p className="font-semibold text-foreground">{title}</p>
                <p className="text-sm leading-relaxed text-muted">{desc}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ─────────────────────────────────────────────────────────────── */

/** Questions retenues : [section, question] dans static.faq. */
const PICKS: [number, number][] = [[0, 0], [0, 2], [1, 1], [1, 2], [4, 1], [6, 0]];

export function HomeFaq() {
  const { t } = useTranslation();
  const faq = t.static.faq;
  const items = PICKS.map(([s, q]) => faq.sections[s]?.items[q]).filter(
    (it): it is { q: string; a: string } => Boolean(it),
  );

  return (
    <section id="faq" className="scroll-mt-16 bg-surface">
      <div className={cn(CONTAINER, 'grid gap-14 py-28 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20 lg:py-40')}>
        <div className="flex flex-col items-start gap-6">
          <Reveal>
            <Eyebrow>{t.landing.home.faq.eyebrow}</Eyebrow>
          </Reveal>
          <Display lines={[faq.heading]} />
          <Reveal delay={0.1} className="flex flex-col items-start gap-8">
            <p className="max-w-[36ch] text-muted">{faq.subtitle}</p>
            <ArrowLink href="/faq">{t.landing.home.faq.all}</ArrowLink>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <Accordion>
            {items.map((it) => (
              <Accordion.Item key={it.q}>
                <Accordion.Heading>
                  <Accordion.Trigger className="py-5 text-left text-[17px] font-medium">
                    {it.q}
                    <Accordion.Indicator>
                      <ChevronDown />
                    </Accordion.Indicator>
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body className="pb-6 text-[15px] leading-relaxed text-muted">{it.a}</Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Appel final ─────────────────────────────────────────────────────── */

export function HomeCta() {
  const { t } = useTranslation();
  const c = t.landing.finalCta;
  const { user } = useAuth();

  return (
    <section className="bg-background">
      <div className={cn(CONTAINER, 'grid gap-12 py-28 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:py-44')}>
        <Display size="statement" lines={[c.heading1, c.highlight]} tones={{ 1: 'text-accent' }} />
        <Reveal delay={0.15} className="flex flex-col items-start gap-8 lg:pb-3">
          <p className="max-w-[30ch] text-muted">{c.body}</p>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
            {user ? (
              <NextLink href="/channels/me" className={buttonVariants({ size: 'lg' })}>
                {t.landing.home.nav.openApp}
              </NextLink>
            ) : (
              <>
                <NextLink href="/register" className={buttonVariants({ size: 'lg' })}>
                  {c.primary}
                </NextLink>
                <ArrowLink href="/login">{c.secondary}</ArrowLink>
              </>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
