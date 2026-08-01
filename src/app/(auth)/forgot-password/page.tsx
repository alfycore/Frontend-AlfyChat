'use client';

import { useState } from 'react';
import { Button, Form, InputGroup, Label, Link, Spinner, TextField } from '@heroui/react';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';

import { useTranslation } from '@/components/locale-provider';
import { api } from '@/lib/api';
import { AlfyAuthShell, AlfyAuthHeading, AlfyAuthBanner } from '@/components/alfy/auth/alfy-auth-shell';

export default function ForgotPasswordPage() {
  const { t, tx } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setIsLoading(true);
    try {
      await api.requestPasswordReset(email);
      setSent(true);
    } catch {
      setError(t.auth.forgotPassword.error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlfyAuthShell>
      {sent ? (
        <div className="alfy-enter flex flex-col gap-6">
          <AlfyAuthHeading
            title={t.auth.forgotPassword.sentTitle}
            subtitle={tx(t.auth.forgotPassword.sentDesc, { email })}
            icon={<span className="flex size-11 items-center justify-center rounded-xl bg-success/12 text-success"><CheckCircle2 className="size-5" /></span>}
          />
          <p className="text-[12px] text-muted">
            {t.auth.forgotPassword.sentExpiry} <strong className="text-foreground">{t.auth.forgotPassword.oneHour}</strong>.
          </p>
          <Link href="/login">
            <Button variant="secondary" size="lg" className="w-full gap-1.5">
              <ArrowLeft className="size-3.5" /> {t.auth.forgotPassword.backToLogin}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="alfy-enter flex flex-col gap-6">
          <AlfyAuthHeading title={t.auth.forgotPassword.heading} subtitle={t.auth.forgotPassword.subtitle} />
          <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <AlfyAuthBanner message={error} />}
            <TextField name="email" value={email} onChange={setEmail} isRequired>
              <Label className="text-[11px] font-medium tracking-wider text-muted uppercase">{t.auth.forgotPassword.email}</Label>
              <InputGroup>
                <InputGroup.Prefix><Mail className="size-4 text-muted" aria-hidden /></InputGroup.Prefix>
                <InputGroup.Input type="email" placeholder={t.auth.forgotPassword.emailPlaceholder} autoComplete="email" autoFocus />
              </InputGroup>
            </TextField>
            <Button type="submit" size="lg" className="w-full gap-2" isDisabled={isLoading || !email}>
              {isLoading && <Spinner size="sm" color="current" />}
              {isLoading ? t.auth.forgotPassword.sending : t.auth.forgotPassword.send}
            </Button>
          </Form>
          <p className="text-[13px] text-muted">
            {t.auth.forgotPassword.rememberPassword}{' '}
            <Link href="/login" className="font-medium text-accent hover:underline">{t.auth.forgotPassword.logIn}</Link>
          </p>
        </div>
      )}
    </AlfyAuthShell>
  );
}
