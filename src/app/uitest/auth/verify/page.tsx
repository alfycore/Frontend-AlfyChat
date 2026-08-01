'use client';

import { Button, Link, toast } from '@heroui/react';
import { MailCheck } from 'lucide-react';

import { AuthHeading, AuthShell } from '@/components/alfy/auth/auth-shell';

export default function UitestVerifyPage() {
  return (
    <AuthShell>
      <div className="alfy-enter flex flex-col gap-5">
        <div className="flex size-11 items-center justify-center rounded-xl bg-accent/12 text-accent">
          <MailCheck className="size-5" aria-hidden />
        </div>
        <AuthHeading
          title="Vérifiez votre email"
          subtitle="Nous avons envoyé un lien de confirmation à karlo@exemple.fr. Cliquez dessus pour activer votre compte."
        />
        <Button variant="secondary" className="w-full" onPress={() => toast('Email renvoyé')}>
          Renvoyer l&apos;email
        </Button>
        <p className="text-[13px] text-muted">
          Mauvaise adresse ?{' '}
          <Link href="/uitest/auth/register" className="font-medium text-accent hover:underline">
            Recommencer l&apos;inscription
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
