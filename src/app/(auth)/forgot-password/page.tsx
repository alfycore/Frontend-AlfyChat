'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailIcon, LockIcon, ZapIcon, GlobeIcon } from '@/components/icons';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { useTranslation } from '@/components/locale-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';

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
            {sent ? (
              <MotionStagger className="flex flex-col items-center gap-4 text-center">
                <MotionStaggerItem>
                  <div className="flex size-14 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle2 className="size-7 text-green-500" />
                  </div>
                </MotionStaggerItem>
                <MotionStaggerItem>
                  <h1 className="font-(family-name:--font-krona) text-2xl font-bold">
                    {t.auth.forgotPassword.sentTitle}
                  </h1>
                </MotionStaggerItem>
                <MotionStaggerItem>
                  <p className="text-sm text-muted-foreground text-balance">
                    {tx(t.auth.forgotPassword.sentDesc, { email })}
                  </p>
                </MotionStaggerItem>
                <MotionStaggerItem>
                  <p className="text-xs text-muted-foreground">
                    {t.auth.forgotPassword.sentExpiry} <strong>{t.auth.forgotPassword.oneHour}</strong>.
                  </p>
                </MotionStaggerItem>
                <MotionStaggerItem>
                  <Link href="/login">
                    <Button variant="outline" className="mt-2 w-full">
                      {t.auth.forgotPassword.backToLogin}
                    </Button>
                  </Link>
                </MotionStaggerItem>
              </MotionStagger>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <MotionStagger>
                  <MotionStaggerItem className="flex flex-col items-center gap-2 text-center">
                    <h1 className="font-(family-name:--font-krona) text-2xl font-bold">
                      {t.auth.forgotPassword.heading}
                    </h1>
                    <p className="text-sm text-balance text-muted-foreground">
                      {t.auth.forgotPassword.subtitle}
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
                        <FieldLabel htmlFor="email">{t.auth.forgotPassword.email}</FieldLabel>
                        <div className="relative">
                          <MailIcon size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder={t.auth.forgotPassword.emailPlaceholder}
                            required
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </Field>

                      <Field>
                        <Button type="submit" className="w-full" disabled={isLoading || !email}>
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 size-4 animate-spin" />
                              {t.auth.forgotPassword.sending}
                            </>
                          ) : (
                            t.auth.forgotPassword.send
                          )}
                        </Button>
                      </Field>
                    </FieldGroup>
                  </MotionStaggerItem>
                </MotionStagger>

                <p className="text-center text-sm text-muted-foreground">
                  {t.auth.forgotPassword.rememberPassword}{' '}
                  <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
                    {t.auth.forgotPassword.logIn}
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
