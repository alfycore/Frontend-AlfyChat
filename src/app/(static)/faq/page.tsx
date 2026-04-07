import { Metadata } from 'next';
import { Card } from '@heroui/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  HelpCircleIcon,
  MessageCircleIcon,
  ShieldIcon,
  LockIcon,
  UsersIcon,
  PhoneIcon,
  BotIcon,
  ServerIcon,
  CreditCardIcon,
  DownloadIcon,
  Trash2Icon,
  SettingsIcon,
} from '@/components/icons';

export const metadata: Metadata = {
  title: 'FAQ — AlfyChat',
  description: 'Foire aux questions AlfyChat. Trouvez les réponses à vos questions sur la messagerie.',
};

const faqSections = [
  {
    title: 'Général',
    icon: HelpCircleIcon,
    items: [
      {
        q: 'Qu\'est-ce qu\'AlfyChat ?',
        a: 'AlfyChat est une plateforme de messagerie instantanée française, open source et conforme RGPD. Elle propose du chiffrement à 3 niveaux, des appels HD, des serveurs communautaires et des bots personnalisés.',
      },
      {
        q: 'Qui gère AlfyChat ?',
        a: 'AlfyChat est développé et géré par AlfyCore, une association loi 1901 à but non lucratif. Notre mission est de proposer une alternative respectueuse de la vie privée.',
      },
      {
        q: 'AlfyChat est-il gratuit ?',
        a: 'Oui, AlfyChat est entièrement gratuit. Le projet est financé par les dons et le soutien de la communauté.',
      },
      {
        q: 'Quel âge minimum pour s\'inscrire ?',
        a: 'Vous devez avoir au moins 13 ans pour créer un compte AlfyChat, conformément à la législation française.',
      },
    ],
  },
  {
    title: 'Sécurité & Chiffrement',
    icon: LockIcon,
    items: [
      {
        q: 'Qu\'est-ce que le chiffrement à 3 niveaux ?',
        a: 'Niveau 1 : chiffrement en transit (TLS). Niveau 2 : chiffrement AES-256-GCM côté serveur. Niveau 3 : clés éphémères, même AlfyCore ne peut pas lire vos messages — les clés sont détruites après lecture.',
      },
      {
        q: 'Mes messages peuvent-ils être lus par AlfyCore ?',
        a: 'En niveau 1, techniquement oui (pour la modération). En niveau 2, uniquement si nécessaire pour une obligation légale. En niveau 3, c\'est impossible : nous n\'avons pas accès aux clés.',
      },
      {
        q: 'Où sont stockées mes données ?',
        a: 'Toutes les données sont hébergées en France, sur des serveurs souverains. Aucun transfert hors UE.',
      },
    ],
  },
  {
    title: 'Messages & Conversations',
    icon: MessageCircleIcon,
    items: [
      {
        q: 'Puis-je modifier ou supprimer un message ?',
        a: 'Oui, vous pouvez modifier ou supprimer vos messages. En niveau de chiffrement 3, la suppression est automatique après lecture.',
      },
      {
        q: 'Y a-t-il une limite de taille pour les fichiers ?',
        a: 'Les images sont limitées à 10 Mo et sont automatiquement optimisées en WebP. Le support de fichiers plus volumineux est prévu.',
      },
      {
        q: 'Les réactions aux messages sont-elles supportées ?',
        a: 'Oui ! Vous pouvez réagir avec des emojis sur n\'importe quel message.',
      },
    ],
  },
  {
    title: 'Appels',
    icon: PhoneIcon,
    items: [
      {
        q: 'Comment fonctionne les appels ?',
        a: 'Les appels utilisent WebRTC pour une communication peer-to-peer en haute qualité. Appels vocaux, vidéo et partage d\'écran sont disponibles.',
      },
      {
        q: 'Les appels sont-ils chiffrés ?',
        a: 'Oui, WebRTC chiffre nativement les flux audio et vidéo en SRTP (Secure Real-Time Protocol).',
      },
    ],
  },
  {
    title: 'Serveurs & Communautés',
    icon: ServerIcon,
    items: [
      {
        q: 'Comment créer un serveur ?',
        a: 'Cliquez sur le "+" dans la barre latérale pour créer votre serveur. Vous pourrez ajouter des canaux, gérer les rôles et inviter des membres.',
      },
      {
        q: 'Puis-je héberger mon propre serveur ?',
        a: 'La fonctionnalité de serveurs P2P auto-hébergés est en développement. Vous pourrez héberger vos propres serveurs comme sur TeamSpeak.',
      },
    ],
  },
  {
    title: 'Bots',
    icon: BotIcon,
    items: [
      {
        q: 'Puis-je créer mon propre bot ?',
        a: 'Oui, AlfyChat fournit une API pour créer vos propres bots. Consultez la documentation développeur pour en savoir plus.',
      },
    ],
  },
  {
    title: 'Compte & Données',
    icon: SettingsIcon,
    items: [
      {
        q: 'Comment exporter mes données ?',
        a: 'Allez dans Paramètres → Confidentialité → Exporter mes données. Vous recevrez un fichier JSON contenant toutes vos informations.',
      },
      {
        q: 'Comment supprimer mon compte ?',
        a: 'Allez dans Paramètres → Confidentialité → Supprimer mon compte. La suppression est irréversible et effective sous 30 jours.',
      },
      {
        q: 'Puis-je changer mon nom d\'utilisateur ?',
        a: 'Le nom d\'utilisateur ne peut pas être modifié après l\'inscription. Vous pouvez cependant changer votre nom d\'affichage à tout moment.',
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--accent)]/10">
            <HugeiconsIcon icon={HelpCircleIcon} size={24} className="text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Foire aux Questions</h1>
            <p className="text-[var(--muted)]">Les réponses à vos questions fréquentes</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {faqSections.map((section) => (
          <div key={section.title}>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-[var(--foreground)]">
              <HugeiconsIcon icon={section.icon} size={20} className="text-[var(--accent)]" />
              {section.title}
            </h2>
            <div className="space-y-3">
              {section.items.map((item, i) => (
                <Card key={i} className="border border-[var(--border)] bg-[var(--surface)] p-0">
                  <div className="px-5 py-4">
                    <p className="mb-2 font-medium text-[var(--foreground)]">{item.q}</p>
                    <p className="text-sm leading-relaxed text-[var(--muted)]">{item.a}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Contact */}
      <Card className="mt-10 border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-0">
        <div className="px-5 py-6 text-center">
          <p className="mb-1 text-lg font-semibold text-[var(--foreground)]">Vous n&apos;avez pas trouvé votre réponse ?</p>
          <p className="text-sm text-[var(--muted)]">
            Contactez-nous à{' '}
            <a href="mailto:support@alfycore.org" className="font-medium text-[var(--accent)] underline underline-offset-2">
              support@alfycore.org
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
