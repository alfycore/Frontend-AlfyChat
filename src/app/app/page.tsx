'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { HugeiconsIcon } from '@hugeicons/react';
import { MessageCircleIcon } from '@/components/icons';

export default function AppPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/channels/me');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-16 animate-pulse items-center justify-center rounded-2xl bg-primary">
          <HugeiconsIcon icon={MessageCircleIcon} size={32} className="text-primary-foreground" />
        </div>
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );
}
