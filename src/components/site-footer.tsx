'use client';

import Link from 'next/link';
import {
  ShieldIcon,
  HeartIcon,
  LockIcon,
  CodeIcon,
  ZapIcon,
} from '@/components/icons';

const COLUMNS = [
  {
    title: 'Produit',
    links: [
      { label: 'Fonctionnalités', href: '/#features' },
      { label: 'Sécurité',        href: '/#security' },
      { label: 'Télécharger',     href: '/#download' },
      { label: 'Changelog',       href: '/changelogs' },
      { label: 'Support',         href: '/support' },
    ],
  },
  {
    title: 'Développeurs',
    links: [
      { label: 'Documentation', href: '/developers/docs' },
      { label: 'Bots',          href: '/developers/bots' },
      { label: 'Portail',       href: '/developers' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { label: 'CGU',              href: '/legal/cgu' },
      { label: 'Confidentialité',  href: '/legal/privacy' },
      { label: 'Cookies',          href: '/legal/cookies' },
      { label: 'Mentions légales', href: '/legal/mentions' },
      { label: 'Contact',          href: 'mailto:contact@alfycore.org' },
    ],
  },
  {
    title: 'Association',
    links: [
      { label: 'À propos',  href: '/about' },
      { label: 'Emplois',   href: '/jobs' },
      { label: 'Brand',     href: '/brand' },
      { label: 'Newsroom',  href: '/newsroom' },
    ],
  },
];

const PILLARS = [
  { icon: LockIcon,   label: 'Chiffrement E2E' },
  { icon: CodeIcon,   label: 'Code ouvert'     },
  { icon: ShieldIcon, label: 'Vie privée'       },
  { icon: ZapIcon,    label: 'Ultra-rapide'     },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-background">

      {/* ── Links grid ──────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6 py-14">

        {/* Brand + pillars */}
        <div className="mb-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-2 font-heading text-sm">
            <img src="/logo/Alfychat.svg" alt="" className="size-5" />
            ALFYCHAT
          </Link>
          <div className="flex flex-wrap gap-2">
            {PILLARS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground"
              >
                <Icon size={10} className="text-primary/60" />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="mb-4 font-heading text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="group flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span className="inline-block size-1 shrink-0 rounded-full bg-border transition-colors group-hover:bg-primary/60" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────── */}
      <div className="border-t border-border/40 bg-muted/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-4 text-xs text-muted-foreground sm:flex-row">

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-[11px]">
              © {new Date().getFullYear()} AlfyCore
            </span>
            <span className="flex items-center gap-1 text-[11px]">
              <HeartIcon size={9} className="text-destructive/70" /> France
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <Link href="/status" className="flex items-center gap-1.5 text-[11px] transition-colors hover:text-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              Tous les services opérationnels
            </Link>
            {[
              { label: 'CGU',             href: '/legal/cgu' },
              { label: 'Confidentialité', href: '/legal/privacy' },
              { label: 'alfycore.pro',    href: 'https://alfycore.pro' },
            ].map((l) => (
              <Link key={l.label} href={l.href} className="text-[11px] transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

    </footer>
  );
}
