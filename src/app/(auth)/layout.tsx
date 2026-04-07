'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/channels/me');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
