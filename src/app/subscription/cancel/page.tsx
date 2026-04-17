'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/locale-provider';

function CancelContent() {
  const params = useSearchParams();
  const offerId = params.get('offer');
  const { t } = useTranslation();
  const s = t.static.subscription;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icône annulation */}
        <div className="w-24 h-24 rounded-full bg-yellow-500/20 border-4 border-yellow-500/40 flex items-center justify-center mx-auto">
          <i className="bi bi-x-lg text-5xl text-yellow-400" />
        </div>

        <div>
          <h1 className="text-2xl font-bold">{s.cancelTitle}</h1>
          <p className="text-muted-foreground text-sm mt-2">{s.cancelDesc}</p>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-left text-sm text-muted-foreground">
          {s.cancelHint}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {offerId ? (
            <Link href={`/hosting/checkout?offer=${offerId}`} className="flex-1">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                <i className="bi bi-arrow-repeat mr-2" />{s.retry}
              </Button>
            </Link>
          ) : (
            <Link href="/hosting" className="flex-1">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                <i className="bi bi-grid mr-2" />{s.seeOffers}
              </Button>
            </Link>
          )}
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">
              <i className="bi bi-house mr-2" />{s.home}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CancelPage() {
  return (
    <Suspense fallback={null}>
      <CancelContent />
    </Suspense>
  );
}
