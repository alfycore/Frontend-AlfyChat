import { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ShieldIcon, HeartIcon, UsersIcon, GlobeIcon, ZapIcon, StarIcon,
} from '@/components/icons';

export const metadata: Metadata = {
  title: 'À propos — AlfyChat',
  description: 'AlfyChat est développé par AlfyCore, une association loi 1901 à but non lucratif dédiée à la communication privée et sécurisée.',
};

const values = [
  {
    Icon: ShieldIcon,
    title: 'Vie privée d\'abord',
    description: 'Chiffrement à 3 niveaux, données hébergées en France, aucun profilage publicitaire. Votre vie privée n\'est pas un produit.',
  },
  {
    Icon: HeartIcon,
    title: 'Communauté & partage',
    description: 'AlfyChat est né d\'une communauté et reste ouvert à tous. Le code est open source, les retours de la communauté guidant nos priorités.',
  },
  {
    Icon: GlobeIcon,
    title: 'Souveraineté numérique',
    description: 'Hébergement 100 % en France, conformité RGPD native, alternatives aux géants américains — pour un internet plus indépendant.',
  },
  {
    Icon: ZapIcon,
    title: 'Performance & fiabilité',
    description: 'Architecture microservices, appels HD, faible latence. On vise la qualité d\'un service professionnel avec les valeurs d\'un projet associatif.',
  },
  {
    Icon: UsersIcon,
    title: 'Inclusion & accessibilité',
    description: 'Gratuit pour tous, sans publicité, sans revente de données. Disponible sur toutes les plateformes : web, mobile, bureau.',
  },
  {
    Icon: StarIcon,
    title: 'Transparence',
    description: 'Nos comptes, nos décisions et notre feuille de route sont publics. AlfyCore s\'engage à la transparence totale avec ses utilisateurs.',
  },
];

const milestones = [
  { year: '2022', label: 'Création d\'AlfyCore', desc: 'Association loi 1901 fondée par des passionnés de tech et de vie privée.' },
  { year: '2023', label: 'Premier prototype', desc: 'Lancement du MVP : messagerie directe et serveurs communautaires.' },
  { year: '2024', label: 'Chiffrement E2E niveau 3', desc: 'Ajout du chiffrement à clés éphémères, côté client uniquement.' },
  { year: '2025', label: 'Beta ouverte', desc: 'Ouverture à la communauté, appels HD, bots, application mobile.' },
  { year: '2026', label: 'AlfyChat v2', desc: 'Refonte complète de l\'interface, performance, infrastructure Go.' },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-16 px-6 py-16">

      {/* Hero */}
      <div className="space-y-4">
        <Badge variant="outline" className="text-[10px] font-mono">À propos</Badge>
        <h1 className="font-heading text-4xl leading-tight">
          Une messagerie construite<br />avec des valeurs.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
          AlfyChat est développé par <strong className="text-foreground">AlfyCore</strong>, une association loi 1901 à but non lucratif. Notre mission : offrir une communication privée, sécurisée et souveraine à tous.
        </p>
      </div>

      <Separator />

      {/* Mission */}
      <div className="space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Notre mission</p>
        <p className="text-base text-muted-foreground leading-relaxed">
          Nous croyons que communiquer en privé est un <strong className="text-foreground">droit fondamental</strong>, pas un privilège. Face aux géants du numérique qui monétisent vos conversations, AlfyCore propose une alternative libre, transparente et hébergée en France.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed">
          AlfyChat n'est pas financé par la publicité. Il vit grâce aux dons, au bénévolat et au soutien de sa communauté. Chaque ligne de code est écrite avec l'intention de protéger — pas d'exploiter.
        </p>
      </div>

      <Separator />

      {/* Valeurs */}
      <div className="space-y-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Nos valeurs</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {values.map(({ Icon, title, description }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Icon size={16} className="text-primary" />
                </div>
                <p className="font-heading text-sm">{title}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Timeline */}
      <div className="space-y-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Notre histoire</p>
        <div className="relative space-y-0 border-l border-border pl-6">
          {milestones.map(({ year, label, desc }) => (
            <div key={year} className="relative pb-8 last:pb-0">
              <div className="absolute -left-[25px] flex size-3 items-center justify-center rounded-full border-2 border-primary bg-background" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-primary">{year}</span>
                  <span className="font-heading text-sm">{label}</span>
                </div>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Stats */}
      <div className="space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">AlfyChat en chiffres</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { value: '100 %', label: 'Open source' },
            { value: 'Loi 1901', label: 'Association' },
            { value: 'France', label: 'Hébergement' },
            { value: '0 €', label: 'Pub / revente' },
          ].map(({ value, label }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 text-center space-y-1">
              <p className="font-heading text-2xl text-primary">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Contact */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-2">
        <p className="font-heading text-sm">Contact</p>
        <p className="text-sm text-muted-foreground">
          Pour toute question concernant l&apos;association AlfyCore, vous pouvez nous contacter à{' '}
          <a href="mailto:contact@alfycore.fr" className="text-primary hover:underline">contact@alfycore.fr</a>.
          Pour les signalements de sécurité : <a href="mailto:security@alfycore.fr" className="text-primary hover:underline">security@alfycore.fr</a>.
        </p>
        <p className="text-xs text-muted-foreground">
          <strong>AlfyCore</strong> · Association loi 1901 · France
        </p>
      </div>

    </div>
  );
}
