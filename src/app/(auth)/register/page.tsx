'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { EyeIcon, EyeOffIcon, LockIcon, ZapIcon, GlobeIcon, UsersIcon } from '@/components/icons';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field, FieldGroup, FieldLabel, FieldDescription, FieldSeparator,
} from '@/components/ui/field';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  const inviteCode = searchParams.get('invite') || '';

  useEffect(() => {
    api.getRegisterSettings().then((res) => {
      if (res.success && res.data) {
        const data = res.data as any;
        setRegistrationEnabled(data.registrationEnabled !== false);
        setTurnstileEnabled(data.turnstileEnabled === true);
        setTurnstileSiteKey(data.turnstileSiteKey || null);
      }
      setSettingsLoaded(true);
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

    if (password !== confirmPassword) {
      setError(t.auth.register.passwordMismatch);
      return;
    }
    if (password.length < 8) {
      setError(t.auth.register.passwordTooShort);
      return;
    }
    if (!acceptTerms) {
      setError(t.auth.register.mustAcceptTerms);
      return;
    }
    if (turnstileEnabled && !turnstileToken) {
      setError(t.auth.register.captchaRequired);
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({
        email,
        username,
        password,
        displayName: displayName || username,
        ...(inviteCode && { inviteCode }),
        ...(turnstileToken && { turnstileToken }),
      });
      if (result.success) {
        router.push('/channels/gotostart');
      } else if ((result as any).emailNotVerified) {
        router.push('/login?emailVerification=1&email=' + encodeURIComponent(email));
      } else {
        setError(result.error || t.auth.register.registerError);
        if (turnstileWidgetId.current && (window as any).turnstile) {
          (window as any).turnstile.reset(turnstileWidgetId.current);
          setTurnstileToken(null);
        }
      }
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
          <div className="w-full max-w-sm">

            <form onSubmit={handleSubmit} className="font-(family-name:--font-geist-sans) flex flex-col gap-6">
              <MotionStagger>
                <FieldGroup>
                  <MotionStaggerItem className="flex flex-col items-center gap-1 text-center">
                    <h1 className="font-(family-name:--font-krona) text-2xl font-bold">{t.auth.register.heading}</h1>
                    <p className="text-sm text-balance text-muted-foreground">
                      {t.auth.register.subtitle}
                    </p>
                  </MotionStaggerItem>

                  {error && (
                    <MotionStaggerItem>
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error}
                      </div>
                    </MotionStaggerItem>
                  )}

                  {!registrationEnabled && !inviteCode && settingsLoaded && (
                    <MotionStaggerItem>
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
                        {t.auth.register.closedDesc}
                      </div>
                    </MotionStaggerItem>
                  )}

                  {inviteCode && (
                    <MotionStaggerItem>
                      <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                        {t.auth.register.inviteDesc}
                      </div>
                    </MotionStaggerItem>
                  )}

                  {/* Email */}
                  <MotionStaggerItem>
                    <Field>
                      <FieldLabel htmlFor="email">{t.auth.register.email}</FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t.auth.register.emailPlaceholder}
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </Field>
                  </MotionStaggerItem>

                  {/* Identifiant + Nom */}
                  <MotionStaggerItem>
                    <div className="grid grid-cols-2 gap-3">
                      <Field>
                        <FieldLabel htmlFor="username">{t.auth.register.username}</FieldLabel>
                        <Input
                          id="username"
                          type="text"
                          placeholder={t.auth.register.usernamePlaceholder}
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="displayName">{t.auth.register.displayName}</FieldLabel>
                        <Input
                          id="displayName"
                          type="text"
                          placeholder={t.auth.register.displayNamePlaceholder}
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                        />
                      </Field>
                    </div>
                  </MotionStaggerItem>

                  {/* Mot de passe */}
                  <MotionStaggerItem>
                    <Field>
                      <FieldLabel htmlFor="password">{t.auth.register.password}</FieldLabel>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t.auth.register.passwordDesc}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pr-9"
                        />
                        <button
                          type="button"
                          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? t.auth.register.hide : t.auth.register.show}
                        >
                          {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                        </button>
                      </div>
                      <FieldDescription>{t.auth.register.passwordDesc}</FieldDescription>
                    </Field>
                  </MotionStaggerItem>

                  {/* Confirmation */}
                  <MotionStaggerItem>
                    <Field>
                      <FieldLabel htmlFor="confirmPassword">{t.auth.register.confirmPassword}</FieldLabel>
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t.auth.register.confirmPlaceholder}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </Field>
                  </MotionStaggerItem>

                  {/* CGU */}
                  <MotionStaggerItem>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="terms"
                        checked={acceptTerms}
                        onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                        className="shrink-0"
                      />
                      <label htmlFor="terms" className="text-sm font-normal leading-normal select-none">
                        {t.auth.register.accept}{' '}
                        <Link href="/terms" className="underline underline-offset-4 hover:text-primary">{t.auth.register.termsOf}</Link>
                        {' '}{t.auth.register.and}{' '}
                        <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">{t.auth.register.privacyPolicy}</Link>
                      </label>
                    </div>
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
                        disabled={isLoading || (!registrationEnabled && !inviteCode)}
                      >
                        {isLoading && <Loader2 className="size-4 animate-spin" />}
                        {isLoading ? t.auth.register.creating : t.auth.register.createAccount}
                      </Button>
                    </Field>
                  </MotionStaggerItem>

                  <MotionStaggerItem>
                    <FieldSeparator>{t.auth.login.or}</FieldSeparator>
                  </MotionStaggerItem>

                  <MotionStaggerItem>
                    <FieldDescription className="font-(family-name:--font-geist-sans) text-center">
                      {t.auth.register.alreadyAccount}{' '}
                      <Link href="/login" className="underline underline-offset-4">
                        {t.auth.register.logIn}
                      </Link>
                    </FieldDescription>
                  </MotionStaggerItem>
                </FieldGroup>
              </MotionStagger>
            </form>

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
          <MotionFade delay={0.05} direction="none" duration={0.5} className="flex size-20 items-center justify-center rounded-[28px] t p-4">
            <img src="/logo/Alfychat.svg" alt="ALFYCHAT" className="size-full" />
          </MotionFade>
          <MotionFade delay={0.15} direction="down" distance={16} duration={0.6}>
            <h2 className="font-(family-name:--font-krona) text-2xl font-bold tracking-tight">ALFYCHAT</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <AnimatedGradientText colorFrom="#7c3aed" colorTo="#9E7AFF" speed={0.6}>
                {t.auth.login.panelTagline}
              </AnimatedGradientText>
            </p>
          </MotionFade>
          <MotionStagger delay={0.3} stagger={0.1} className="flex flex-col gap-3 text-left">
            {[
              { icon: LockIcon, text: t.auth.login.panelFeature1 },
              { icon: UsersIcon, text: t.auth.register.sideCommunityDesc },
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
