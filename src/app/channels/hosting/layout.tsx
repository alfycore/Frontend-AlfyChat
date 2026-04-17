import { ReactNode } from 'react';
import MeLayout from '@/app/channels/me/layout';

export default function HostingLayout({ children }: { children: ReactNode }) {
  return <MeLayout>{children}</MeLayout>;
}