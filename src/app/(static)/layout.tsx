import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { MessageCircleIcon, ArrowLeftIcon } from '@/components/icons';
import { Button } from '@heroui/react';

export default function StaticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">

        {children}



    </div>
  );
}
