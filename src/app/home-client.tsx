'use client';

import { HomeNav } from '@/components/home/home-nav';
import { HomeHero } from '@/components/home/hero';
import { HomeSecurity } from '@/components/home/security';
import { HomeFeatures } from '@/components/home/features';
import { HomeSelfHost } from '@/components/home/self-host';
import { HomeAssociation, HomeCta, HomeFaq } from '@/components/home/closing';
import { HomeFooter } from '@/components/home/home-footer';

export function HomeClient() {
  return (
    <div className="min-h-dvh bg-background text-foreground" data-no-wallpaper>
      <HomeNav />
      <main>
        <HomeHero />
        <HomeSecurity />
        <HomeFeatures />
        <HomeSelfHost />
        <HomeAssociation />
        <HomeFaq />
        <HomeCta />
      </main>
      <HomeFooter />
    </div>
  );
}
