import { LandingNavbar } from '@/components/site-navbar';
import { SiteFooter } from '@/components/site-footer';

export default function StaticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-no-wallpaper className="min-h-screen text-[var(--foreground)]">
      <LandingNavbar />
      <div className="pt-20">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
