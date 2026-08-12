'use client';

import { LandingNavbar } from '@/components/home/landing-navbar';
import { SiteFooter } from '@/components/site-footer';
import { HomeHero } from '@/components/home/hero';
import { HomeFeatures } from '@/components/home/features';
import { HomeSecurity } from '@/components/home/security';
import { HomeHowItWorks } from '@/components/home/how-it-works';
import { HomeComparison } from '@/components/home/comparison';
import { HomeStats } from '@/components/home/stats';
import { HomeFaq } from '@/components/home/faq';
import { HomeCta } from '@/components/home/cta-section';

export function HomeClient() {
  return (
    <div className="min-h-dvh bg-[#fafafa] text-[#111111] dark:bg-[#050505] dark:text-white" data-no-wallpaper>
      {/* Film grain — fixed, pointer-events-none per protocol §6 */}
      <div
        className="pointer-events-none fixed inset-0 select-none"
        style={{
          zIndex: 60,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.032,
          mixBlendMode: 'overlay',
        }}
        aria-hidden
      />

      <LandingNavbar />
      <HomeHero />

      <HomeFeatures />
      <HomeSecurity />
      <HomeHowItWorks />
      <HomeComparison />
      <HomeStats />
      <HomeFaq />
      <HomeCta />
      <SiteFooter />
    </div>
  );
}
