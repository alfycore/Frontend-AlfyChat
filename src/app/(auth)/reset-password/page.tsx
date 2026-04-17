'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LockIcon, ZapIcon, GlobeIcon, EyeIcon, EyeOffIcon } from '@/components/icons';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { useTranslation } from '@/components/locale-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';

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
    if (!token) {
      setError(t.auth.resetPassword.invalidLinkShort);
    }
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 8) {
      setError(t.auth.resetPassword.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.auth.resetPassword.passwordMismatch);
      return;
    }

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
            {success ? (
              <MotionStagger className="flex flex-col items-center gap-4 text-center">
                <MotionStaggerItem>
                  <div className="flex size-14 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle2 className="size-7 text-green-500" />
                  </div>
                </MotionStaggerItem>
                <MotionStaggerItem>
                  <h1 className="font-(family-name:--font-krona) text-2xl font-bold">
                    {t.auth.resetPassword.successTitle}
                  </h1>
                </MotionStaggerItem>
                <MotionStaggerItem>
                  <p className="text-sm text-muted-foreground text-balance">
                    {t.auth.resetPassword.successDesc}
                  </p>
                </MotionStaggerItem>
                <MotionStaggerItem>
                  <Link href="/login">
                    <Button className="mt-2 w-full">
                      {t.auth.resetPassword.loginNow}
                    </Button>
                  </Link>
                </MotionStaggerItem>
              </MotionStagger>
            ) : !token ? (
              <MotionStagger className="flex flex-col items-center gap-4 text-center">
                <MotionStaggerItem>
                  <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
                    <XCircle className="size-7 text-destructive" />
                  </div>
                </MotionStaggerItem>
                <MotionStaggerItem>
                  <h1 className="font-(family-name:--font-krona) text-2xl font-bold">
                    {t.auth.resetPassword.invalidLinkTitle}
                  </h1>
                </MotionStaggerItem>
                <MotionStaggerItem>
                  <p className="text-sm text-muted-foreground text-balance">
                    {t.auth.resetPassword.invalidLinkDesc}
                  </p>
                </MotionStaggerItem>
                <MotionStaggerItem>
                  <Link href="/forgot-password">
                    <Button variant="outline" className="mt-2 w-full">
                      {t.auth.resetPassword.requestNew}
                    </Button>
                  </Link>
                </MotionStaggerItem>
              </MotionStagger>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <MotionStagger>
                  <MotionStaggerItem className="flex flex-col items-center gap-2 text-center">
                    <h1 className="font-(family-name:--font-krona) text-2xl font-bold">
                      {t.auth.resetPassword.heading}
                    </h1>
                    <p className="text-sm text-balance text-muted-foreground">
                      {t.auth.resetPassword.subtitle}
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
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="password">{t.auth.resetPassword.password}</FieldLabel>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder={t.auth.resetPassword.passwordPlaceholder}
                            required
                            autoFocus
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pr-9"
                          />
                          <button
                            type="button"
                            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? t.auth.resetPassword.hidePassword : t.auth.resetPassword.showPassword}
                          >
                            {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                          </button>
                        </div>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="confirm-password">{t.auth.resetPassword.confirmPassword}</FieldLabel>
                        <Input
                          id="confirm-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t.auth.resetPassword.confirmPlaceholder}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </Field>

                      <Field>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isLoading || !password || !confirmPassword}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 size-4 animate-spin" />
                              {t.auth.resetPassword.submitting}
                            </>
                          ) : (
                            t.auth.resetPassword.submit
                          )}
                        </Button>
                      </Field>
                    </FieldGroup>
                  </MotionStaggerItem>
                </MotionStagger>

                <p className="text-center text-sm text-muted-foreground">
                  <Link href="/forgot-password" className="underline underline-offset-4 hover:text-foreground">
                    {t.auth.resetPassword.requestNew}
                  </Link>
                </p>
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
