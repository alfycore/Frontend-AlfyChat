import type { Metadata } from 'next';

import './uitest.css';

import { UitestLayoutClient } from './layout-client';

export const metadata: Metadata = {
  title: 'Alfy — atelier UI',
  robots: { index: false },
};

export default function UitestLayout({ children }: { children: React.ReactNode }) {
  return <UitestLayoutClient>{children}</UitestLayoutClient>;
}
