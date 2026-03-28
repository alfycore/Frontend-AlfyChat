import Link from 'next/link';
import { MessageCircleIcon, ArrowLeftIcon } from '@/components/icons';
import { Button } from '@heroui/react';

export default function StaticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-solid)] text-[var(--foreground)]">

        {children}



    </div>
  );
}
