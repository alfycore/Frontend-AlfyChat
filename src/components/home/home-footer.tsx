'use client';

import NextLink from 'next/link';
import { Label, ListBox, Select } from '@heroui/react';

import { AlfyMark } from '@/components/alfy/primitives/alfy-mark';
import { useLocale, useTranslation } from '@/components/locale-provider';
import { LOCALES, type Locale } from '@/i18n';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './home-nav';
import { CONTAINER } from './shared';

export function HomeFooter() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const f = t.landing.footer;
  const h = t.landing.home;

  const columns = [
    {
      title: f.product.title,
      links: [
        { label: f.product.features, href: '/#features' },
        { label: f.product.security, href: '/#security' },
        { label: f.product.changelog, href: '/changelogs' },
        { label: f.product.help, href: '/support' },
      ],
    },
    {
      title: f.developers.title,
      links: [
        { label: f.developers.docs, href: '/developers/docs' },
        { label: f.developers.bots, href: '/developers/bots' },
        { label: f.developers.portal, href: '/developers' },
      ],
    },
    {
      title: f.legal.title,
      links: [
        { label: f.legal.terms, href: '/legal/cgu' },
        { label: f.legal.privacy, href: '/legal/privacy' },
        { label: f.legal.cookies, href: '/legal/cookies' },
        { label: f.legal.notices, href: '/legal/mentions' },
      ],
    },
    {
      title: f.association.title,
      links: [
        { label: f.association.about, href: '/about' },
        { label: f.association.jobs, href: '/jobs' },
        { label: f.association.brand, href: '/brand' },
        { label: f.association.press, href: '/newsroom' },
      ],
    },
  ];

  return (
    <footer className="bg-surface">
      <div className={cn(CONTAINER, 'grid gap-14 pt-20 pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]')}>
        <div className="flex flex-col items-start gap-5">
          <NextLink href="/" className="flex items-center gap-2.5" aria-label={h.nav.home}>
            <AlfyMark className="size-7" />
            <span className="font-heading text-lg tracking-[-0.03em] text-foreground">AlfyChat</span>
          </NextLink>
          <p className="max-w-[32ch] text-sm leading-relaxed text-muted">{f.tagline}</p>
        </div>

        <nav className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-4">
              <p className="text-[13px] font-semibold text-foreground">{col.title}</p>
              <ul className="flex flex-col gap-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <NextLink
                      href={l.href}
                      className="text-sm text-muted transition-colors duration-(--dur-2) hover:text-foreground"
                    >
                      {l.label}
                    </NextLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className={cn(CONTAINER, 'flex flex-col gap-6 pt-6 pb-10 sm:flex-row sm:items-center sm:justify-between')}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted">
          <span>{f.copyright}</span>
          <NextLink href="/status" className="flex items-center gap-2 transition-colors hover:text-foreground">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            {h.footer.status}
          </NextLink>
        </div>

        <div className="flex items-center gap-2">
          <Select
            aria-label={h.footer.language}
            selectedKey={locale}
            onSelectionChange={(k) => k && setLocale(k as Locale)}
            className="w-40"
          >
            <Label className="sr-only">{h.footer.language}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {LOCALES.map((l) => (
                  <ListBox.Item key={l.value} id={l.value} textValue={l.label}>
                    {l.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <ThemeToggle label={h.nav.theme} />
        </div>
      </div>
    </footer>
  );
}
