'use client';

import { Fragment } from 'react';
import { ShieldIcon, HeartIcon, UsersIcon, GlobeIcon, ZapIcon, StarIcon } from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { useTranslation } from '@/components/locale-provider';

const valueIcons = [ShieldIcon, HeartIcon, GlobeIcon, ZapIcon, UsersIcon, StarIcon];

const pastelStyles = [
  { bg: 'bg-[#E1F3FE] dark:bg-[#1F6C9F]/20', icon: 'text-[#1F6C9F] dark:text-[#7CC8F8]' },
  { bg: 'bg-[#FDEBEC] dark:bg-[#9F2F2D]/20', icon: 'text-[#9F2F2D] dark:text-[#F4A0A0]' },
  { bg: 'bg-[#EDF3EC] dark:bg-[#346538]/20', icon: 'text-[#346538] dark:text-[#7EC47A]' },
  { bg: 'bg-[#FBF3DB] dark:bg-[#956400]/20', icon: 'text-[#956400] dark:text-[#F5C842]' },
  { bg: 'bg-[#E1F3FE] dark:bg-[#1F6C9F]/20', icon: 'text-[#1F6C9F] dark:text-[#7CC8F8]' },
  { bg: 'bg-[#EDF3EC] dark:bg-[#346538]/20', icon: 'text-[#346538] dark:text-[#7EC47A]' },
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

export function AboutClient() {
  const { t } = useTranslation();
  const s = t.static.about;

  return (
    <div className="mx-auto max-w-3xl px-6 py-20 space-y-20">

      {/* Hero */}
      <MotionFade direction="down" distance={12} duration={0.6} className="space-y-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#787774] dark:text-[#787774]">
          {s.badge}
        </p>
        <h1
          className="font-heading text-5xl leading-[1.1] tracking-[-0.03em] text-[#111111] dark:text-white"
          style={{ fontFamily: "'Instrument Serif', 'Playfair Display', 'Lyon Text', Georgia, serif" }}
        >
          {s.heading}
        </h1>
        <p className="text-lg text-[#555] dark:text-[#aaa] leading-relaxed max-w-xl">
          {renderWithNodes(s.intro, {
            org: <strong className="text-[#111111] dark:text-white font-semibold">{s.orgName}</strong>,
          })}
        </p>
      </MotionFade>

      <div className="border-t border-[#EAEAEA] dark:border-white/10" />

      {/* Mission */}
      <MotionFade direction="up" distance={12} duration={0.6} className="space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#787774]">{s.missionLabel}</p>
        <p className="text-base text-[#555] dark:text-[#aaa] leading-[1.7]">{s.missionP1}</p>
        <p className="text-base text-[#555] dark:text-[#aaa] leading-[1.7]">{s.missionP2}</p>
      </MotionFade>

      <div className="border-t border-[#EAEAEA] dark:border-white/10" />

      {/* Values */}
      <div className="space-y-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#787774]">{s.valuesLabel}</p>
        <MotionStagger stagger={0.07} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {s.values.map((v, i) => {
            const Icon = valueIcons[i] ?? ShieldIcon;
            const style = pastelStyles[i % pastelStyles.length];
            return (
              <MotionStaggerItem key={v.title}>
                <div
                  className="rounded-[8px] border border-[#EAEAEA] dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 space-y-3 h-full transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex size-8 items-center justify-center rounded-[6px] ${style.bg}`}>
                      <Icon size={15} className={style.icon} />
                    </div>
                    <p className="font-semibold text-sm text-[#111111] dark:text-white tracking-[-0.01em]">{v.title}</p>
                  </div>
                  <p className="text-sm text-[#787774] dark:text-[#888] leading-[1.6]">{v.desc}</p>
                </div>
              </MotionStaggerItem>
            );
          })}
        </MotionStagger>
      </div>

      <div className="border-t border-[#EAEAEA] dark:border-white/10" />

      {/* Stats */}
      <div className="space-y-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#787774]">{s.statsLabel}</p>
        <MotionStagger stagger={0.06} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { value: '100 %', label: s.statOSS },
            { value: s.statAssoc, label: s.statAssocLabel },
            { value: s.statHost, label: s.statHostLabel },
            { value: s.statNoAds, label: s.statNoAdsLabel },
          ].map((stat) => (
            <MotionStaggerItem key={stat.label}>
              <div className="rounded-[8px] border border-[#EAEAEA] dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 text-center space-y-1 h-full">
                <p
                  className="text-2xl text-[#111111] dark:text-white tracking-[-0.03em] leading-none"
                  style={{ fontFamily: "'Geist Mono', 'SF Mono', 'JetBrains Mono', monospace", fontWeight: 600 }}
                >
                  {stat.value}
                </p>
                <p className="text-xs text-[#787774] dark:text-[#888] mt-2">{stat.label}</p>
              </div>
            </MotionStaggerItem>
          ))}
        </MotionStagger>
      </div>

      <div className="border-t border-[#EAEAEA] dark:border-white/10" />

      {/* Contact */}
      <MotionFade direction="up" distance={12} duration={0.6}>
        <div className="rounded-[8px] border border-[#EAEAEA] dark:border-white/10 bg-white dark:bg-white/[0.03] p-8 space-y-3">
          <p className="font-semibold text-[#111111] dark:text-white tracking-[-0.01em]">{s.contactTitle}</p>
          <p className="text-sm text-[#555] dark:text-[#aaa] leading-[1.7]">
            {renderWithNodes(s.contactBody, {
              email: (
                <a href="mailto:contact@alfycore.org" className="text-[#111111] dark:text-white underline underline-offset-2 decoration-[#EAEAEA] dark:decoration-white/20 hover:decoration-[#111111] dark:hover:decoration-white transition-colors">
                  contact@alfycore.org
                </a>
              ),
              security: (
                <a href="mailto:security@alfycore.org" className="text-[#111111] dark:text-white underline underline-offset-2 decoration-[#EAEAEA] dark:decoration-white/20 hover:decoration-[#111111] dark:hover:decoration-white transition-colors">
                  security@alfycore.org
                </a>
              ),
            })}
          </p>
          <p className="text-xs text-[#787774] dark:text-[#666]">
            {renderWithNodes(s.contactFooter, { org: <strong className="text-[#555] dark:text-[#aaa]">{s.orgName}</strong> })}
          </p>
        </div>
      </MotionFade>

    </div>
  );
}
