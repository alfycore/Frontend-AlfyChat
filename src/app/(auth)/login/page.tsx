'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldIcon, EyeIcon, EyeOffIcon, MailIcon, LockIcon,
  ArrowLeftIcon, CheckCircleIcon,
} from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot,
} from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
      {message}
    </div>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWith2FA } = useAuth();
  const router = useRouter();

  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [twoFactorToken, set2FAToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const [emailNotVerifiedStep, setEmailNotVerifiedStep] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  useEffect(() => {
    api.getRegisterSettings().then((res) => {
      if (res.success && res.data) {
        const data = res.data as any;
        setTurnstileEnabled(data.turnstileEnabled === true);
        setTurnstileSiteKey(data.turnstileSiteKey || null);
      }
    });
  }, []);

  const renderTurnstile = useCallback(() => {
    if (!turnstileEnabled || !turnstileSiteKey || !turnstileRef.current) return;
    if (turnstileWidgetId.current && (window as any).turnstile) {
      (window as any).turnstile.reset(turnstileWidgetId.current);
      return;
    }
    if ((window as any).turnstile) {
      turnstileWidgetId.current = (window as any).turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(null),
        'error-callback': () => setTurnstileToken(null),
        theme: 'dark',
      });
    }
  }, [turnstileEnabled, turnstileSiteKey]);

  useEffect(() => {
    if (!turnstileEnabled || !turnstileSiteKey) return;
    if ((window as any).turnstile) { renderTurnstile(); return; }
    const existingScript = document.querySelector('script[src*="turnstile"]');
    if (existingScript) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => renderTurnstile();
    document.head.appendChild(script);
  }, [turnstileEnabled, turnstileSiteKey, renderTurnstile]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (turnstileEnabled && !turnstileToken) {
      setError(t.auth.login.captchaRequired);
      return;
    }
    setIsLoading(true);
    try {
      const result = await login(email, password, turnstileToken || undefined);
      if (result.twoFactorRequired && result.twoFactorToken) {
        set2FAToken(result.twoFactorToken);
        setTwoFactorStep(true);
        return;
      }
      if (result.emailNotVerified) {
        setEmailNotVerifiedStep(true);
        return;
      }
      if (result.success) {
        router.push('/channels/me');
      } else {
        setError(result.error || t.auth.login.loginError);
        if (turnstileWidgetId.current && (window as any).turnstile) {
          (window as any).turnstile.reset(turnstileWidgetId.current);
          setTurnstileToken(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (totpCode.length < 6) {
      setError(t.auth.login.needCode6Digits);
      return;
    }
    setIsLoading(true);
    try {
      const result = await loginWith2FA(twoFactorToken, totpCode, password);
      if (result.success) {
        router.push('/channels/me');
      } else {
        setError(result.error || t.auth.login.invalidCode);
        setTotpCode('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      await api.resendVerificationEmailByAddress(email);
      setResendSuccess(true);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">

      {/* ── Colonne gauche : formulaire ── */}
      <div className="flex flex-col bg-background">

        {/* Logo en haut */}
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

        {/* Formulaire centré verticalement */}
        <div className="flex flex-1 items-center justify-center px-8 py-12">
          <div className="w-full max-w-xs">

            {/* ── Vue : email non vérifié ── */}
            {emailNotVerifiedStep ? (
              <MotionStagger className="flex flex-col gap-6">
                <MotionStaggerItem className="flex flex-col items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl border border-warning/20 bg-warning/10">
                    <MailIcon size={18} className="text-warning" />
                  </div>
                  <div>
                    <h1 className="font-(family-name:--font-krona) text-xl font-bold text-foreground">
                      {t.auth.login.emailUnverified}
                    </h1>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {t.auth.login.emailUnverifiedDesc}
                    </p>
                  </div>
                </MotionStaggerItem>

                <MotionStaggerItem className="flex flex-col gap-2">
                  {resendSuccess && (
                    <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-[13px] text-success">
                      <CheckCircleIcon size={13} />
                      {t.auth.login.emailResent}
                    </div>
                  )}
                  <Button className="w-full" size="lg" disabled={resendLoading || resendSuccess} onClick={handleResendVerification}>
                    {resendLoading && <Spinner className="size-4" />}
                    {resendLoading ? t.common.sending : resendSuccess ? `${t.common.send} ✓` : t.auth.login.resendVerification}
                  </Button>
                  <Button variant="ghost" size="lg" className="w-full gap-1.5 text-muted-foreground"
                    onClick={() => { setEmailNotVerifiedStep(false); setResendSuccess(false); setError(''); }}>
                    <ArrowLeftIcon size={13} />
                    {t.common.back}
                  </Button>
                </MotionStaggerItem>
              </MotionStagger>

            ) : twoFactorStep ? (
              /* ── Vue : 2FA ── */
              <MotionStagger className="flex flex-col gap-6">
                <MotionStaggerItem className="flex flex-col items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                    <ShieldIcon size={18} className="text-primary" />
                  </div>
                  <div>
                    <h1 className="font-(family-name:--font-krona) text-xl font-bold text-foreground">
                      {t.auth.login.twoFAHeading}
                    </h1>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {t.auth.login.twoFASubtitle}
                    </p>
                  </div>
                </MotionStaggerItem>

                <MotionStaggerItem>
                  <form onSubmit={handle2FASubmit} className="flex flex-col gap-4">
                    {error && <ErrorBanner message={error} />}

                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t.auth.login.twoFACodeLabel}
                      </label>
                      <div className="flex py-2">
                        <InputOTP
                          maxLength={6}
                          pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                          value={totpCode}
                          onChange={(val) => setTotpCode(val)}
                          autoFocus
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                          </InputOTPGroup>
                          <InputOTPSeparator />
                          <InputOTPGroup>
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <p className="text-[11px] text-muted-foreground/60">
                        {t.auth.login.twoFABackupHint}
                      </p>
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={isLoading || totpCode.length < 6}>
                      {isLoading && <Spinner className="size-4" />}
                      {isLoading ? t.auth.login.twoFAVerifying : t.auth.login.twoFAVerify}
                    </Button>
                    <Button type="button" variant="ghost" size="lg" className="w-full gap-1.5 text-muted-foreground"
                      onClick={() => { setTwoFactorStep(false); setError(''); setTotpCode(''); }}>
                      <ArrowLeftIcon size={13} />
                      {t.common.back}
                    </Button>
                  </form>
                </MotionStaggerItem>
              </MotionStagger>

            ) : (
              /* ── Vue : formulaire principal ── */
              <MotionStagger className="flex flex-col gap-6">
                <MotionStaggerItem className="flex flex-col gap-1">
                  <h1 className="font-(family-name:--font-krona) text-2xl font-bold text-foreground">
                    {t.auth.login.heading}
                  </h1>
                  <p className="text-[13px] text-muted-foreground">
                    {t.auth.login.subtitle}
                  </p>
                </MotionStaggerItem>

                <MotionStaggerItem>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && <ErrorBanner message={error} />}

                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="email" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t.auth.login.email}
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                          <MailIcon size={14} />
                        </span>
                        <Input
                          id="email"
                          type="email"
                          placeholder={t.auth.login.emailPlaceholder}
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-9 pl-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* Mot de passe */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="password" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          {t.auth.login.password}
                        </label>
                        <Link
                          href="/forgot-password"
                          className="text-[12px] text-muted-foreground/60 underline-offset-4 ui-smooth hover:text-primary hover:underline"
                        >
                          {t.auth.login.forgotPassword}
                        </Link>
                      </div>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                          <LockIcon size={14} />
                        </span>
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t.auth.login.passwordPlaceholder}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-9 pl-8 pr-9 text-sm"
                        />
                        <button
                          type="button"
                          className="ui-smooth absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? t.auth.login.hidePassword : t.auth.login.showPassword}
                        >
                          {showPassword ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Turnstile */}
                    {turnstileEnabled && turnstileSiteKey && (
                      <div className="flex">
                        <div ref={turnstileRef} />
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={isLoading || (turnstileEnabled && !turnstileToken)}
                    >
                      {isLoading && <Spinner className="size-4" />}
                      {isLoading ? t.auth.login.logging : t.auth.login.login}
                    </Button>
                  </form>
                </MotionStaggerItem>

                {/* Séparateur + lien inscription */}
                <MotionStaggerItem className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
                      {t.auth.login.or}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    {t.auth.login.noAccount}{' '}
                    <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
                      {t.auth.login.createAccount}
                    </Link>
                  </p>
                </MotionStaggerItem>
              </MotionStagger>
            )}

          </div>
        </div>
      </div>

      {/* ── Colonne droite : image ── */}
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src="/backgrounds/defaut.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

    </div>
  );
}
