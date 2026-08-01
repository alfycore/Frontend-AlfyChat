'use client';

import { type ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { GroupChatArea } from '@/components/chat/group-chat-area';

/**
 * Layout /channels/me — délègue la sidebar au parent channels/layout.tsx.
 * Gère uniquement le cas spécial GroupChatArea.
 */
export default function MeLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.groupId as string | undefined;

  if (groupId) {
    return (
      <GroupChatArea
        groupId={groupId}
        onLeave={() => router.push('/channels/me')}
      />
    );
  }

  return <>{children}</>;
}
