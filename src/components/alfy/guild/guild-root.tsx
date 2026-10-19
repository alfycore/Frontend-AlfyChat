'use client';

/**
 * Racine du module serveur, montée une fois par la coquille /channels :
 * menu contextuel global, abonnements temps réel, présence vocale, erreurs
 * lisibles, et toutes les fenêtres (création, invitation, réglages…).
 */

import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import { ContextMenuProvider } from '@/components/alfy/guild/context-menu';
import { useGuildRealtime } from '@/components/alfy/guild/realtime';
import { setGuildErrorLabels } from '@/components/alfy/guild/actions';
import { useVoicePresenceSync } from '@/components/alfy/guild/voice/use-guild-voice';
import { CallMirrorSync } from '@/components/alfy/guild/voice/call-mirror';
import { useConversationRealtime } from '@/components/alfy/conversation/realtime';
import { CustomStatusDialog } from '@/components/alfy/status/custom-status-dialog';
import { useStatusExpiry } from '@/components/alfy/status/use-status';
import { useMessageErrorToasts } from '@/components/alfy/guild/chat/text-channel-view';
import { CreateChannelDialog } from '@/components/alfy/guild/dialogs/create-channel';
import { InviteDialog } from '@/components/alfy/guild/dialogs/invite';
import { ServerEntryDialog } from '@/components/alfy/guild/dialogs/server-entry';
import {
  ConfirmDialog,
  MemberActionDialog,
  NotificationsDialog,
  ServerProfileDialog,
} from '@/components/alfy/guild/dialogs/small-dialogs';
import { ServerSettingsDialog } from '@/components/alfy/guild/settings/server-settings';
import { ChannelSettingsDialog } from '@/components/alfy/guild/settings/channel-settings';

function GuildEffects() {
  const { t } = useTranslation();
  const { user } = useAuth();
  useGuildRealtime(user?.id);
  // MP et groupes : un seul jeu d'écouteurs, déchiffrement + coffre.
  useConversationRealtime();
  // Statut « pour 1 h », statut perso « effacer après 4 h » : échéances appliquées ici.
  useStatusExpiry();
  useVoicePresenceSync();
  useMessageErrorToasts();

  useEffect(() => {
    setGuildErrorLabels({
      default: t.guild.errors.default,
      PERMISSION_DENIED: t.guild.errors.permissionDenied,
      TARGET_OUTRANKS_YOU: t.guild.errors.outranks,
      CHANNEL_FULL: t.guild.voice.channelFull,
      NOT_IN_VOICE: t.guild.errors.notInVoice,
      NOT_SUPPORTED_ON_NODE: t.guild.errors.notOnNode,
      INVALID_PAYLOAD: t.guild.errors.invalid,
      CHANNEL_EMPTY: t.guild.errors.channelEmpty,
      timeout: t.guild.errors.timeout,
    });
  }, [t]);
  return null;
}

export function GuildRoot({ children }: { children: ReactNode }) {
  return (
    <ContextMenuProvider>
      {/* Avant GuildEffects : les gestes vocaux passent par le miroir d'appel. */}
      <CallMirrorSync />
      <GuildEffects />
      {children}
      <CreateChannelDialog />
      <InviteDialog />
      <ServerEntryDialog />
      <ServerProfileDialog />
      <NotificationsDialog />
      <MemberActionDialog />
      <ServerSettingsDialog />
      <ChannelSettingsDialog />
      <ConfirmDialog />
      <CustomStatusDialog />
    </ContextMenuProvider>
  );
}
