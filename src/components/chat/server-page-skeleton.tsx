'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function ServerPageSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="h-40 shrink-0 border-b border-border/40 bg-card/30 px-6 pb-5 pt-16 sm:h-48 sm:px-8">
        <div className="flex items-end gap-4">
          <Skeleton className="size-20 rounded-3xl" />
          <div className="space-y-3 pb-1">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-8 w-64 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="space-y-6 px-6 py-6 sm:px-8">
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>

        <Skeleton className="h-24 w-full rounded-3xl" />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-96 w-full rounded-3xl" />
          <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}