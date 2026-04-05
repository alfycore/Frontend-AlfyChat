'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

// Redirection vers la nouvelle section groupes séparée
export default function GroupRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.groupId as string | undefined;

  useEffect(() => {
    if (groupId) {
      router.replace(`/channels/groups/${groupId}`);
    } else {
      router.replace('/channels/groups');
    }
  }, [groupId, router]);

  return null;
}
