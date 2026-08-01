'use client';

import { useParams } from 'next/navigation';

import { AlfyGroupChat } from '@/components/alfy/live/alfy-group-chat';

export default function GroupPage() {
  const params = useParams();
  const groupId = params?.groupId as string | undefined;

  if (!groupId) return null;

  return <AlfyGroupChat key={groupId} groupId={groupId} />;
}
