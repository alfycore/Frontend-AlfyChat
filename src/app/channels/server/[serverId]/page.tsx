'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  HashIcon, UsersIcon, ArrowRightIcon, SparklesIcon,
  Volume2Icon, MegaphoneIcon, GlobeIcon, LockIcon,
} from '@/components/icons';
import { socketService } from '@/lib/socket';
import { resolveMediaUrl } from '@/lib/api';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  Separator,
  Skeleton,
  Spinner,
} from '@heroui/react';
import { cn } from '@/lib/utils';

interface ServerInfo {
  name: string;
  description?: string;
  iconUrl?: string;
  bannerUrl?: string;
  isPublic?: boolean;
  ownerId?: string;
}

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'announcement';
  topic?: string;
}

interface MemberInfo {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  status?: string;
}

export default function ServerWelcomePage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params?.serverId as string;

  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serverId) return;
    setLoading(true);

    let loadCount = 0;
    const checkDone = () => { if (++loadCount >= 3) setLoading(false); };

    socketService.requestServerInfo(serverId, (data: any) => {
      setServerInfo(data);
      checkDone();
    });

    socketService.requestServerChannels(serverId, (data: any) => {
      const chs = Array.isArray(data) ? data : data?.channels || [];
      setChannels(chs);
      checkDone();
    });

    socketService.requestMembers(serverId, (data: any) => {
      const mems = Array.isArray(data) ? data : data?.members || [];
      setMembers(mems);
      checkDone();
    });
  }, [serverId]);

  const textChannels = channels.filter((c) => c.type === 'text' || c.type === 'announcement');
  const voiceChannels = channels.filter((c) => c.type === 'voice');
  const onlineCount = members.filter((m) => m.status === 'online' || m.status === 'idle' || m.status === 'dnd').length;
  const firstTextChannel = channels.find((c) => c.type === 'text' || c.type === 'announcement');

  const navigateToChannel = (channelId: string) => {
    router.push(`/channels/server/${serverId}/${channelId}`);
  };

  const getChannelIcon = (type: string) => {
    if (type === 'voice') return <Volume2Icon size={16} className="text-muted" />;
    if (type === 'announcement') return <MegaphoneIcon size={16} className="text-muted" />;
    return <HashIcon size={16} className="text-muted" />;
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Skeleton className="size-16 rounded-2xl" animationType="shimmer" />
        <Skeleton className="h-5 w-40 rounded-lg" animationType="shimmer" />
        <Skeleton className="h-3 w-56 rounded" animationType="shimmer" />
        <div className="mt-4 flex gap-3">
          <Skeleton className="h-8 w-28 rounded-xl" animationType="shimmer" />
          <Skeleton className="h-8 w-28 rounded-xl" animationType="shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Banner / Header */}
      <div className="relative shrink-0">
        {serverInfo?.bannerUrl ? (
          <div className="h-40 w-full overflow-hidden">
            <img
              src={resolveMediaUrl(serverInfo.bannerUrl)}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-b from-transparent to-background" />
          </div>
        ) : (
          <div className="h-32 w-full bg-linear-to-br from-indigo-500/20 via-purple-500/10 to-pink-500/20">
            <div className="absolute inset-0 bg-linear-to-b from-transparent to-background" />
          </div>
        )}

        {/* Server icon + name overlay */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end gap-4 px-8 pb-4">
          <Badge.Anchor>
            <Avatar className="size-16 rounded-2xl border-4 border-background shadow-lg">
              <Avatar.Image
                src={serverInfo?.iconUrl ? resolveMediaUrl(serverInfo.iconUrl) : undefined}
                alt={serverInfo?.name}
              />
              <Avatar.Fallback className="rounded-2xl bg-indigo-500 text-xl font-bold text-white">
                {serverInfo?.name?.charAt(0)?.toUpperCase() || 'S'}
              </Avatar.Fallback>
            </Avatar>
            {serverInfo?.isPublic !== undefined && (
              <Badge
                color={serverInfo.isPublic ? 'success' : 'warning'}
                size="sm"
                placement="bottom-right"
              />
            )}
          </Badge.Anchor>

          <div className="mb-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              {serverInfo?.name || 'Serveur'}
              <Chip
                color={serverInfo?.isPublic ? 'success' : 'warning'}
                variant="soft"
                size="sm"
              >
                <Chip.Label className="flex items-center gap-1 text-[10px]">
                  <serverInfo?.isPublic ? GlobeIcon : LockIcon size={12} />
                  {serverInfo?.isPublic ? 'Public' : 'Privé'}
                </Chip.Label>
              </Chip>
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6 px-8 py-6">
        {/* Description */}
        {serverInfo?.description && (
          <Card className="max-w-xl border border-(--border)/60">
            <Card.Header>
              <Card.Title className="text-[11px] font-semibold uppercase tracking-wider text-muted/70">
                À propos
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <p className="text-sm leading-relaxed text-muted">
                {serverInfo.description}
              </p>
            </Card.Content>
          </Card>
        )}

        {/* Stats bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Chip variant="soft" size="sm">
            <Chip.Label className="flex items-center gap-2 text-[12px]">
              <UsersIcon size={14} />
              <strong className="text-foreground">{members.length}</strong> membres
            </Chip.Label>
          </Chip>

          {onlineCount > 0 && (
            <Chip color="success" variant="soft" size="sm">
              <Chip.Label className="flex items-center gap-2 text-[12px]">
                <span className="size-2 rounded-full bg-success" />
                <strong className="text-foreground">{onlineCount}</strong> en ligne
              </Chip.Label>
            </Chip>
          )}

          <Chip variant="soft" size="sm">
            <Chip.Label className="flex items-center gap-2 text-[12px]">
              <HashIcon size={14} />
              <strong className="text-foreground">{textChannels.length}</strong> salons textuels
            </Chip.Label>
          </Chip>

          {voiceChannels.length > 0 && (
            <Chip variant="soft" size="sm">
              <Chip.Label className="flex items-center gap-2 text-[12px]">
                <Volume2Icon size={14} />
                <strong className="text-foreground">{voiceChannels.length}</strong> salons vocaux
              </Chip.Label>
            </Chip>
          )}
        </div>

        {/* Quick start */}
        {firstTextChannel && (
          <Card className="max-w-lg border border-(--border)/60">
            <Card.Header>
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-yellow-500/10">
                  <SparklesIcon size={16} className="text-yellow-500" />
                </div>
                <Card.Title className="text-[15px] font-semibold">
                  Commencer à discuter
                </Card.Title>
              </div>
            </Card.Header>
            <Card.Content className="space-y-3">
              <p className="text-sm text-muted">
                Rejoignez la conversation dans le salon principal du serveur.
              </p>
              <Button
                onPress={() => navigateToChannel(firstTextChannel.id)}
                className="gap-2 rounded-xl"
              >
                <HashIcon size={16} />
                Aller à #{firstTextChannel.name}
                <ArrowRightIcon size={16} />
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Channels overview */}
        {channels.length > 0 && (
          <div className="max-w-lg space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted/70">
              Salons
            </h3>
            <Card className="border border-(--border)/60 p-2">
              <Card.Content className="space-y-0.5 p-0">
                {channels.slice(0, 10).map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => ch.type !== 'voice' && navigateToChannel(ch.id)}
                    className={cn(
                      'group flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
                      ch.type === 'voice'
                        ? 'cursor-default text-muted'
                        : 'cursor-pointer text-foreground hover:bg-(--surface-secondary)/60',
                    )}
                  >
                    {getChannelIcon(ch.type)}
                    <span className="flex-1 truncate text-left">{ch.name}</span>
                    {ch.type !== 'voice' && (
                      <ArrowRightIcon size={14}
                        className="text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </button>
                ))}
                {channels.length > 10 && (
                  <p className="px-3 py-1 text-xs text-muted">
                    +{channels.length - 10} autres salons
                  </p>
                )}
              </Card.Content>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
