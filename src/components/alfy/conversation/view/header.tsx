'use client';

/**
 * En-tête d'une conversation, au gabarit Discord : identité à gauche
 * (avatar + statut, nom, @pseudo / nombre de membres, pastille de chiffrement),
 * actions à droite (appels, recherche, notifications, membres / profil).
 */

import { Button, Separator, Toolbar, Tooltip } from '@heroui/react';
import { Menu, PanelRight, Phone, Settings, UserPlus, Users, Video } from 'lucide-react';
import type { ReactNode } from 'react';

import { SearchPanel } from '@/components/alfy/chat/search-panel';
import { NotificationCenter } from '@/components/alfy/notifications/notification-center';
import { ChannelNotifSettings } from '@/components/alfy/notifications/channel-notif-settings';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import type { AlfyMessage, AlfyPresence } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';
import { E2eePill } from '@/components/alfy/conversation/view/e2ee';

function HeaderButton({ label, onPress, active, children }: { label: string; onPress: () => void; active?: boolean; children: ReactNode }) {
  return (
    <Tooltip delay={300} closeDelay={0}>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={label}
        aria-pressed={active}
        className={active ? 'text-foreground' : 'text-muted hover:text-foreground'}
        onPress={onPress}
      >
        {children}
      </Button>
      <Tooltip.Content placement="bottom">
        <p>{label}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}

export interface ConversationHeaderProps {
  kind: 'dm' | 'group';
  /** Cible des réglages de notification : le contact en MP, le groupe sinon. */
  notifTargetId: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  status?: AlfyPresence;
  messages: AlfyMessage[];
  onJump: (id: string) => boolean | void;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onVerify?: () => void;
  onOpenNav?: () => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onAddMembers?: () => void;
  onSettings?: () => void;
}

export function ConversationHeader(p: ConversationHeaderProps) {
  const { t } = useTranslation();
  const isDm = p.kind === 'dm';

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-separator bg-surface px-3">
      {p.onOpenNav && (
        <Button isIconOnly size="sm" variant="ghost" aria-label={t.conv.header.nav} className="shrink-0 text-muted md:hidden" onPress={p.onOpenNav}>
          <Menu className="size-4.5" aria-hidden />
        </Button>
      )}

      <button
        type="button"
        onClick={isDm ? p.onTogglePanel : p.onSettings}
        className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-left outline-none transition-colors duration-(--dur-1) hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-focus"
      >
        <AlfyAvatar name={p.title} avatarUrl={p.avatarUrl} size="sm" status={isDm ? p.status : undefined} statusRingClass="ring-(--surface)" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[15px] font-semibold text-foreground">{p.title}</span>
          {p.subtitle && <span className="truncate text-xs text-muted">{p.subtitle}</span>}
        </span>
      </button>

      <E2eePill compact onPress={p.onVerify} />

      <Toolbar aria-label={t.conv.header.actions} className="ml-auto shrink-0 gap-0.5">
        {p.onVoiceCall && (
          <HeaderButton label={t.conv.header.voice} onPress={p.onVoiceCall}>
            <Phone className="size-4.5" aria-hidden />
          </HeaderButton>
        )}
        {p.onVideoCall && (
          <HeaderButton label={t.conv.header.video} onPress={p.onVideoCall}>
            <Video className="size-4.5" aria-hidden />
          </HeaderButton>
        )}
        {p.onAddMembers && (
          <HeaderButton label={t.conv.header.addMembers} onPress={p.onAddMembers}>
            <UserPlus className="size-4.5" aria-hidden />
          </HeaderButton>
        )}
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ChannelNotifSettings channelId={p.notifTargetId} channelName={p.title} targetType={isDm ? 'dm' : 'group'} />
        <SearchPanel messages={p.messages} channelName={p.title} onJump={p.onJump} />
        <span className="md:hidden">
          <NotificationCenter />
        </span>
        {p.onSettings && (
          <HeaderButton label={t.conv.header.groupSettings} onPress={p.onSettings}>
            <Settings className="size-4.5" aria-hidden />
          </HeaderButton>
        )}
        <span className="hidden lg:inline-flex">
          <HeaderButton
            label={isDm ? (p.panelOpen ? t.conv.header.hideProfile : t.conv.header.profile) : p.panelOpen ? t.conv.header.hideMembers : t.conv.header.members}
            onPress={p.onTogglePanel}
            active={p.panelOpen}
          >
            {isDm ? <PanelRight className="size-4.5" aria-hidden /> : <Users className="size-4.5" aria-hidden />}
          </HeaderButton>
        </span>
      </Toolbar>
    </header>
  );
}
