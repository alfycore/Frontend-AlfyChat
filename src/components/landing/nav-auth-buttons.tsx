'use client';

import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { LogInIcon } from '@/components/icons';
import { Button, Link } from '@heroui/react';

export function NavAuthButtons() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('alfychat_token');
    setIsLoggedIn(!!token);
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (isLoggedIn) {
    return (
      <Link href="/channels/me">
        <Button size="sm">
          <HugeiconsIcon icon={LogInIcon} size={14} />
          Ouvrir AlfyChat
        </Button>
      </Link>
    );
  }

  return (
    <>
      <Link href="/login">
        <Button variant="ghost" size="sm">
          Connexion
        </Button>
      </Link>
      <Link href="/register">
        <Button size="sm">
          Créer un compte
        </Button>
      </Link>
    </>
  );
}
