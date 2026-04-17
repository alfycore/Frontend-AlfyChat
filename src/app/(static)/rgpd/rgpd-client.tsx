'use client';

import { Fragment } from 'react';
import { Card } from '@/components/ui/card';
import {
  ShieldIcon, DownloadIcon, Trash2Icon, EyeIcon, FileCheckIcon, UserCheckIcon, ScaleIcon, MailIcon,
} from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { useTranslation } from '@/components/locale-provider';

const sectionIcons = [EyeIcon, DownloadIcon, FileCheckIcon, Trash2Icon, UserCheckIcon, ScaleIcon, MailIcon];

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

export function RGPDClient() {
  const { t } = useTranslation();
  const s = t.static.rgpd;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <MotionFade direction="down" distance={12} duration={0.5} className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/20">
            <ShieldIcon size={24} className="text-[var(--accent)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-[var(--foreground)]">{s.heading}</h1>
              <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500">{s.compliantLabel}</span>
            </div>
            <p className="text-[var(--muted)]">{s.subtitle}</p>
          </div>
        </div>
        <p className="text-[var(--muted)]">{s.intro}</p>
      </MotionFade>

      <MotionStagger stagger={0.06} className="space-y-6">
        {s.sections.map((section, i) => {
          const Icon = sectionIcons[i] ?? ShieldIcon;
          const isErasure = i === 3;
          const isPortability = i === 1;
          const isComplaint = i === 6;
          return (
            <MotionStaggerItem key={section.title} direction="up" distance={14}>
              <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white/60 p-0 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.04]">
                <div className="px-5 pt-5 pb-3">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                    <Icon size={20} className="text-[var(--accent)]" />
                    {section.title}
                    {section.badge && (
                      <span className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-0.5 text-xs font-normal text-[var(--muted)]">
                        {section.badge}
                      </span>
                    )}
                  </h3>
                </div>
                <div className="space-y-3 px-5 pb-5 text-sm leading-relaxed text-[var(--muted)]">
                  <p>
                    {section.settingsPart
                      ? renderWithNodes(section.body, {
                          settings: <strong className="text-[var(--foreground)]">{section.settingsPart}</strong>,
                        })
                      : section.body}
                  </p>

                  {section.bullets && (
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {section.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}

                  {isPortability && (
                    <div className="mt-3 rounded-xl border border-[var(--accent)]/15 bg-[var(--accent)]/5 p-3 text-[var(--foreground)]">
                      <p className="font-medium">{s.howTo}</p>
                      <p className="text-[var(--muted)]">{s.settingsPath}</p>
                    </div>
                  )}

                  {isErasure && (
                    <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-[var(--foreground)]">
                      <p className="font-medium">{s.howTo}</p>
                      <p className="text-[var(--muted)]">{s.settingsDelete}</p>
                    </div>
                  )}

                  {isComplaint && (
                    <p className="mt-2">
                      <a
                        href="https://www.cnil.fr/fr/plaintes"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[var(--accent)] underline underline-offset-2 hover:opacity-80"
                      >
                        {s.cnilLink}
                      </a>
                    </p>
                  )}
                </div>
              </Card>
            </MotionStaggerItem>
          );
        })}
      </MotionStagger>
    </div>
  );
}
