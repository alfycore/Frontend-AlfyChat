'use client';

import { Card } from '@/components/ui/card';
import {
  HelpCircleIcon,
  MessageCircleIcon,
  LockIcon,
  PhoneIcon,
  BotIcon,
  ServerIcon,
  SettingsIcon,
} from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { useTranslation } from '@/components/locale-provider';

const sectionIcons = [
  HelpCircleIcon,
  LockIcon,
  MessageCircleIcon,
  PhoneIcon,
  ServerIcon,
  BotIcon,
  SettingsIcon,
];

export function FAQClient() {
  const { t } = useTranslation();
  const s = t.static.faq;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <MotionFade direction="down" distance={12} duration={0.5} className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--accent)]/10">
            <HelpCircleIcon size={24} className="text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">{s.heading}</h1>
            <p className="text-[var(--muted)]">{s.subtitle}</p>
          </div>
        </div>
      </MotionFade>

      <div className="space-y-8">
        {s.sections.map((section, si) => {
          const Icon = sectionIcons[si] ?? HelpCircleIcon;
          return (
            <MotionFade key={section.title} direction="up" distance={10} duration={0.4} delay={si * 0.04}>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-[var(--foreground)]">
                <Icon size={20} className="text-[var(--accent)]" />
                {section.title}
              </h2>
              <MotionStagger stagger={0.05} className="space-y-3">
                {section.items.map((item, i) => (
                  <MotionStaggerItem key={i} direction="up" distance={10}>
                    <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                      <div className="px-5 py-4">
                        <p className="mb-2 font-medium text-[var(--foreground)]">{item.q}</p>
                        <p className="text-sm leading-relaxed text-[var(--muted)]">{item.a}</p>
                      </div>
                    </Card>
                  </MotionStaggerItem>
                ))}
              </MotionStagger>
            </MotionFade>
          );
        })}
      </div>

      <MotionFade direction="up" distance={12} duration={0.5} delay={0.2}>
        <Card className="mt-10 border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-0">
          <div className="px-5 py-6 text-center">
            <p className="mb-1 text-lg font-semibold text-[var(--foreground)]">{s.notFoundTitle}</p>
            <p className="text-sm text-[var(--muted)]">
              {s.notFoundBody}{' '}
              <a href="mailto:support@alfycore.org" className="font-medium text-[var(--accent)] underline underline-offset-2">
                support@alfycore.org
              </a>
            </p>
          </div>
        </Card>
      </MotionFade>
    </div>
  );
}
