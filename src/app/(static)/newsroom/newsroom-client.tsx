'use client';

import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ZapIcon, ShieldIcon, CodeIcon, SmileIcon, MicIcon, UsersIcon,
} from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { useTranslation } from '@/components/locale-provider';

const entryIcons = [ZapIcon, ShieldIcon, MicIcon, UsersIcon, CodeIcon, SmileIcon];
const entryTagVariants: Array<'default' | 'outline' | 'secondary'> = [
  'default', 'outline', 'secondary', 'outline', 'secondary', 'outline',
];

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

export function NewsroomClient() {
  const { t } = useTranslation();
  const s = t.static.newsroom;

  return (
    <div className="mx-auto max-w-3xl space-y-16 px-6 py-16">
      {/* Hero */}
      <MotionFade direction="down" distance={12} duration={0.5} className="space-y-4">
        <Badge variant="outline" className="text-[10px] font-mono">{s.badge}</Badge>
        <h1 className="font-heading text-4xl leading-tight">{s.heading}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">{s.intro}</p>
      </MotionFade>

      <Separator />

      {/* News feed */}
      <MotionStagger stagger={0.08} className="space-y-6">
        {s.entries.map((entry, i) => {
          const Icon = entryIcons[i] ?? ZapIcon;
          const tagVariant = entryTagVariants[i] ?? 'outline';
          return (
            <MotionStaggerItem key={entry.title} direction="up" distance={16}>
              <article className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{entry.date}</span>
                    <Badge variant={tagVariant} className="text-[10px]">
                      <Icon size={10} />
                      {entry.tag}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-heading text-lg leading-snug">{entry.title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{entry.summary}</p>
                  </div>
                  <ul className="space-y-1.5">
                    {entry.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-primary/60" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </MotionStaggerItem>
          );
        })}
      </MotionStagger>

      <Separator />

      {/* Abonnement */}
      <MotionFade direction="up" distance={12} duration={0.5}>
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <p className="font-heading text-sm">{s.stayTuned}</p>
          <p className="text-sm text-muted-foreground">
            {renderWithNodes(s.stayTunedBody, {
              email: <a href="mailto:news@alfycore.org" className="text-primary hover:underline">news@alfycore.org</a>,
            })}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline" className="text-[10px] cursor-pointer hover:border-primary/50 hover:text-primary transition-colors">
              <i className="fi fi-brands-github" style={{ fontSize: 10 }} />
              GitHub — AlfyChatV2
            </Badge>
            <Badge variant="outline" className="text-[10px] cursor-pointer hover:border-primary/50 hover:text-primary transition-colors">
              <i className="fi fi-brands-discord" style={{ fontSize: 10 }} />
              Discord
            </Badge>
            <Badge variant="outline" className="text-[10px] cursor-pointer hover:border-primary/50 hover:text-primary transition-colors">
              <i className="fi fi-brands-twitter-alt" style={{ fontSize: 10 }} />
              @AlfyChat
            </Badge>
          </div>
        </div>
      </MotionFade>
    </div>
  );
}
