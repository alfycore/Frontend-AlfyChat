'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { socketService } from '@/lib/socket';
import { ServerChatArea } from '@/components/chat/server-chat-area';

export default function ServerChannelPage() {
  const params = useParams();
  const serverId = params?.serverId as string;
  const channelId = params?.channelId as string;
  const [channelName, setChannelName] = useState<string | undefined>();
  const [channelType, setChannelType] = useState<string>('text');

  useEffect(() => {
    if (!serverId || !channelId) return;

    const findChannel = (data: any) => {
      const channels: Array<{ id: string; name: string; type: string }> = Array.isArray(data)
        ? data
        : (data?.channels || []);
      const ch = channels.find((c) => c.id === channelId);
      if (ch) { setChannelName(ch.name); setChannelType(ch.type || 'text'); }
    };

    socketService.requestServerChannels(serverId, findChannel);
  }, [serverId, channelId]);

  // Mettre à jour le nom/type si le channel est modifié en temps réel
  useEffect(() => {
    if (!channelId) return;
    const handleUpdate = (data: any) => {
      const ch = data?.payload || data;
      if (ch?.id === channelId) {
        if (ch?.name) setChannelName(ch.name);
        if (ch?.type) setChannelType(ch.type);
      }
    };
    socketService.onChannelUpdate(handleUpdate);
    return () => socketService.off('CHANNEL_UPDATE', handleUpdate);
  }, [channelId]);

  return (
    <ServerChatArea
      serverId={serverId}
      channelId={channelId}
      channelName={channelName}
      channelType={channelType}
    />
  );
}
