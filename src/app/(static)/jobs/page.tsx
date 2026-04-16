import { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  CodeIcon, ShieldIcon, PencilIcon, HeartIcon, GlobeIcon, UsersIcon,
} from '@/components/icons';

export const metadata: Metadata = {
  title: 'Emplois — AlfyChat',
  description: 'Rejoignez AlfyCore et contribuez à construire la messagerie privée de demain.',
};

const openings = [
  {
    title: 'Développeur·se Full-Stack TypeScript',
    team: 'Ingénierie',
    type: 'Bénévolat',
    location: 'Télétravail',
    icon: CodeIcon,
    skills: ['Node.js', 'Next.js', 'Prisma', 'TypeScript'],
    description: 'Contribuer au backend (microservices NestJS) et au frontend React/Next.js. Participation aux code reviews et à l\'architecture.',
  },
  {
    title: 'Développeur·se Go — Infrastructure',
    team: 'Ingénierie',
    type: 'Bénévolat',
    location: 'Télétravail',
    icon: CodeIcon,
    skills: ['Go', 'gRPC', 'Docker', 'Linux'],
    description: 'Participer au développement du serveur Go (server-node-go) : API REST, WebSocket, performance et scalabilité.',
  },
  {
    title: 'Ingénieur·e Sécurité',
    team: 'Sécurité',
    type: 'Bénévolat',
    location: 'Télétravail',
    icon: ShieldIcon,
    skills: ['Cryptographie', 'OWASP', 'Audit', 'Linux'],
    description: 'Auditer l\'implémentation du chiffrement E2E, identifier les vulnérabilités, rédiger des rapports et proposer des corrections.',
  },
  {
    title: 'Designer UI/UX',
    team: 'Design',
    type: 'Bénévolat',
    location: 'Télétravail',
    icon: PencilIcon,
    skills: ['Figma', 'Tailwind', 'Design system', 'Accessibilité'],
    description: 'Concevoir et affiner l\'interface d\'AlfyChat : composants, mobile (Flutter & React Native), système de design.',
  },
  {
    title: 'Community Manager & Communication',
    team: 'Communication',
    type: 'Bénévolat',
    location: 'Télétravail',
    icon: UsersIcon,
    skills: ['Réseaux sociaux', 'Rédaction', 'Modération'],
    description: 'Animer la communauté AlfyChat, publier des actualités, rédiger des articles et gérer les retours utilisateurs.',
  },
  {
    title: 'Rédacteur·rice technique',
    team: 'Documentation',
    type: 'Bénévolat',
    location: 'Télétravail',
    icon: GlobeIcon,
    skills: ['Markdown', 'API REST', 'Rédaction technique'],
    description: 'Documenter les API, rédiger des guides d\'installation, améliorer les pages wiki et les README.',
  },
];

export default function JobsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-16 px-6 py-16">

      {/* Hero */}
      <div className="space-y-4">
        <Badge variant="outline" className="text-[10px] font-mono">Emplois</Badge>
        <h1 className="font-heading text-4xl leading-tight">
          Construisons ensemble<br />la messagerie de demain.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
          AlfyCore est une association loi 1901 à but non lucratif. Nos postes sont des missions bénévoles — rejoignez-nous pour contribuer à un projet open source qui a de l&apos;impact.
        </p>
      </div>

      <Separator />

      {/* Pourquoi nous rejoindre */}
      <div className="space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Pourquoi nous rejoindre</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { Icon: HeartIcon, title: 'Impact réel', desc: 'Votre code est utilisé par de vraies personnes qui ont besoin de communiquer en privé.' },
            { Icon: CodeIcon, title: 'Stack moderne', desc: 'TypeScript, Next.js 15, Go, Flutter, React Native, Tailwind v4.' },
            { Icon: GlobeIcon, title: '100 % open source', desc: 'Tout ce que vous développez est visible et réutilisable par la communauté.' },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <Icon size={16} className="text-primary" />
              </div>
              <p className="font-heading text-sm">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Offres */}
      <div className="space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Missions ouvertes — {openings.length} postes disponibles
        </p>
        <div className="space-y-3">
          {openings.map(({ title, team, type, location, icon: Icon, skills, description }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                  <Icon size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-heading text-sm">{title}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">{team}</Badge>
                    <Badge variant="outline" className="text-[10px] text-success border-success/30">{type}</Badge>
                    <Badge variant="outline" className="text-[10px]">{location}</Badge>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>
              <div className="flex flex-wrap gap-1.5">
                {skills.map(s => (
                  <span key={s} className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {s}
                  </span>
                ))}
              </div>
              <Button size="sm" variant="outline" asChild>
                <a href={`mailto:jobs@alfycore.fr?subject=${encodeURIComponent(title)}`}>
                  Postuler — jobs@alfycore.fr
                </a>
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* CTA spontanée */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <p className="font-heading text-sm">Candidature spontanée</p>
        <p className="text-sm text-muted-foreground">
          Vous ne trouvez pas de poste correspondant à votre profil, mais vous souhaitez contribuer ? Envoyez-nous un message, nous sommes toujours à la recherche de personnes motivées.
        </p>
        <Button variant="outline" asChild>
          <a href="mailto:jobs@alfycore.fr">
            Candidature spontanée — jobs@alfycore.fr
          </a>
        </Button>
      </div>

    </div>
  );
}
