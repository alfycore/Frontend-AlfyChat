import { Metadata } from 'next';
import { LandingNavbar } from '@/components/site-navbar';
import { SiteFooter } from '@/components/site-footer';
import { BrandClient } from './brand-client';

export const metadata: Metadata = {
  title: 'Marque — AlfyChat',
  description:
    'Charte de marque AlfyChat : logos, couleurs, typographie et règles d’usage pour représenter AlfyChat avec cohérence.',
};

export default function BrandPage() {
  return (
    <div className="min-h-screen text-foreground">
      <LandingNavbar />
      <BrandClient />
      <SiteFooter />
    </div>
  );
}
