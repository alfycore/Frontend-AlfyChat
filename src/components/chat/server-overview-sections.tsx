'use client';

import {
  ArrowRightIcon,
  GlobeIcon,
  HashIcon,
  LockIcon,
  MegaphoneIcon,
  SparklesIcon,
  UsersIcon,
  Volume2Icon,
} from '@/components/icons';
import { resolveMediaUrl } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUIStyle } from '@/hooks/use-ui-style';
import { statusColor } from '@/lib/status';

export interface ServerOverviewInfo {
  name: string;
  description?: string;
  iconUrl?: string;
  bannerUrl?: string;
  isPublic?: boolean;
}

export interface ServerOverviewChannel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'announcement';
  topic?: string;
}

export interface ServerOverviewMember {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  status?: string;
}

function ChannelTypeIcon({ type }: { type: ServerOverviewChannel['type'] }) {
  if (type === 'voice') return <Volume2Icon size={16} className="text-muted-foreground" />;
  if (type === 'announcement') return <MegaphoneIcon size={16} className="text-amber-400" />;
  return <HashIcon size={16} className="text-muted-foreground" />;
}

function StatusDot({ status }: { status?: string }) {
  return <span className={cn('size-2 rounded-full', statusColor(status))} />;
}

export function ServerOverviewHero({ server }: { server: ServerOverviewInfo | null }) {
  const ui = useUIStyle();
  return (
    <div className={cn('relative shrink-0 overflow-hidden border-b', ui.isGlass ? 'border-white/15' : 'border-border/40')}>
      {server?.bannerUrl ? (
        <div className="h-48 w-full overflow-hidden">
          <img
            src={resolveMediaUrl(server.bannerUrl)}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-background/35 to-background" />
        </div>
      ) : (
        <div className="h-40 w-full bg-linear-to-br from-sky-500/20 via-cyan-500/10 to-indigo-500/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%)]" />
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-background/20 to-background" />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 px-6 pb-5 sm:px-8">
        <Avatar className="size-18 rounded-3xl border-4 border-background shadow-xl sm:size-20">
          <AvatarImage
            src={server?.iconUrl ? resolveMediaUrl(server.iconUrl) : undefined}
            alt={server?.name}
          />
          <AvatarFallback className="rounded-3xl bg-accent text-2xl font-bold text-accent-foreground">
            {server?.name?.charAt(0)?.toUpperCase() || 'S'}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 pb-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={server?.isPublic ? 'default' : 'secondary'} className="gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
              {server?.isPublic ? <GlobeIcon size={11} /> : <LockIcon size={11} />}
              {server?.isPublic ? 'Serveur public' : 'Serveur privé'}
            </Badge>
          </div>
          <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {server?.name || 'Serveur'}
          </h1>
        </div>
      </div>
    </div>
  );
}

export function ServerOverviewStats({
  memberCount,
  onlineCount,
  textChannelCount,
  voiceChannelCount,
}: {
  memberCount: number;
  onlineCount: number;
  textChannelCount: number;
  voiceChannelCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="secondary" className="gap-2 px-3 py-1.5 text-[12px]">
        <UsersIcon size={14} />
        <strong className="text-foreground">{memberCount}</strong> membres
      </Badge>

      <Badge variant="secondary" className="gap-2 px-3 py-1.5 text-[12px]">
        <span className="size-2 rounded-full bg-green-500" />
        <strong className="text-foreground">{onlineCount}</strong> en ligne
      </Badge>

      <Badge variant="secondary" className="gap-2 px-3 py-1.5 text-[12px]">
        <HashIcon size={14} />
        <strong className="text-foreground">{textChannelCount}</strong> salons texte
      </Badge>

      <Badge variant="secondary" className="gap-2 px-3 py-1.5 text-[12px]">
        <Volume2Icon size={14} />
        <strong className="text-foreground">{voiceChannelCount}</strong> salons vocaux
      </Badge>
    </div>
  );
}

export function ServerOverviewDescription({ description }: { description?: string }) {
  const ui = useUIStyle();
  if (!description) return null;

  return (
    <section className={cn('rounded-3xl p-6', ui.isGlass ? 'border border-white/20 bg-white/20 backdrop-blur-xl dark:border-white/10 dark:bg-black/20' : 'border border-border/40 bg-card/40')}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        À propos
      </p>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </section>
  );
}

export function ServerChannelPreviewList({
  channels,
  onOpenChannel,
}: {
  channels: ServerOverviewChannel[];
  onOpenChannel: (channelId: string) => void;
}) {
  const ui = useUIStyle();
  const firstTextChannel = channels.find((channel) => channel.type !== 'voice');

  return (
    <section className={cn('rounded-3xl p-4 sm:p-5', ui.isGlass ? 'border border-white/20 bg-white/20 backdrop-blur-xl dark:border-white/10 dark:bg-black/20' : 'border border-border/40 bg-card/40')}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Salons
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            Explorer le serveur
          </h2>
        </div>

        {firstTextChannel && (
          <Button onClick={() => onOpenChannel(firstTextChannel.id)} className="gap-2 rounded-xl">
            <SparklesIcon size={14} />
            Ouvrir le salon principal
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        {channels.slice(0, 12).map((channel) => {
          const isVoice = channel.type === 'voice';
          return (
            <Button
              key={channel.id}
              variant="ghost"
              disabled={isVoice}
              onClick={() => !isVoice && onOpenChannel(channel.id)}
              className={cn(
                'h-auto w-full justify-start rounded-2xl px-3 py-3 text-left',
                isVoice
                  ? 'cursor-default text-muted-foreground/65 hover:bg-transparent'
                  : 'hover:bg-muted/40',
              )}
            >
              <div className="flex w-full items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <ChannelTypeIcon type={channel.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-foreground">{channel.name}</span>
                    {channel.type === 'announcement' && (
                      <Badge variant="secondary" className="text-[9px]">Annonce</Badge>
                    )}
                    {isVoice && (
                      <Badge variant="secondary" className="text-[9px]">Vocal</Badge>
                    )}
                  </div>
                  {channel.topic && (
                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                      {channel.topic}
                    </p>
                  )}
                </div>
                {!isVoice && <ArrowRightIcon size={14} className="mt-0.5 shrink-0 text-muted-foreground/45" />}
              </div>
            </Button>
          );
        })}

        {channels.length > 12 && (
          <p className="px-3 pt-2 text-xs text-muted-foreground/70">
            +{channels.length - 12} autres salons
          </p>
        )}
      </div>
    </section>
  );
}

export function ServerMembersPreview({ members }: { members: ServerOverviewMember[] }) {
  const ui = useUIStyle();
  return (
    <section className={cn('rounded-3xl p-4 sm:p-5', ui.isGlass ? 'border border-white/20 bg-white/20 backdrop-blur-xl dark:border-white/10 dark:bg-black/20' : 'border border-border/40 bg-card/40')}>
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Membres
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          Actifs récemment
        </h2>
      </div>

      <div className="space-y-2">
        {members.slice(0, 8).map((member) => (
          <div key={member.userId} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-muted/30">
            <div className="relative shrink-0">
              <Avatar className="size-10 border border-border/40">
                <AvatarImage src={member.avatarUrl ? resolveMediaUrl(member.avatarUrl) : undefined} alt={member.username} />
                <AvatarFallback>
                  {(member.displayName || member.username || '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 rounded-full border-2 border-background p-0.5">
                <StatusDot status={member.status} />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {member.displayName || member.username}
              </p>
              <p className="truncate text-[12px] text-muted-foreground">
                @{member.username}
              </p>
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/50 px-4 py-5 text-center text-sm text-muted-foreground">
            Aucun membre à afficher pour le moment.
          </div>
        )}
      </div>
    </section>
  );
}