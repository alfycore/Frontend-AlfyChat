'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailIcon, CheckCircleIcon, ArrowLeftIcon } from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { useTranslation } from '@/components/locale-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const { t, tx } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
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
    <div className="grid min-h-svh lg:grid-cols-2">

      {/* ── Colonne gauche : formulaire ── */}
      <div className="flex flex-col bg-background">

        {/* Logo */}
   <div className="p-8 pb-0">
          <MotionFade direction="down" distance={6} duration={0.3}>
            <Link href="/" className="inline-flex items-center gap-2.5 ui-smooth opacity-80 hover:opacity-100">
              <div className="flex size-8 items-center justify-center rounded-lg">
                <img src="/logo/Alfychat.svg" alt="" className="size-16" />
              </div>
              <span className="font-(family-name:--font-krona) text-sm font-medium tracking-wide text-foreground">
                ALFYCHAT
              </span>
            </Link>
          </MotionFade>
        </div>

        {/* Contenu */}
        <div className="flex flex-1 items-center justify-center px-8 py-12">
          <div className="w-full max-w-xs">

            {sent ? (
              /* ── Vue : email envoyé ── */
              <MotionStagger className="flex flex-col gap-6">
                <MotionStaggerItem className="flex flex-col items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl border border-success/20 bg-success/10">
                    <CheckCircleIcon size={18} className="text-success" />
                  </div>
                  <div>
                    <h1 className="font-(family-name:--font-krona) text-2xl font-bold text-foreground">
                      {t.auth.forgotPassword.sentTitle}
                    </h1>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {tx(t.auth.forgotPassword.sentDesc, { email })}
                    </p>
                  </div>
                </MotionStaggerItem>

                <MotionStaggerItem>
                  <p className="text-[12px] text-muted-foreground/70">
                    {t.auth.forgotPassword.sentExpiry}{' '}
                    <strong className="text-muted-foreground">{t.auth.forgotPassword.oneHour}</strong>.
                  </p>
                </MotionStaggerItem>

                <MotionStaggerItem>
                  <Link href="/login">
                    <Button variant="outline" size="lg" className="w-full gap-1.5">
                      <ArrowLeftIcon size={13} />
                      {t.auth.forgotPassword.backToLogin}
                    </Button>
                  </Link>
                </MotionStaggerItem>
              </MotionStagger>

            ) : (
              /* ── Vue : formulaire ── */
              <MotionStagger className="flex flex-col gap-6">
                <MotionStaggerItem className="flex flex-col gap-1">
                  <h1 className="font-(family-name:--font-krona) text-2xl font-bold text-foreground">
                    {t.auth.forgotPassword.heading}
                  </h1>
                  <p className="text-[13px] text-muted-foreground">
                    {t.auth.forgotPassword.subtitle}
                  </p>
                </MotionStaggerItem>

                <MotionStaggerItem>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
                        {error}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="email" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t.auth.forgotPassword.email}
                      </label>
                      <InputGroup className="h-9">
                        <InputGroupInput
                          id="email"
                          type="email"
                          placeholder={t.auth.forgotPassword.emailPlaceholder}
                          required
                          autoFocus
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="text-sm"
                        />
                        <InputGroupAddon align="inline-start">
                          <MailIcon size={14} className="text-muted-foreground/50" />
                        </InputGroupAddon>
                      </InputGroup>
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={isLoading || !email}>
                      {isLoading && <Spinner className="size-4" />}
                      {isLoading ? t.auth.forgotPassword.sending : t.auth.forgotPassword.send}
                    </Button>
                  </form>
                </MotionStaggerItem>

                <MotionStaggerItem>
                  <p className="text-[13px] text-muted-foreground">
                    {t.auth.forgotPassword.rememberPassword}{' '}
                    <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                      {t.auth.forgotPassword.logIn}
                    </Link>
                  </p>
                </MotionStaggerItem>
              </MotionStagger>
            )}

          </div>
        </div>
      </div>

      {/* ── Colonne droite : image ── */}
      <div className="hidden bg-background p-4 lg:block">
        <div className="relative h-full overflow-hidden rounded-2xl">
          <img
            src="/backgrounds/defaut.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>

    </div>
  );
}
