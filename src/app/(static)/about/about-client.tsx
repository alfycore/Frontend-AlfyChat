'use client';

import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ShieldIcon, HeartIcon, UsersIcon, GlobeIcon, ZapIcon, StarIcon,
} from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { useTranslation } from '@/components/locale-provider';

const valueIcons = [ShieldIcon, HeartIcon, GlobeIcon, ZapIcon, UsersIcon, StarIcon];

function renderWithNodes(template: string, replacements: Record<string, React.ReactNode>) {
  const parts: (string | React.ReactNode)[] = [template];
  for (const [key, node] of Object.entries(replacements)) {
    const token = `{${key}}`;
    const next: (string | React.ReactNode)[] = [];
    for (const part of parts) {
      if (typeof part !== 'string' || !part.includes(token)) {
        next.push(part);
        continue;
      }
      const segments = part.split(token);
      segments.forEach((seg, i) => {
        if (seg) next.push(seg);
        if (i < segments.length - 1) next.push(node);
      });
    }
    parts.splice(0, parts.length, ...next);
  }
  return parts.map((p, i) => <Fragment key={i}>{p}</Fragment>);
}

export function AboutClient() {
  const { t } = useTranslation();
  const s = t.static.about;

  return (
    <div className="mx-auto max-w-3xl space-y-16 px-6 py-16">
      {/* Hero */}
      <MotionFade direction="down" distance={12} duration={0.5} className="space-y-4">
        <Badge variant="outline" className="text-[10px] font-mono">{s.badge}</Badge>
        <h1 className="font-heading text-4xl leading-tight">{s.heading}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
          {renderWithNodes(s.intro, {
            org: <strong className="text-foreground">{s.orgName}</strong>,
          })}
        </p>
      </MotionFade>

      <Separator />

      {/* Mission */}
      <MotionFade direction="up" distance={12} duration={0.5} className="space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{s.missionLabel}</p>
        <p className="text-base text-muted-foreground leading-relaxed">{s.missionP1}</p>
        <p className="text-base text-muted-foreground leading-relaxed">{s.missionP2}</p>
      </MotionFade>

      <Separator />

      {/* Valeurs */}
      <div className="space-y-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{s.valuesLabel}</p>
        <MotionStagger stagger={0.06} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {s.values.map((v, i) => {
            const Icon = valueIcons[i] ?? ShieldIcon;
            return (
              <MotionStaggerItem key={v.title}>
                <div className="rounded-xl border border-border bg-card p-5 space-y-2 h-full">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                      <Icon size={16} className="text-primary" />
                    </div>
                    <p className="font-heading text-sm">{v.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                </div>
              </MotionStaggerItem>
            );
          })}
        </MotionStagger>
      </div>

      <Separator />

      {/* Timeline */}
      <div className="space-y-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{s.historyLabel}</p>
        <MotionStagger stagger={0.08} className="relative space-y-0 border-l border-border pl-6">
          {s.milestones.map((m) => (
            <MotionStaggerItem key={m.year} direction="left" distance={16}>
              <div className="relative pb-8 last:pb-0">
                <div className="absolute -left-[25px] flex size-3 items-center justify-center rounded-full border-2 border-primary bg-background" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary">{m.year}</span>
                    <span className="font-heading text-sm">{m.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{m.desc}</p>
                </div>
              </div>
            </MotionStaggerItem>
          ))}
        </MotionStagger>
      </div>

      <Separator />

      {/* Stats */}
      <div className="space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{s.statsLabel}</p>
        <MotionStagger stagger={0.05} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { value: '100 %', label: s.statOSS },
            { value: s.statAssoc, label: s.statAssocLabel },
            { value: s.statHost, label: s.statHostLabel },
            { value: s.statNoAds, label: s.statNoAdsLabel },
          ].map((stat) => (
            <MotionStaggerItem key={stat.label}>
              <div className="rounded-xl border border-border bg-card p-4 text-center space-y-1 h-full">
                <p className="font-heading text-2xl text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </MotionStaggerItem>
          ))}
        </MotionStagger>
      </div>

      <Separator />

      {/* Contact */}
      <MotionFade direction="up" distance={12} duration={0.5}>
        <div className="rounded-xl border border-border bg-card p-6 space-y-2">
          <p className="font-heading text-sm">{s.contactTitle}</p>
          <p className="text-sm text-muted-foreground">
            {renderWithNodes(s.contactBody, {
              email: <a href="mailto:contact@alfycore.org" className="text-primary hover:underline">contact@alfycore.org</a>,
              security: <a href="mailto:security@alfycore.org" className="text-primary hover:underline">security@alfycore.org</a>,
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {renderWithNodes(s.contactFooter, { org: <strong>{s.orgName}</strong> })}
          </p>
        </div>
      </MotionFade>
    </div>
  );
}
