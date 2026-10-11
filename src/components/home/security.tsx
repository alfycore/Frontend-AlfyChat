'use client';

import { Chip } from '@heroui/react';
import { Laptop, Server, Smartphone, type LucideIcon } from 'lucide-react';

import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { CONTAINER, Display, Eyebrow, Reveal, cipherOf } from './shared';

export function HomeSecurity() {
  const { t } = useTranslation();
  const s = t.landing.home.security;
  const specs = Object.values(t.landing.security.bullets);
  const sample = t.landing.home.readings.messages[2]?.text ?? '';

  return (
    <section id="security" className="scroll-mt-16 bg-surface">
      <div className={cn(CONTAINER, 'py-28 lg:py-40')}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
          <div className="flex flex-col gap-6">
            <Reveal>
              <Eyebrow>{s.eyebrow}</Eyebrow>
            </Reveal>
            <Display lines={[s.title1, s.title2]} tones={{ 1: 'text-muted' }} />
          </div>
          <Reveal delay={0.1}>
            <p className="max-w-[46ch] text-[17px] leading-relaxed text-muted">{s.body}</p>
          </Reveal>
        </div>

        {/* Trajet d'un message */}
        <Reveal delay={0.1} className="mt-20 lg:mt-28">
          <div className="flex flex-col items-stretch lg:flex-row lg:items-start">
            <Node icon={Laptop} label={s.you} state={s.plain} tone="success" sample={sample} />
            <Track />
            <Node icon={Server} label={s.server} state={s.cipher} tone="accent" sample={cipherOf(sample)} cipher />
            <Track late />
            <Node icon={Smartphone} label={s.contact} state={s.plain} tone="success" sample={sample} />
          </div>
        </Reveal>

        {/* Primitives */}
        <dl className="mt-24 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:mt-32 lg:grid-cols-5">
          {specs.map((spec, i) => (
            <Reveal key={spec.title} delay={i * 0.05} className="flex flex-col gap-2">
              <dt className="font-mono text-sm text-foreground">{spec.title}</dt>
              <dd className="text-sm leading-relaxed text-muted">{spec.desc}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Node({
  icon: Icon, label, state, tone, sample, cipher,
}: {
  icon: LucideIcon;
  label: string;
  state: string;
  tone: 'success' | 'accent';
  sample: string;
  cipher?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center lg:w-[22%] lg:shrink-0">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-background text-foreground">
        <Icon className="size-6" strokeWidth={1.6} aria-hidden />
      </span>
      <div className="flex flex-col items-center gap-2">
        <p className="text-[15px] font-semibold text-foreground">{label}</p>
        <Chip size="sm" variant="soft" color={tone}>
          <Chip.Label>{state}</Chip.Label>
        </Chip>
      </div>
      <p
        className={cn(
          'max-w-[26ch] text-[13px] leading-relaxed',
          cipher ? 'font-mono text-[11px] break-all text-muted' : 'text-foreground',
        )}
      >
        {cipher ? sample.slice(0, 56) : sample}
      </p>
    </div>
  );
}

/** Liaison entre deux nœuds, parcourue en boucle par un paquet. */
function Track({ late }: { late?: boolean }) {
  return (
    <div className="home-track mx-auto h-14 w-px bg-separator lg:mx-0 lg:mt-8 lg:h-px lg:w-auto lg:flex-1" aria-hidden>
      <span className={cn('home-packet', late && 'home-packet--late')} />
    </div>
  );
}
