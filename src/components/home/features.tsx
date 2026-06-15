'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LockIcon, ZapIcon, UsersIcon, ServerIcon, BotIcon } from '@/components/icons';
import { Reveal, Eyebrow, SectionTitle } from './section';

/* ── Diagramme de flux E2E ───────────────────────────────── */
function E2EDiagram() {
  return (
    <div className="mt-8 flex select-none items-center gap-3" aria-hidden>
      <div className="flex flex-col items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-full border border-border bg-muted font-heading text-[10px] font-bold text-muted-foreground">
          A
        </div>
        <span className="font-mono text-[8px] uppercase tracking-wide text-muted-foreground/70">Alice</span>
      </div>

      <div className="flex min-w-0 flex-1 items-center">
        <div className="h-px flex-1 bg-border" />
        <div className="mx-2 flex shrink-0 items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1.5">
          <LockIcon size={9} className="text-success" />
          <span className="font-mono text-[7.5px] font-medium tracking-wide text-success">Signal E2E</span>
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-full border border-border bg-muted font-heading text-[10px] font-bold text-muted-foreground">
          B
        </div>
        <span className="font-mono text-[8px] uppercase tracking-wide text-muted-foreground/70">Bob</span>
      </div>
    </div>
  );
}

export function HomeFeatures() {
  return (
    <section id="features" className="border-t border-border bg-muted/30 py-28">
      <div className="mx-auto max-w-6xl px-8">

        {/* En-tête */}
        <Reveal className="mb-14 max-w-xl">
          <Eyebrow>Fonctionnalités</Eyebrow>
          <SectionTitle>
            Tout ce qu&apos;il vous faut,
            <br />
            rien de superflu.
          </SectionTitle>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Messagerie privée, appels HD, communautés et auto-hébergement dans une seule application.
          </p>
        </Reveal>

        {/* Bento */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">

          {/* Carte 1 — E2E (2 colonnes) */}
          <Reveal delay={0} className="sm:col-span-2">
            <Card className="group relative flex h-full min-h-[260px] gap-0 rounded-2xl p-8">
              <div className="pointer-events-none absolute -top-20 -left-20 size-64 rounded-full bg-success/20 opacity-70 blur-[80px] transition-opacity duration-500 group-hover:opacity-100" aria-hidden />

              <div className="relative z-10 flex size-12 items-center justify-center rounded-xl border border-success/30 bg-success/10 shadow-sm">
                <LockIcon size={20} className="text-success" />
              </div>

              <h3 className="relative z-10 mt-6 font-heading text-[18px] leading-snug font-bold text-foreground">
                Chiffrement de bout en bout
              </h3>
              <p className="relative z-10 mt-2.5 max-w-[420px] text-[13px] leading-relaxed text-muted-foreground">
                Chaque message, fichier et appel est chiffré sur votre appareil avant l&apos;envoi.
                Nos serveurs ne voient que des données illisibles. Protocole Signal, audité.
              </p>

              <E2EDiagram />

              <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-5">
                <Badge variant="outline" className="gap-1.5 border-success/30 bg-success/10 font-mono text-success normal-case">
                  <span className="inline-block size-1.5 animate-pulse rounded-full bg-success" />
                  Audité · Open source
                </Badge>
                <Badge variant="outline" className="border-primary/25 bg-primary/10 font-mono text-primary normal-case">
                  🇪🇺 Données en Europe · RGPD
                </Badge>
              </div>
            </Card>
          </Reveal>

          {/* Carte 2 — Appels HD (spotlight) */}
          <Reveal delay={0.07}>
            <Card className="group relative flex min-h-[370px] gap-0 overflow-hidden rounded-2xl border-transparent bg-primary p-7 text-primary-foreground ring-0">
              {/* anneaux concentriques */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
                <div className="absolute size-[260px] animate-[ping_4s_ease-in-out_infinite] rounded-full border border-white/10 opacity-0" />
                <div className="absolute size-[220px] rounded-full border border-white/10" />
                <div className="absolute size-[165px] rounded-full border border-white/15" />
                <div className="absolute size-[110px] rounded-full border border-white/20" />
                <div className="absolute flex size-[62px] items-center justify-center rounded-full border border-white/30 bg-white/20 shadow-[0_0_24px_rgba(255,255,255,0.25)]">
                  <ZapIcon size={22} className="text-white" />
                </div>
              </div>

              <div className="relative z-10 flex justify-end">
                <span className="rounded-full border border-white/20 bg-white/15 px-2.5 py-1 font-mono text-[9.5px] font-medium text-white/90">
                  HD · E2E · P2P
                </span>
              </div>

              <div className="relative z-10 mt-auto space-y-1.5">
                <h3 className="font-heading text-[15.5px] leading-tight font-bold text-white">
                  Appels HD instantanés
                </h3>
                <p className="text-[12px] leading-relaxed text-white/60">
                  Voix et vidéo haute qualité, chiffrés de bout en bout.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  {['1080p', '48 kHz', 'E2E', '< 50ms'].map((label) => (
                    <span key={label} className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 font-mono text-[9px] text-white/70">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </Reveal>

          {/* Carte 3 — Communautés */}
          <Reveal delay={0.1}>
            <Card className="group relative flex min-h-[260px] gap-0 rounded-2xl p-7">
              <div className="pointer-events-none absolute -right-10 -bottom-10 size-36 rounded-full bg-sky-500/15 opacity-80 blur-[50px] transition-opacity duration-500 group-hover:opacity-100" aria-hidden />

              <div className="relative z-10 flex size-12 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/10 shadow-sm">
                <UsersIcon size={20} className="text-sky-600 dark:text-sky-400" />
              </div>

              <div className="relative z-10 mt-5 flex-1 space-y-2">
                <h3 className="font-heading text-[15.5px] font-bold text-foreground">Serveurs communautaires</h3>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  Salons, rôles et permissions configurables à volonté.
                </p>
              </div>

              <div className="relative z-10 mt-5 flex items-center gap-1.5">
                {['bg-indigo-300', 'bg-sky-300', 'bg-emerald-300', 'bg-amber-300', 'bg-rose-300'].map((c, i) => (
                  <div
                    key={i}
                    className={`size-6 rounded-full border-2 border-card ${c}`}
                    style={{ marginLeft: i > 0 ? '-6px' : 0 }}
                  />
                ))}
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">+2.4k membres</span>
              </div>
            </Card>
          </Reveal>

          {/* Carte 4 — Auto-hébergement */}
          <Reveal delay={0.13}>
            <Card className="group relative flex min-h-[200px] gap-0 rounded-2xl p-7">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage:
                    'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
                aria-hidden
              />
              <div className="pointer-events-none absolute -top-10 -right-10 size-44 rounded-full bg-amber-400/10 opacity-60 blur-[55px] transition-opacity duration-500 group-hover:opacity-100" aria-hidden />

              <div className="relative z-10 flex items-start justify-between">
                <div className="flex size-12 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 shadow-sm">
                  <ServerIcon size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <Badge variant="outline" className="border-amber-500/25 bg-amber-500/10 font-mono text-amber-600 normal-case dark:text-amber-400">
                  Self-hosted
                </Badge>
              </div>

              <div className="relative z-10 mt-5 flex-1 space-y-2">
                <h3 className="font-heading text-[15.5px] font-bold text-foreground">Auto-hébergement</h3>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  Déployez votre nœud. Vos données restent chez vous.
                </p>
              </div>

              <div className="relative z-10 mt-5 flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2.5">
                <span className="select-none font-mono text-[11px] text-emerald-500">$</span>
                <span className="font-mono text-[10.5px] text-muted-foreground">docker compose up -d</span>
              </div>
            </Card>
          </Reveal>

          {/* Carte 5 — API ouverte */}
          <Reveal delay={0.16}>
            <Card className="group relative flex min-h-[200px] gap-0 rounded-2xl p-7">
              <div className="pointer-events-none absolute -right-10 -bottom-10 size-36 rounded-full bg-primary/15 opacity-80 blur-[50px] transition-opacity duration-500 group-hover:opacity-100" aria-hidden />

              <div className="relative z-10 flex size-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 shadow-sm">
                <BotIcon size={20} className="text-primary" />
              </div>

              <div className="relative z-10 mt-5 flex-1 space-y-2">
                <h3 className="font-heading text-[15.5px] font-bold text-foreground">API ouverte</h3>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  Créez des bots et intégrations via notre API documentée.
                </p>
              </div>

              <div className="relative z-10 mt-5 rounded-lg border border-border bg-muted px-3 py-2 font-mono text-[10.5px]">
                <span className="text-muted-foreground/70">GET </span>
                <span className="text-foreground">/api/v1/bots</span>
              </div>
            </Card>
          </Reveal>

        </div>
      </div>
    </section>
  );
}
