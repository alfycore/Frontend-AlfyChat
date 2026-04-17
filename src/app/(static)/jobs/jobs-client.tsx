'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  CodeIcon, ShieldIcon, PencilIcon, HeartIcon, GlobeIcon, UsersIcon,
} from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { useTranslation } from '@/components/locale-provider';

const openingIcons = [CodeIcon, CodeIcon, ShieldIcon, PencilIcon, UsersIcon, GlobeIcon];
const openingSkills = [
  ['Node.js', 'Next.js', 'Prisma', 'TypeScript'],
  ['Go', 'gRPC', 'Docker', 'Linux'],
  ['Cryptography', 'OWASP', 'Audit', 'Linux'],
  ['Figma', 'Tailwind', 'Design system', 'A11y'],
  ['Social', 'Writing', 'Moderation'],
  ['Markdown', 'REST API', 'Tech writing'],
];
const whyJoinIcons = [HeartIcon, CodeIcon, GlobeIcon];

export function JobsClient() {
  const { t, tx } = useTranslation();
  const s = t.static.jobs;

  return (
    <div className="mx-auto max-w-3xl space-y-16 px-6 py-16">
      {/* Hero */}
      <MotionFade direction="down" distance={12} duration={0.5} className="space-y-4">
        <Badge variant="outline" className="text-[10px] font-mono">{s.badge}</Badge>
        <h1 className="font-heading text-4xl leading-tight">{s.heading}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">{s.intro}</p>
      </MotionFade>

      <Separator />

      {/* Pourquoi nous rejoindre */}
      <div className="space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{s.whyJoinLabel}</p>
        <MotionStagger stagger={0.06} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {s.whyJoin.map((item, i) => {
            const Icon = whyJoinIcons[i] ?? HeartIcon;
            return (
              <MotionStaggerItem key={item.title}>
                <div className="rounded-xl border border-border bg-card p-4 space-y-2 h-full">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <p className="font-heading text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </MotionStaggerItem>
            );
          })}
        </MotionStagger>
      </div>

      <Separator />

      {/* Offres */}
      <div className="space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {tx(s.openLabel, { n: s.openings.length })}
        </p>
        <MotionStagger stagger={0.06} className="space-y-3">
          {s.openings.map((job, i) => {
            const Icon = openingIcons[i] ?? CodeIcon;
            const skills = openingSkills[i] ?? [];
            return (
              <MotionStaggerItem key={job.title} direction="up" distance={12}>
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-heading text-sm">{job.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">{job.team}</Badge>
                        <Badge variant="outline" className="text-[10px] text-success border-success/30">{s.volunteer}</Badge>
                        <Badge variant="outline" className="text-[10px]">{s.location}</Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{job.description}</p>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((sk) => (
                        <span key={sk} className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <a href={`mailto:jobs@alfycore.org?subject=${encodeURIComponent(job.title)}`}>
                      {s.applyCTA}
                    </a>
                  </Button>
                </div>
              </MotionStaggerItem>
            );
          })}
        </MotionStagger>
      </div>

      <Separator />

      {/* CTA spontanée */}
      <MotionFade direction="up" distance={12} duration={0.5}>
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <p className="font-heading text-sm">{s.unsolicitedTitle}</p>
          <p className="text-sm text-muted-foreground">{s.unsolicitedBody}</p>
          <Button variant="outline" asChild>
            <a href="mailto:jobs@alfycore.org">{s.unsolicitedCTA}</a>
          </Button>
        </div>
      </MotionFade>
    </div>
  );
}
