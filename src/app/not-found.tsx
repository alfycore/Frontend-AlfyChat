'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@heroui/react';
import { ArrowLeft, House, MessageCircle } from 'lucide-react';

import { ErrorPageShell, ErrorScreen } from '@/components/alfy/errors/error-screen';

export default function NotFound() {
  const router = useRouter();

  return (
    <ErrorPageShell>
      <ErrorScreen
        code="404"
        channel="introuvable"
        tone="accent"
        title="Cette page n’existe pas"
        message={
          <>
            L’adresse est peut-être mal orthographiée, ou la page a été déplacée
            depuis que le lien a été partagé.
          </>
        }
        actions={
          <>
            <Button size="sm" onPress={() => router.push('/')}>
              <House className="size-3.5" aria-hidden />
              Accueil
            </Button>
            <Button size="sm" variant="secondary" onPress={() => router.push('/channels/me')}>
              <MessageCircle className="size-3.5" aria-hidden />
              Ouvrir AlfyChat
            </Button>
            <Button size="sm" variant="ghost" onPress={() => router.back()}>
              <ArrowLeft className="size-3.5" aria-hidden />
              Retour
            </Button>
          </>
        }
      />
    </ErrorPageShell>
  );
}
