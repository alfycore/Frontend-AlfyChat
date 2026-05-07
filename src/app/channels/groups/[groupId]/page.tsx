'use client';

import { useRouter, useParams } from 'next/navigation';
import { GroupChatArea } from '@/components/chat/group-chat-area';

export default function GroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.groupId as string | undefined;

  if (!groupId) return null;

  return <GroupChatArea groupId={groupId} onLeave={() => router.push('/channels/groups')} />;
}
