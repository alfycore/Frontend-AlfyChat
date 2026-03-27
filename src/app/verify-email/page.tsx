'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldIcon, MailIcon, CheckIcon, AlertTriangleIcon } from '@/components/icons';
import { api } from '@/lib/api';
import { Button, Card, Spinner } from '@heroui/react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Lien de vérification invalide.');
      return;
    }

    api.verifyEmail(token).then((res) => {
      if (res.success) {
        setStatus('success');
        setMessage('Votre adresse email a été vérifiée avec succès !');
      } else {
        setStatus('error');
        setMessage((res.error as string) || 'Lien invalide ou expiré.');
      }
    });
  }, [token]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] p-4">
      <Card className="w-full max-w-md border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl">
        <div className="flex flex-col items-center gap-6 text-center">
          {status === 'loading' && (
            <>
              <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--accent)]/10">
                <Spinner size="lg" color="accent" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--foreground)]">Vérification en cours…</h1>
                <p className="mt-1 text-sm text-[var(--muted)]">Veuillez patienter</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex size-16 items-center justify-center rounded-2xl bg-green-500/10">
                <CheckIcon size={32} className="text-green-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--foreground)]">Email vérifié !</h1>
                <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>
              </div>
              <Button onPress={() => router.push('/channels/me')}>
                Accéder à AlfyChat
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex size-16 items-center justify-center rounded-2xl bg-red-500/10">
                <AlertTriangleIcon size={32} className="text-red-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--foreground)]">Vérification échouée</h1>
                <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <Button onPress={() => router.push('/login')}>
                  Retour à la connexion
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size="lg" color="accent" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
