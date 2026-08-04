'use client';

import { useParams } from 'next/navigation';

import { AlfyServerHome } from '@/components/alfy/live/alfy-server-home';

export default function ServerWelcomePage() {
  const params = useParams();
  const serverId = params?.serverId as string;

  return <AlfyServerHome serverId={serverId} />;
}
