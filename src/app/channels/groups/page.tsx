'use client';

import { MessageCircleIcon } from '@/components/icons';
import { useTranslation } from '@/components/locale-provider';

export default function GroupsPage() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <MessageCircleIcon size={28} className="text-primary" />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-foreground">{t.pages.groups.emptyTitle}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{t.pages.groups.emptySubtitle}</p>
      </div>
    </div>
  );
}
