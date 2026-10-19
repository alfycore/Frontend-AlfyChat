'use client';

import { useParams } from 'next/navigation';

import { GroupConversation } from '@/components/alfy/conversation/view/conversation-view';

export default function GroupPage() {
  const params = useParams();
  const groupId = params?.groupId as string | undefined;

  if (!groupId) return null;

  return <GroupConversation key={groupId} groupId={groupId} />;
}
