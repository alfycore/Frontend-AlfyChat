'use client';

/**
 * Container : réglages du compte, branchés sur l'API réelle.
 * Remplace atelier/dialogs/user-settings/UserSettings.
 */

import {
  Accessibility,
  Archive,
  Bell,
  Eye,
  KeyRound,
  Languages,
  LayoutTemplate,
  Lock,
  LogOut,
  MessagesSquare,
  Mic,
  MonitorSmartphone,
  Palette,
  UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { SettingsOverlay } from '@/components/alfy/settings/settings-overlay';
import { SettingsShell } from '@/components/alfy/settings/settings-shell';
import { AccountPanel, type AccountProfilePatch } from '@/components/alfy/settings/user/account-panel';
import { PrivacyPanel } from '@/components/alfy/settings/user/privacy-panel';
import { SecurityPanel } from '@/components/alfy/settings/user/security-panel';
import { KeysPanel } from '@/components/alfy/settings/user/keys-panel';
import { SessionsPanel } from '@/components/alfy/settings/user/sessions-panel';
import { AppearancePanel } from '@/components/alfy/settings/user/appearance-panel';
import { VoicePanel } from '@/components/alfy/settings/user/voice-panel';
import { NotificationsPanel } from '@/components/alfy/settings/user/notifications-panel';
import { LanguagePanel } from '@/components/alfy/settings/user/language-panel';
import { LayoutPanel } from '@/components/alfy/settings/user/layout-panel';
import { ChatPanel } from '@/components/alfy/settings/user/chat-panel';
import { AccessibilityPanel } from '@/components/alfy/settings/user/accessibility-panel';
import { ArchivesPanel } from '@/components/alfy/settings/user/archives-panel';
import { toAlfyUser } from '@/components/alfy/live/map';
import type { AlfySession } from '@/components/alfy/mock/types';

/** Devine un libellé d'appareil lisible depuis le user-agent. */
function deviceLabel(ua: string | null): string {
  if (!ua) return 'Appareil inconnu';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ios/i.test(ua)) return 'iOS';
  if (/mac os|macintosh/i.test(ua)) return 'Mac';
  if (/windows/i.test(ua)) return 'Windows';
  if (/linux/i.test(ua)) return 'Linux';
  return ua.slice(0, 40);
}

export function AlfyUserSettings({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, updateUser, logout } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<AlfySession[] | undefined>(undefined);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const handleLogout = useCallback(async () => {
    onOpenChange(false);
    await logout();
    router.push('/login');
  }, [logout, onOpenChange, router]);

  const alfyUser = useMemo(
    () => toAlfyUser(user as Record<string, unknown> | null, user?.id ?? 'me'),
    [user],
  );

  /* Sessions : chargées à l'ouverture seulement */
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await api.getSessions();
      const raw = (res as { data?: { sessions?: unknown[] } })?.data?.sessions ?? [];
      setSessions(
        (raw as Record<string, unknown>[]).map((s, i) => ({
          id: s.id as string,
          device: deviceLabel((s.userAgent as string) ?? null),
          location: (s.ipAddress as string) ?? 'Adresse inconnue',
          lastActiveAt: (s.createdAt as string) ?? new Date().toISOString(),
          // La session courante n'est pas marquée par l'API : la plus récente.
          current: i === 0,
        })),
      );
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) void loadSessions();
  }, [isOpen, loadSessions]);

  const revoke = useCallback(
    async (sessionId: string) => {
      await api.revokeSession(sessionId).catch(() => null);
      void loadSessions();
    },
    [loadSessions],
  );

  const revokeOthers = useCallback(async () => {
    const others = (sessions ?? []).filter((s) => !s.current);
    await Promise.all(others.map((s) => api.revokeSession(s.id).catch(() => null)));
    void loadSessions();
  }, [sessions, loadSessions]);

  const saveProfile = useCallback(
    async (data: AccountProfilePatch): Promise<boolean> => {
      // `customStatus` ne fait pas partie du profil côté API : il est porté par
      // la présence. On le garde uniquement dans l'état local, sinon le prochain
      // battement de `usePresence` réémettrait l'ancienne valeur.
      const { customStatus, ...profil } = data;
      const res = await api.updateProfile(profil).catch(() => ({ success: false }) as const);
      // N'appliquer l'état local que si l'écriture a réellement réussi : sinon
      // le panneau affichait "Profil enregistré" et gardait les nouvelles
      // valeurs à l'écran même quand la requête avait échoué (rien de persisté
      // côté serveur, mais aucune indication à l'utilisateur).
      if (!res.success) return false;
      updateUser({ ...profil, customStatus: customStatus || null });
      return true;
    },
    [updateUser],
  );

  return (
    <SettingsOverlay isOpen={isOpen} onOpenChange={onOpenChange}>
      <SettingsShell
        title={alfyUser.displayName}
        subtitle="Paramètres du compte"
        onClose={() => onOpenChange(false)}
        navFooter={
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-danger transition-colors duration-100 hover:bg-danger/10"
          >
            <LogOut className="size-4 shrink-0 opacity-80" aria-hidden />
            Se déconnecter
          </button>
        }
        groups={[
          {
            label: 'Compte',
            items: [
              {
                id: 'account',
                label: 'Mon compte',
                icon: UserRound,
                content: <AccountPanel user={alfyUser} onSave={saveProfile} />,
              },
              { id: 'privacy', label: 'Confidentialité', icon: Eye, content: <PrivacyPanel /> },
            ],
          },
          {
            label: 'Sécurité',
            items: [
              { id: 'security', label: 'Connexion & 2FA', icon: Lock, content: <SecurityPanel /> },
              { id: 'keys', label: 'Clés de chiffrement', icon: KeyRound, content: <KeysPanel /> },
              {
                id: 'sessions',
                label: 'Sessions actives',
                icon: MonitorSmartphone,
                content: (
                  <SessionsPanel
                    sessions={sessions}
                    loading={loadingSessions}
                    onRevoke={(id) => void revoke(id)}
                    onRevokeOthers={() => void revokeOthers()}
                  />
                ),
              },
              { id: 'archives', label: 'Archives', icon: Archive, content: <ArchivesPanel /> },
            ],
          },
          {
            label: 'Application',
            items: [
              { id: 'voice', label: 'Voix & vidéo', icon: Mic, content: <VoicePanel /> },
              { id: 'notifications', label: 'Notifications', icon: Bell, content: <NotificationsPanel /> },
              { id: 'appearance', label: 'Apparence', icon: Palette, content: <AppearancePanel /> },
              { id: 'chat', label: 'Chat', icon: MessagesSquare, content: <ChatPanel /> },
              { id: 'accessibility', label: 'Accessibilité', icon: Accessibility, content: <AccessibilityPanel /> },
              { id: 'layout', label: 'Mise en page', icon: LayoutTemplate, content: <LayoutPanel /> },
              { id: 'language', label: 'Langue', icon: Languages, content: <LanguagePanel /> },
            ],
          },
        ]}
      />
    </SettingsOverlay>
  );
}
