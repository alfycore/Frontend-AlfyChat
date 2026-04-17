'use client';

import MeLayout from '@/app/channels/me/layout';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { useTranslation } from '@/components/locale-provider';

export default function ChannelsNotFound() {
  const { t } = useTranslation();
  const c = t.chat;
  return (
    <MeLayout>
      <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
        {/* Badge */}
        <div className="flex items-center justify-center rounded-full border border-primary/20 bg-primary/8 px-3 py-1">
          <span className="font-mono text-[11px] font-semibold text-primary">404</span>
        </div>

        {/* Icône */}
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
            <path d="M11 8v6" />
            <path d="M8 11h6" />
          </svg>
        </div>

        <div>
          <h1 className="font-heading text-2xl text-foreground">{c.channelNotFound}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {c.channelNotFoundDesc}
          </p>
        </div>

        <Separator className="w-32 opacity-30" />

        <Link href="/channels/me">
          <Button variant="outline" size="sm">
            {c.backToMessages}
          </Button>
        </Link>
      </div>
    </MeLayout>
  );
}
