'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldIcon, EyeIcon, EyeOffIcon, MailIcon, LockIcon, ZapIcon, GlobeIcon } from '@/components/icons';
import { Loader2 } from 'lucide-react';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
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
import {
  Field, FieldGroup, FieldLabel, FieldDescription, FieldSeparator,
} from '@/components/ui/field';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWith2FA } = useAuth();
  const router = useRouter();

  // 2FA step
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [twoFactorToken, set2FAToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  // Email non vérifié
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
      {/* ── Colonne formulaire ── */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <MotionFade direction="down" distance={8} duration={0.35} className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-(family-name:--font-krona) font-medium">
            <img src="/logo/Alfychat.svg" alt="ALFYCHAT" className="size-6" />
            ALFYCHAT
          </Link>
        </MotionFade>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">

            {/* ────── Étape email non vérifié ────── */}
            {emailNotVerifiedStep ? (
              <MotionStagger className="font-(family-name:--font-geist-sans) flex flex-col gap-6">
                <MotionStaggerItem className="flex flex-col items-center gap-2 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10">
                    <MailIcon size={20} className="text-amber-400" />
                  </div>
                  <h1 className="font-(family-name:--font-krona) text-2xl font-bold">{t.auth.login.emailUnverified}</h1>
                  <p className="font-(family-name:--font-geist-sans) text-sm text-balance text-muted-foreground">
                    {t.auth.login.emailUnverifiedDesc}
                  </p>
                </MotionStaggerItem>

                <MotionStaggerItem>
                  <FieldGroup>
                    {resendSuccess && (
                      <div className="font-(family-name:--font-geist-sans) rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                        {t.auth.login.emailResent}
                      </div>
                    )}

                    <Field>
                      <Button
                        className="w-full"
                        disabled={resendLoading || resendSuccess}
                        onClick={handleResendVerification}
                      >
                        {resendLoading && <Loader2 className="size-4 animate-spin" />}
                        {resendLoading ? t.common.sending : resendSuccess ? `${t.common.send} ✓` : t.auth.login.resendVerification}
                      </Button>
                    </Field>
                    <Field>
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => { setEmailNotVerifiedStep(false); setResendSuccess(false); setError(''); }}
                      >
                        {t.common.back}
                      </Button>
                    </Field>
                  </FieldGroup>
                </MotionStaggerItem>
              </MotionStagger>

            ) : twoFactorStep ? (
              /* ────── Étape 2FA ────── */
              <MotionStagger className="font-(family-name:--font-geist-sans) flex flex-col gap-6">
                <MotionStaggerItem className="flex flex-col items-center gap-2 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <ShieldIcon size={20} className="text-primary" />
                  </div>
                  <h1 className="font-(family-name:--font-krona) text-2xl font-bold">{t.auth.login.twoFAHeading}</h1>
                  <p className="text-sm text-balance text-muted-foreground">
                    {t.auth.login.twoFASubtitle}
                  </p>
                </MotionStaggerItem>

                <MotionStaggerItem>
                  <form onSubmit={handle2FASubmit}>
                    <FieldGroup>
                      {error && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                          {error}
                        </div>
                      )}

                      <Field>
                        <FieldLabel>{t.auth.login.twoFACodeLabel}</FieldLabel>
                        <div className="flex justify-center py-2">
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
                        <p className="text-center text-xs text-muted-foreground">
                          {t.auth.login.twoFABackupHint}
                        </p>
                      </Field>

                      <Field>
                        <Button type="submit" className="w-full" disabled={isLoading || totpCode.length < 6}>
                          {isLoading && <Loader2 className="size-4 animate-spin" />}
                          {isLoading ? t.auth.login.twoFAVerifying : t.auth.login.twoFAVerify}
                        </Button>
                      </Field>
                      <Field>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          onClick={() => { setTwoFactorStep(false); setError(''); setTotpCode(''); }}
                        >
                          {t.common.back}
                        </Button>
                      </Field>
                    </FieldGroup>
                  </form>
                </MotionStaggerItem>
              </MotionStagger>

            ) : (
              /* ────── Formulaire principal ────── */
              <form onSubmit={handleSubmit} className="font-(family-name:--font-geist-sans) flex flex-col gap-6">
                <MotionStagger>
                  <FieldGroup>
                    <MotionStaggerItem className="flex flex-col items-center gap-1 text-center">
                      <h1 className="font-(family-name:--font-krona) text-2xl font-bold">{t.auth.login.heading}</h1>
                      <p className="text-sm text-balance text-muted-foreground">
                        {t.auth.login.subtitle}
                      </p>
                    </MotionStaggerItem>

                    {error && (
                      <MotionStaggerItem>
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                          {error}
                        </div>
                      </MotionStaggerItem>
                    )}

                    <MotionStaggerItem>
                      <Field>
                        <FieldLabel htmlFor="email">{t.auth.login.email}</FieldLabel>
                        <Input
                          id="email"
                          type="email"
                          placeholder={t.auth.login.emailPlaceholder}
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </Field>
                    </MotionStaggerItem>

                    <MotionStaggerItem>
                      <Field>
                        <div className="flex items-center">
                          <FieldLabel htmlFor="password">{t.auth.login.password}</FieldLabel>
                          <Link
                            href="/forgot-password"
                            className="ml-auto text-sm underline-offset-4 hover:underline"
                          >
                            {t.auth.login.forgotPassword}
                          </Link>
                        </div>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder={t.auth.login.passwordPlaceholder}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pr-9"
                          />
                          <button
                            type="button"
                            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? t.auth.login.hidePassword : t.auth.login.showPassword}
                          >
                            {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                          </button>
                        </div>
                      </Field>
                    </MotionStaggerItem>

                    {/* Turnstile */}
                    {turnstileEnabled && turnstileSiteKey && (
                      <MotionStaggerItem>
                        <div className="flex justify-center">
                          <div ref={turnstileRef} />
                        </div>
                      </MotionStaggerItem>
                    )}

                    <MotionStaggerItem>
                      <Field>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isLoading || (turnstileEnabled && !turnstileToken)}
                        >
                          {isLoading && <Loader2 className="size-4 animate-spin" />}
                          {isLoading ? t.auth.login.logging : t.auth.login.login}
                        </Button>
                      </Field>
                    </MotionStaggerItem>

                    <MotionStaggerItem>
                      <FieldSeparator>{t.auth.login.or}</FieldSeparator>
                    </MotionStaggerItem>

                    <MotionStaggerItem>
                      <FieldDescription className="font-(family-name:--font-geist-sans) text-center">
                        {t.auth.login.noAccount}{' '}
                        <Link href="/register" className="underline underline-offset-4">
                          {t.auth.login.createAccount}
                        </Link>
                      </FieldDescription>
                    </MotionStaggerItem>
                  </FieldGroup>
                </MotionStagger>
              </form>
            )}

          </div>
        </div>
      </div>

      {/* ── Panneau visuel ── */}
      <div className="relative hidden overflow-hidden bg-background lg:flex lg:flex-col lg:items-center lg:justify-center">
        <InteractiveGridPattern
          className="mask-[radial-gradient(700px_circle_at_center,white,transparent)] inset-x-0 inset-y-[-30%] h-[200%] skew-y-12"
          squaresClassName="stroke-primary/20 hover:fill-primary/10"
          width={40}
          height={40}
          squares={[40, 40]}
        />
        <div className="relative z-10 flex flex-col items-center gap-6 px-12 text-center">

          <MotionFade delay={0.1} direction="down" distance={16} duration={0.6}>
            <h2 className="font-(family-name:--font-krona) text-2xl font-bold tracking-tight">ALFYCHAT</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <AnimatedGradientText colorFrom="#7c3aed" colorTo="#9E7AFF" speed={0.6}>
                {t.auth.login.panelTagline}
              </AnimatedGradientText>
            </p>
          </MotionFade>
          <MotionStagger delay={0.25} stagger={0.1} className="flex flex-col gap-3 text-left">
            {[
              { icon: LockIcon, text: t.auth.login.panelFeature1 },
              { icon: ZapIcon, text: t.auth.login.panelFeature2 },
              { icon: GlobeIcon, text: t.auth.login.panelFeature3 },
            ].map((item) => (
              <MotionStaggerItem key={item.text} direction="left" distance={20}>
                <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/60 px-4 py-2.5 backdrop-blur-sm transition-colors hover:border-primary/40">
                  <item.icon size={14} className="shrink-0 text-primary" />
                  <span className="text-sm text-muted-foreground">{item.text}</span>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent" />
      </div>
    </div>
  );
}
