'use client';

import MeLayout from '@/app/channels/me/layout';
import type { ReactNode } from 'react';

export default function DiscoverServerLayout({ children }: { children: ReactNode }) {
  return <MeLayout>{children}</MeLayout>;
}
