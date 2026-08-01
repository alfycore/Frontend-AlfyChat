'use client';

/** /uitest/settings/user — paramètres du compte : confidentialité, sécurité, clés, sessions. */

import { Archive, Bell, Eye, KeyRound, Languages, LayoutTemplate, Lock, Mic, MonitorSmartphone, Palette, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { SettingsShell } from '@/components/alfy/settings/settings-shell';
import { AccountPanel } from '@/components/alfy/settings/user/account-panel';
import { PrivacyPanel } from '@/components/alfy/settings/user/privacy-panel';
import { SecurityPanel } from '@/components/alfy/settings/user/security-panel';
import { KeysPanel } from '@/components/alfy/settings/user/keys-panel';
import { SessionsPanel } from '@/components/alfy/settings/user/sessions-panel';
import { AppearancePanel } from '@/components/alfy/settings/user/appearance-panel';
import { VoicePanel } from '@/components/alfy/settings/user/voice-panel';
import { NotificationsPanel } from '@/components/alfy/settings/user/notifications-panel';
import { LanguagePanel } from '@/components/alfy/settings/user/language-panel';
import { LayoutPanel } from '@/components/alfy/settings/user/layout-panel';
import { ArchivesPanel } from '@/components/alfy/settings/user/archives-panel';

export default function UitestUserSettingsPage() {
  const router = useRouter();
  return (
    <SettingsShell
      title="Karlo"
      subtitle="Paramètres du compte"
      onClose={() => router.push('/uitest/app')}
      navFooter={
        <p className="text-[10px] text-muted select-none">
          AlfyChat · atelier alfy
          <br />
          HeroUI v3 · mock data
        </p>
      }
      groups={[
        {
          label: 'Compte',
          items: [
            { id: 'account', label: 'Mon compte', icon: UserRound, content: <AccountPanel /> },
            { id: 'privacy', label: 'Confidentialité', icon: Eye, content: <PrivacyPanel /> },
          ],
        },
        {
          label: 'Sécurité',
          items: [
            { id: 'security', label: 'Connexion & 2FA', icon: Lock, content: <SecurityPanel /> },
            { id: 'keys', label: 'Clés de chiffrement', icon: KeyRound, content: <KeysPanel /> },
            { id: 'sessions', label: 'Sessions actives', icon: MonitorSmartphone, content: <SessionsPanel /> },
            { id: 'archives', label: 'Archives', icon: Archive, content: <ArchivesPanel /> },
          ],
        },
        {
          label: 'Application',
          items: [
            { id: 'voice', label: 'Voix & vidéo', icon: Mic, content: <VoicePanel /> },
            { id: 'notifications', label: 'Notifications', icon: Bell, content: <NotificationsPanel /> },
            { id: 'appearance', label: 'Apparence', icon: Palette, content: <AppearancePanel /> },
            { id: 'layout', label: 'Mise en page', icon: LayoutTemplate, content: <LayoutPanel /> },
            { id: 'language', label: 'Langue', icon: Languages, content: <LanguagePanel /> },
          ],
        },
      ]}
    />
  );
}
