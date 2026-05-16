import { SiteNavbar } from '@/components/site-navbar';
import { SiteFooter } from '@/components/site-footer';

export default function ChangelogsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-no-wallpaper className="min-h-screen bg-background text-[var(--foreground)]">
      <SiteNavbar />
      {children}
      <SiteFooter />
    </div>
  );
}
