'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  MailIcon, EyeIcon, EyeOffIcon, LockIcon, UserIcon,
} from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
      {message}
    </div>
  );
}

function InfoBanner({ message, variant = 'warning' }: { message: string; variant?: 'warning' | 'success' }) {
  const cls = variant === 'success'
    ? 'border-success/20 bg-success/10 text-success'
    : 'border-warning/20 bg-warning/10 text-warning';
  return (
    <div className={cn('rounded-lg border px-4 py-3 text-[13px]', cls)}>
      {message}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
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
    if (password !== confirmPassword) { setError(t.auth.register.passwordMismatch); return; }
    if (password.length < 8) { setError(t.auth.register.passwordTooShort); return; }
    if (!acceptTerms) { setError(t.auth.register.mustAcceptTerms); return; }
    if (turnstileEnabled && !turnstileToken) { setError(t.auth.register.captchaRequired); return; }
    setIsLoading(true);
    try {
      const result = await register({
        email, username, password,
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

        {/* Formulaire */}
        <div className="flex flex-1 items-center justify-center px-8 py-10">
          <div className="w-full max-w-xs">
            <MotionStagger className="flex flex-col gap-6">

              <MotionStaggerItem className="flex flex-col gap-1">
                <h1 className="font-(family-name:--font-krona) text-2xl font-bold text-foreground">
                  {t.auth.register.heading}
                </h1>
                <p className="text-[13px] text-muted-foreground">{t.auth.register.subtitle}</p>
              </MotionStaggerItem>

              <MotionStaggerItem>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                  {error && <ErrorBanner message={error} />}
                  {!registrationEnabled && !inviteCode && settingsLoaded && (
                    <InfoBanner message={t.auth.register.closedDesc} variant="warning" />
                  )}
                  {inviteCode && (
                    <InfoBanner message={t.auth.register.inviteDesc} variant="success" />
                  )}

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="email" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t.auth.register.email}
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                        <MailIcon size={14} />
                      </span>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t.auth.register.emailPlaceholder}
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-9 pl-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Identifiant + Nom affiché */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="username" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t.auth.register.username}
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                          <UserIcon size={14} />
                        </span>
                        <Input
                          id="username"
                          type="text"
                          placeholder={t.auth.register.usernamePlaceholder}
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          className="h-9 pl-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="displayName" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t.auth.register.displayName}
                      </label>
                      <Input
                        id="displayName"
                        type="text"
                        placeholder={t.auth.register.displayNamePlaceholder}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Mot de passe */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="password" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t.auth.register.password}
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                        <LockIcon size={14} />
                      </span>
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t.auth.register.passwordDesc}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-9 pl-8 pr-9 text-sm"
                      />
                      <button
                        type="button"
                        className="ui-smooth absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t.auth.register.hide : t.auth.register.show}
                      >
                        {showPassword ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmation */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="confirmPassword" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t.auth.register.confirmPassword}
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                        <LockIcon size={14} />
                      </span>
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t.auth.register.confirmPlaceholder}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-9 pl-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* CGU */}
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="terms"
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                      className="mt-0.5 shrink-0"
                    />
                    <label htmlFor="terms" className="text-[13px] leading-relaxed text-muted-foreground select-none">
                      {t.auth.register.accept}{' '}
                      <Link href="/terms" className="text-foreground underline underline-offset-4 hover:text-primary">
                        {t.auth.register.termsOf}
                      </Link>
                      {' '}{t.auth.register.and}{' '}
                      <Link href="/privacy" className="text-foreground underline underline-offset-4 hover:text-primary">
                        {t.auth.register.privacyPolicy}
                      </Link>
                    </label>
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
                    disabled={isLoading || (!registrationEnabled && !inviteCode)}
                  >
                    {isLoading && <Spinner className="size-4" />}
                    {isLoading ? t.auth.register.creating : t.auth.register.createAccount}
                  </Button>
                </form>
              </MotionStaggerItem>

              {/* Lien connexion */}
              <MotionStaggerItem className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
                    {t.auth.login.or}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {t.auth.register.alreadyAccount}{' '}
                  <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                    {t.auth.register.logIn}
                  </Link>
                </p>
              </MotionStaggerItem>

            </MotionStagger>
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
