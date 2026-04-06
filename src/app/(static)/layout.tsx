import Link from 'next/link';
import { MessageCircleIcon, ArrowLeftIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

export default function StaticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-no-wallpaper className="min-h-screen text-[var(--foreground)]">

        {children}



    </div>
  );
}
