'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LockIcon, EyeIcon, EyeOffIcon, CheckCircleIcon, XCircleIcon, ArrowLeftIcon } from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { useTranslation } from '@/components/locale-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
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

function ResetPasswordForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError(t.auth.resetPassword.invalidLinkShort);
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password.length < 8) { setError(t.auth.resetPassword.passwordTooShort); return; }
    if (password !== confirmPassword) { setError(t.auth.resetPassword.passwordMismatch); return; }
    setError('');
    setIsLoading(true);
    try {
      const result = await api.resetPassword(token, password);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setError((result as any).error || t.auth.resetPassword.expiredError);
      }
    } catch {
      setError(t.auth.resetPassword.error);
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
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                <img src="/logo/Alfychat.svg" alt="" className="size-4.5" />
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

            {success ? (
              /* ── Vue : succès ── */
              <MotionStagger className="flex flex-col gap-6">
                <MotionStaggerItem className="flex flex-col items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl border border-success/20 bg-success/10">
                    <CheckCircleIcon size={18} className="text-success" />
                  </div>
                  <div>
                    <h1 className="font-(family-name:--font-krona) text-2xl font-bold text-foreground">
                      {t.auth.resetPassword.successTitle}
                    </h1>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {t.auth.resetPassword.successDesc}
                    </p>
                  </div>
                </MotionStaggerItem>
                <MotionStaggerItem>
                  <Link href="/login">
                    <Button size="lg" className="w-full">
                      {t.auth.resetPassword.loginNow}
                    </Button>
                  </Link>
                </MotionStaggerItem>
              </MotionStagger>

            ) : !token ? (
              /* ── Vue : lien invalide ── */
              <MotionStagger className="flex flex-col gap-6">
                <MotionStaggerItem className="flex flex-col items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10">
                    <XCircleIcon size={18} className="text-destructive" />
                  </div>
                  <div>
                    <h1 className="font-(family-name:--font-krona) text-2xl font-bold text-foreground">
                      {t.auth.resetPassword.invalidLinkTitle}
                    </h1>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {t.auth.resetPassword.invalidLinkDesc}
                    </p>
                  </div>
                </MotionStaggerItem>
                <MotionStaggerItem>
                  <Link href="/forgot-password">
                    <Button variant="outline" size="lg" className="w-full gap-1.5">
                      <ArrowLeftIcon size={13} />
                      {t.auth.resetPassword.requestNew}
                    </Button>
                  </Link>
                </MotionStaggerItem>
              </MotionStagger>

            ) : (
              /* ── Vue : formulaire ── */
              <MotionStagger className="flex flex-col gap-6">
                <MotionStaggerItem className="flex flex-col gap-1">
                  <h1 className="font-(family-name:--font-krona) text-2xl font-bold text-foreground">
                    {t.auth.resetPassword.heading}
                  </h1>
                  <p className="text-[13px] text-muted-foreground">
                    {t.auth.resetPassword.subtitle}
                  </p>
                </MotionStaggerItem>

                <MotionStaggerItem>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
                        {error}
                      </div>
                    )}

                    {/* Nouveau mot de passe */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="password" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t.auth.resetPassword.password}
                      </label>
                      <InputGroup className="h-9">
                        <InputGroupInput
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t.auth.resetPassword.passwordPlaceholder}
                          required
                          autoFocus
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="text-sm"
                        />
                        <InputGroupAddon align="inline-start">
                          <LockIcon size={14} className="text-muted-foreground/50" />
                        </InputGroupAddon>
                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? t.auth.resetPassword.hidePassword : t.auth.resetPassword.showPassword}
                            size="icon-xs"
                          >
                            {showPassword ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>
                    </div>

                    {/* Confirmation */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="confirm-password" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t.auth.resetPassword.confirmPassword}
                      </label>
                      <InputGroup className="h-9">
                        <InputGroupInput
                          id="confirm-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t.auth.resetPassword.confirmPlaceholder}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="text-sm"
                        />
                        <InputGroupAddon align="inline-start">
                          <LockIcon size={14} className="text-muted-foreground/50" />
                        </InputGroupAddon>
                      </InputGroup>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={isLoading || !password || !confirmPassword}
                    >
                      {isLoading && <Spinner className="size-4" />}
                      {isLoading ? t.auth.resetPassword.submitting : t.auth.resetPassword.submit}
                    </Button>
                  </form>
                </MotionStaggerItem>

                <MotionStaggerItem>
                  <Link
                    href="/forgot-password"
                    className="text-[13px] text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    {t.auth.resetPassword.requestNew}
                  </Link>
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
