'use client';

/**
 * Routes du module serveur.
 *
 *  - `GuildIndex` (/channels/server/[id]) : comme Discord, il n'y a pas de page
 *    d'accueil vide — on rouvre le dernier salon consulté, sinon le premier
 *    salon textuel visible.
 *  - `GuildChannelRoute` (/channels/server/[id]/[salon]) : la vue dépend du
 *    type — salon vocal (scène), textuel/annonces (fil), ou vue spéciale.
 */

import { ScrollShadow, Skeleton } from '@heroui/react';
import { Hash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useTranslation } from '@/components/locale-provider';
import { SPECIAL_VIEWS, type SpecialViewType } from '@/components/alfy/chat/special-views';
import { EmptyState } from '@/components/alfy/primitives/empty-state';
import { useGuildPrefs } from '@/components/alfy/guild/prefs';
import { groupChannels, useEnsureGuild, useGuildChannel, useGuildChannels, useGuildChannelsLoaded } from '@/components/alfy/guild/hooks';
import { isVoiceType } from '@/components/alfy/guild/channel-icons';
import { ChannelHeader } from '@/components/alfy/guild/chat/channel-header';
import { TextChannelView } from '@/components/alfy/guild/chat/text-channel-view';
import { VoiceChannelView } from '@/components/alfy/guild/voice/voice-channel-view';

function MainSkeleton() {
  return (
    <div className="flex h-full flex-1 flex-col bg-surface" aria-hidden>
      <div className="flex h-12 items-center gap-2 border-b border-separator px-4">
        <Skeleton className="size-5 rounded-sm" />
        <Skeleton className="h-4 w-32 rounded-sm" />
      </div>
      <div className="flex flex-1 flex-col justify-end gap-5 p-4 pb-24">
        {[70, 45, 82, 60].map((w, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-28 rounded-sm" />
              <Skeleton className="h-3.5 rounded-sm" style={{ width: `${w}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GuildIndex({ serverId }: { serverId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  useEnsureGuild(serverId);
  const channels = useGuildChannels(serverId);
  const loaded = useGuildChannelsLoaded(serverId);
  const last = useGuildPrefs((s) => s.lastChannel[serverId]);

  const target =
    (last && channels.some((c) => c.id === last) ? last : undefined) ??
    groupChannels(channels)
      .flatMap((g) => g.channels)
      .find((c) => c.type === 'text' || c.type === 'announcement')?.id ??
    channels.find((c) => c.type !== 'category' && !isVoiceType(c.type))?.id;

  useEffect(() => {
    if (target) router.replace(`/channels/server/${serverId}/${target}`);
  }, [target, serverId, router]);

  if (!loaded || target) return <MainSkeleton />;
  return (
    <div className="flex h-full flex-1 items-center justify-center bg-surface">
      <EmptyState icon={Hash} title={t.guild.routes.noTextTitle} description={t.guild.routes.noTextDesc} />
    </div>
  );
}

export function GuildChannelRoute({ serverId, channelId }: { serverId: string; channelId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  useEnsureGuild(serverId);
  const loaded = useGuildChannelsLoaded(serverId);
  const channel = useGuildChannel(serverId, channelId);
  const remember = useGuildPrefs((s) => s.rememberChannel);
  const { isMobile, openSidebar, toggleMemberList, toggleMemberListDesktop, memberListDesktopVisible } = useMobileNav();

  /* Le dernier salon textuel ouvert est rouvert au retour sur le serveur. */
  useEffect(() => {
    if (channel && !isVoiceType(channel.type) && channel.type !== 'category') remember(serverId, channel.id);
  }, [channel, serverId, remember]);

  /* Salon supprimé ou devenu invisible : retour à l'index du serveur. */
  useEffect(() => {
    if (loaded && !channel) router.replace(`/channels/server/${serverId}`);
  }, [loaded, channel, serverId, router]);

  if (!channel) return <MainSkeleton />;

  if (isVoiceType(channel.type)) return <VoiceChannelView key={channel.id} serverId={serverId} channelId={channel.id} />;
  if (channel.type === 'text' || channel.type === 'announcement' || channel.type === 'thread') {
    return <TextChannelView key={channel.id} serverId={serverId} channelId={channel.id} />;
  }

  const entry = SPECIAL_VIEWS[channel.type as SpecialViewType];
  if (!entry) return <TextChannelView key={channel.id} serverId={serverId} channelId={channel.id} />;
  const View = entry.Component;
  return (
    <section aria-label={channel.name} className="flex h-full min-w-0 flex-1 flex-col bg-surface">
      <ChannelHeader
        channel={channel}
        messages={[]}
        onJump={() => false}
        membersOpen={memberListDesktopVisible}
        onToggleMembers={isMobile ? toggleMemberList : toggleMemberListDesktop}
        onOpenNav={isMobile ? openSidebar : undefined}
      />
      <ScrollShadow className="alfy-thin-scroll min-h-0 flex-1 overflow-y-auto" aria-label={t.guild.routes.specialAria}>
        <View serverId={serverId} channelId={channel.id} />
      </ScrollShadow>
    </section>
  );
}
