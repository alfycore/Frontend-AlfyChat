'use client';

import { useParams } from 'next/navigation';

import { GuildChannelRoute } from '@/components/alfy/guild/routes';

/** Vue d'un salon : scène vocale, fil textuel ou vue spéciale selon son type. */
export default function ServerChannelPage() {
  const params = useParams();
  return <GuildChannelRoute serverId={params?.serverId as string} channelId={params?.channelId as string} />;
}
