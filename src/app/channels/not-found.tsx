'use client';

import Link from 'next/link';
import MeLayout from '@/app/channels/me/layout';
import { Button } from '@/components/ui/button';
import { SearchIcon, MessageCircleIcon } from '@/components/icons';
import { useTranslation } from '@/components/locale-provider';
import { PanelErrorState } from '@/components/error-screens';

export default function ChannelsNotFound() {
  const { t } = useTranslation();
  const c = t.chat;
  return (
    <MeLayout>
      <PanelErrorState
        code="404"
        tone="primary"
        icon={<SearchIcon size={26} />}
        title={c.channelNotFound}
        description={c.channelNotFoundDesc}
      >
        <Link href="/channels/me">
          <Button variant="outline" size="sm">
            <MessageCircleIcon size={14} />
            {c.backToMessages}
          </Button>
        </Link>
      </PanelErrorState>
    </MeLayout>
  );
}
