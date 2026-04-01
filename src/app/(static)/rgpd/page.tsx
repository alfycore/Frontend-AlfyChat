import { Metadata } from 'next';
import { Card } from '@heroui/react';
import { ShieldIcon, DownloadIcon, Trash2Icon, EyeIcon, FileCheckIcon, UserCheckIcon, ScaleIcon, MailIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'RGPD — Vos droits — AlfyChat',
  description: 'Conformité RGPD d\'AlfyChat. Exercez vos droits sur vos données personnelles.',
};

export default function RGPDPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/20">
            <ShieldIcon size={24} className="text-[var(--accent)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-[var(--foreground)]">RGPD — Vos droits</h1>
              <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500">Conforme</span>
            </div>
            <p className="text-[var(--muted)]">Règlement Général sur la Protection des Données</p>
          </div>
        </div>
        <p className="text-[var(--muted)]">
          AlfyChat s&apos;engage à respecter le RGPD (UE 2016/679). Vous disposez de droits
          concernant vos données personnelles que vous pouvez exercer à tout moment.
        </p>
      </div>

      <div className="space-y-6">
        <Section icon={EyeIcon} title="Droit d'accès" badge="Article 15">
          <p>
            Vous avez le droit de savoir quelles données nous détenons sur vous.
            Dans les <strong className="text-[var(--foreground)]">paramètres de votre compte</strong>, vous pouvez consulter
            l&apos;ensemble de vos informations personnelles.
          </p>
        </Section>

        <Section icon={DownloadIcon} title="Droit à la portabilité" badge="Article 20">
          <p>
            Vous pouvez exporter toutes vos données en format JSON depuis les paramètres de votre compte.
            L&apos;export comprend : profil, messages, amis, préférences et consentements.
          </p>
          <div className="mt-3 rounded-xl border border-[var(--accent)]/15 bg-[var(--accent)]/5 p-3 text-[var(--foreground)]">
            <p className="font-medium">Comment faire ?</p>
            <p className="text-[var(--muted)]">Paramètres → Confidentialité → Exporter mes données</p>
          </div>
        </Section>

        <Section icon={FileCheckIcon} title="Droit de rectification" badge="Article 16">
          <p>
            Vous pouvez modifier vos informations personnelles à tout moment depuis
            les paramètres de votre profil : nom d&apos;affichage, avatar, bio, email.
          </p>
        </Section>

        <Section icon={Trash2Icon} title="Droit à l'effacement" badge="Article 17">
          <p>
            Vous pouvez demander la suppression complète et irréversible de votre compte
            et de toutes vos données associées.
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>La suppression est effective sous <strong className="text-[var(--foreground)]">30 jours maximum</strong>.</li>
            <li>Toutes les données sont effacées : profil, messages, fichiers, sessions.</li>
            <li>Cette action est <strong className="text-[var(--foreground)]">irréversible</strong>.</li>
          </ul>
          <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-[var(--foreground)]">
            <p className="font-medium">Comment faire ?</p>
            <p className="text-[var(--muted)]">Paramètres → Confidentialité → Supprimer mon compte</p>
          </div>
        </Section>

        <Section icon={UserCheckIcon} title="Droit d'opposition et de limitation" badge="Articles 18 & 21">
          <p>
            Vous pouvez vous opposer au traitement de vos données ou en limiter l&apos;usage.
            Contactez notre DPO pour exercer ces droits.
          </p>
        </Section>

        <Section icon={ScaleIcon} title="Responsable du traitement">
          <div className="space-y-2">
            <p><strong className="text-[var(--foreground)]">Association AlfyCore</strong></p>
            <p>Association loi 1901</p>
            <p>Email : contact@alfycore.org</p>
            <p>DPO : dpo@alfycore.org</p>
          </div>
        </Section>

        <Section icon={MailIcon} title="Réclamation">
          <p>
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser
            une réclamation à la{' '}
            <strong className="text-[var(--foreground)]">Commission Nationale de l&apos;Informatique et des Libertés (CNIL)</strong> :
          </p>
          <p className="mt-2">
            <a
              href="https://www.cnil.fr/fr/plaintes"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--accent)] underline underline-offset-2 hover:opacity-80"
            >
              www.cnil.fr/fr/plaintes
            </a>
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, badge, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; badge?: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white/60 p-0 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.04]">
      <div className="px-5 pt-5 pb-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
          <Icon size={20} className="text-[var(--accent)]" />
          {title}
          {badge && (
            <span className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-0.5 text-xs font-normal text-[var(--muted)]">
              {badge}
            </span>
          )}
        </h3>
      </div>
      <div className="space-y-3 px-5 pb-5 text-sm leading-relaxed text-[var(--muted)]">
        {children}
      </div>
    </Card>
  );
}
