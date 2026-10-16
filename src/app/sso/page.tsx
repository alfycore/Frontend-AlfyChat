'use client';

/**
 * SSO vers le site (alfychat.com).
 *
 * Le site envoie ici : /sso?return=https://alfychat.com/support/mes-tickets
 * Connecté, on demande au serveur un code à usage unique lié à l'origine du
 * site, puis on y renvoie le navigateur, qui l'échange contre sa propre
 * session. Le serveur refuse toute origine qui n'est pas celle du site.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link, Spinner } from '@heroui/react';

import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { SITE_URL } from '@/lib/domains';
import { AlfyAuthShell, AlfyAuthHeading, AlfyAuthBanner } from '@/components/alfy/auth/alfy-auth-shell';

export default function SsoPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (isLoading || started.current) return;

    const search = window.location.search;
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(`/sso${search}`)}`);
      return;
    }

    started.current = true;
    const returnUrl = new URLSearchParams(search).get('return') || `${SITE_URL}/`;
    api.createSsoCode(returnUrl).then((res) => {
      if (res.success && res.data?.redirect) {
        window.location.replace(res.data.redirect);
      } else {
        setError(res.error || 'Impossible de vous connecter au site.');
      }
    });
  }, [isLoading, isAuthenticated, router]);

  return (
    <AlfyAuthShell>
      <div className="flex flex-col items-center gap-5 text-center">
        <AlfyAuthHeading
          title="Connexion au site AlfyChat"
          subtitle={error ? undefined : 'Redirection en cours…'}
        />
        {error ? (
          <>
            <AlfyAuthBanner message={error} />
            <Link href={SITE_URL}>Revenir sur le site</Link>
          </>
        ) : (
          <Spinner />
        )}
      </div>
    </AlfyAuthShell>
  );
}
