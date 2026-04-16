import { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ZapIcon, ShieldIcon, CodeIcon, SmileIcon, MicIcon, UsersIcon,
} from '@/components/icons';

export const metadata: Metadata = {
  title: 'Espace actualités — AlfyChat',
  description: 'Toutes les dernières actualités, mises à jour et annonces d\'AlfyChat et d\'AlfyCore.',
};

const news = [
  {
    date: 'Juin 2026',
    tag: 'Mise à jour majeure',
    tagVariant: 'default' as const,
    icon: ZapIcon,
    title: 'AlfyChat v2.0 — Refonte complète',
    summary: 'Interface entièrement redessinée, infrastructure microservices Go, Tailwind v4, nouveau design system basé sur HeroUI. Performance et accessibilité améliorées sur toutes les plateformes.',
    items: [
      'Nouveau design system — composants redessinés avec HeroUI React',
      'Serveur Go (server-node-go) : latence réduite de 40 %',
      'Application mobile React Native (alfychat-rn)',
      'Système de thèmes sombre / clair / automatique',
      'Refonte de la charte graphique — Krona One comme typographie principale',
    ],
  },
  {
    date: 'Février 2026',
    tag: 'Sécurité',
    tagVariant: 'outline' as const,
    icon: ShieldIcon,
    title: 'Chiffrement niveau 3 — Clés éphémères généralisées',
    summary: 'Le chiffrement de niveau 3 est désormais disponible pour tous les DMs. Les clés sont générées côté client et détruites après lecture. Même AlfyCore ne peut pas lire vos messages.',
    items: [
      'AES-256-GCM + clés éphémères pour tous les messages directs',
      'Indicateur visuel de niveau de chiffrement actif',
      'Audit de sécurité indépendant publié — rapport disponible',
      'Suppression automatique des messages après 30 / 90 jours (configurable)',
    ],
  },
  {
    date: 'Octobre 2025',
    tag: 'Fonctionnalité',
    tagVariant: 'secondary' as const,
    icon: MicIcon,
    title: 'Appels HD — Vidéo & Vocal améliorés',
    summary: 'Nouveau moteur d\'appel avec réduction de bruit IA, qualité vidéo jusqu\'à 1080p30, et support des salles vocales permanentes sur les serveurs.',
    items: [
      'Qualité vidéo 1080p30 en appel de groupe',
      'Réduction de bruit IA intégrée (côté client)',
      'Salles vocales persistantes sur les serveurs communautaires',
      'Partage d\'écran avec audio système',
      'Nouvelle interface d\'appel flottante',
    ],
  },
  {
    date: 'Juillet 2025',
    tag: 'Beta ouverte',
    tagVariant: 'outline' as const,
    icon: UsersIcon,
    title: 'Beta publique — Bienvenue à tous !',
    summary: 'Après deux ans de développement, AlfyChat ouvre ses portes à la communauté. Créez votre compte, rejoignez un serveur et donnez-nous vos retours.',
    items: [
      '5 000 comptes créés les 48 premières heures',
      'Serveurs communautaires disponibles dès l\'inscription',
      'Système de bots et d\'intégrations ouvert aux développeurs',
      'Application Flutter disponible sur Android et iOS',
      'Programme de bêta-testeurs avec accès prioritaire aux nouvelles fonctionnalités',
    ],
  },
  {
    date: 'Mars 2025',
    tag: 'Infrastructure',
    tagVariant: 'secondary' as const,
    icon: CodeIcon,
    title: 'Passage à l\'architecture microservices',
    summary: 'AlfyChat migre d\'un monolithe Node.js vers une architecture distribuée : gateway, messages, users, bots, calls, friends — chaque service indépendant.',
    items: [
      '7 microservices indépendants déployés via Docker Compose',
      'Gateway Nginx avec rate-limiting et JWT',
      'MySQL + Redis pour le cache de présence et sessions',
      'Temps de déploiement divisé par 3',
    ],
  },
  {
    date: 'Décembre 2024',
    tag: 'Communauté',
    tagVariant: 'outline' as const,
    icon: SmileIcon,
    title: 'Émojis personnalisés & réactions',
    summary: 'Ajoutez vos propres émojis sur vos serveurs et réagissez aux messages avec des émojis standards ou personnalisés.',
    items: [
      'Upload d\'émojis personnalisés par serveur (admin requis)',
      'Réactions rapides sur les messages',
      'Picker emoji intégré avec recherche',
      'Support des émojis animés (GIF)',
    ],
  },
];

export default function NewsroomPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-16 px-6 py-16">

      {/* Hero */}
      <div className="space-y-4">
        <Badge variant="outline" className="text-[10px] font-mono">Espace actualités</Badge>
        <h1 className="font-heading text-4xl leading-tight">
          Le fil des nouveautés<br />AlfyChat.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
          Mises à jour, annonces et jalons importants du projet AlfyChat et d&apos;AlfyCore.
        </p>
      </div>

      <Separator />

      {/* News feed */}
      <div className="space-y-6">
        {news.map(({ date, tag, tagVariant, icon: Icon, title, summary, items }) => (
          <article key={title} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{date}</span>
                <Badge variant={tagVariant} className="text-[10px]">
                  <Icon size={10} />
                  {tag}
                </Badge>
              </div>
              <div className="space-y-2">
                <h2 className="font-heading text-lg leading-snug">{title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
              </div>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-primary/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <Separator />

      {/* Abonnement */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <p className="font-heading text-sm">Restez informé</p>
        <p className="text-sm text-muted-foreground">
          Pour suivre les actualités d&apos;AlfyChat, rejoignez notre serveur officiel ou suivez-nous sur nos réseaux.
          Vous pouvez aussi vous inscrire à notre newsletter technique à{' '}
          <a href="mailto:news@alfycore.fr" className="text-primary hover:underline">news@alfycore.fr</a>.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline" className="text-[10px] cursor-pointer hover:border-primary/50 hover:text-primary transition-colors">
            <i className="fi fi-brands-github" style={{ fontSize: 10 }} />
            GitHub — AlfyChatV2
          </Badge>
          <Badge variant="outline" className="text-[10px] cursor-pointer hover:border-primary/50 hover:text-primary transition-colors">
            <i className="fi fi-brands-discord" style={{ fontSize: 10 }} />
            Discord officiel
          </Badge>
          <Badge variant="outline" className="text-[10px] cursor-pointer hover:border-primary/50 hover:text-primary transition-colors">
            <i className="fi fi-brands-twitter-alt" style={{ fontSize: 10 }} />
            @AlfyChat
          </Badge>
        </div>
      </div>

    </div>
  );
}
