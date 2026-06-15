'use client';

import Link from 'next/link';
import { HomeIcon, MessageCircleIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { FullErrorScreen } from '@/components/error-screens';

export default function NotFound() {
  return (
    <FullErrorScreen
      code="404"
      tone="primary"
      title="Page introuvable"
      description="La page que vous cherchez n'existe pas, a été déplacée ou n'a jamais existé."
    >
      <Link href="/" className="sm:w-auto">
        <Button size="lg" className="w-full sm:w-auto">
          <HomeIcon size={15} />
          Accueil
        </Button>
      </Link>
      <Link href="/channels/me" className="sm:w-auto">
        <Button size="lg" variant="outline" className="w-full sm:w-auto">
          <MessageCircleIcon size={15} />
          Ouvrir AlfyChat
        </Button>
      </Link>
    </FullErrorScreen>
  );
}
