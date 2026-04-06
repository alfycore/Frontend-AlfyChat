'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { socketService } from '@/lib/socket';
import { ServerPageSkeleton } from '@/components/chat/server-page-skeleton';
import {
  ServerChannelPreviewList,
  ServerMembersPreview,
  ServerOverviewDescription,
  ServerOverviewHero,
  ServerOverviewStats,
  type ServerOverviewChannel,
  type ServerOverviewInfo,
  type ServerOverviewMember,
} from '@/components/chat/server-overview-sections';

export default function ServerWelcomePage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params?.serverId as string;

  const [serverInfo, setServerInfo] = useState<ServerOverviewInfo | null>(null);
  const [channels, setChannels] = useState<ServerOverviewChannel[]>([]);
  const [members, setMembers] = useState<ServerOverviewMember[]>([]);
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

  const navigateToChannel = (channelId: string) => {
    router.push(`/channels/server/${serverId}/${channelId}`);
  };

  if (loading) {
    return <ServerPageSkeleton />;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <ServerOverviewHero server={serverInfo} />

      <div className="flex-1 space-y-6 px-6 py-6 sm:px-8">
        <ServerOverviewStats
          memberCount={members.length}
          onlineCount={onlineCount}
          textChannelCount={textChannels.length}
          voiceChannelCount={voiceChannels.length}
        />

        <ServerOverviewDescription description={serverInfo?.description} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <ServerChannelPreviewList channels={channels} onOpenChannel={navigateToChannel} />
          <ServerMembersPreview members={members} />
        </div>
      </div>
    </div>
  );
}
