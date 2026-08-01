'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NextLink from 'next/link';
import { Button, Checkbox, Form, InputGroup, Label, Link, Spinner, TextField } from '@heroui/react';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import { api } from '@/lib/api';
import { AlfyAuthShell, AlfyAuthHeading, AlfyAuthBanner } from '@/components/alfy/auth/alfy-auth-shell';

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
        const data = res.data as { registrationEnabled?: boolean; turnstileEnabled?: boolean; turnstileSiteKey?: string };
        setRegistrationEnabled(data.registrationEnabled !== false);
        setTurnstileEnabled(data.turnstileEnabled === true);
        setTurnstileSiteKey(data.turnstileSiteKey || null);
      }
      setSettingsLoaded(true);
    });
  }, []);

  const renderTurnstile = useCallback(() => {
    const w = window as unknown as { turnstile?: { render: (el: HTMLElement, o: unknown) => string; reset: (id: string) => void } };
    if (!turnstileEnabled || !turnstileSiteKey || !turnstileRef.current) return;
    if (turnstileWidgetId.current && w.turnstile) { w.turnstile.reset(turnstileWidgetId.current); return; }
    if (w.turnstile) {
      turnstileWidgetId.current = w.turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(null),
        'error-callback': () => setTurnstileToken(null),
        theme: 'auto',
      });
    }
  }, [turnstileEnabled, turnstileSiteKey]);

  useEffect(() => {
    if (!turnstileEnabled || !turnstileSiteKey) return;
    const w = window as unknown as { turnstile?: unknown };
    if (w.turnstile) { renderTurnstile(); return; }
    if (document.querySelector('script[src*="turnstile"]')) return;
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
      if (result.success) router.push('/channels/gotostart');
      else if ((result as { emailNotVerified?: boolean }).emailNotVerified) router.push('/login?emailVerification=1&email=' + encodeURIComponent(email));
      else {
        setError(result.error || t.auth.register.registerError);
        const w = window as unknown as { turnstile?: { reset: (id: string) => void } };
        if (turnstileWidgetId.current && w.turnstile) { w.turnstile.reset(turnstileWidgetId.current); setTurnstileToken(null); }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlfyAuthShell>
      <div className="alfy-enter flex flex-col gap-6">
        <AlfyAuthHeading title={t.auth.register.heading} subtitle={t.auth.register.subtitle} />

        <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <AlfyAuthBanner message={error} />}
          {!registrationEnabled && !inviteCode && settingsLoaded && <AlfyAuthBanner variant="warning" message={t.auth.register.closedDesc} />}
          {inviteCode && <AlfyAuthBanner variant="success" message={t.auth.register.inviteDesc} />}

          <TextField name="email" value={email} onChange={setEmail} isRequired>
            <Label className="text-[11px] font-medium tracking-wider text-muted uppercase">{t.auth.register.email}</Label>
            <InputGroup>
              <InputGroup.Prefix><Mail className="size-4 text-muted" aria-hidden /></InputGroup.Prefix>
              <InputGroup.Input type="email" placeholder={t.auth.register.emailPlaceholder} autoComplete="email" />
            </InputGroup>
          </TextField>

          <div className="grid grid-cols-2 gap-3">
            <TextField name="username" value={username} onChange={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))} isRequired>
              <Label className="text-[11px] font-medium tracking-wider text-muted uppercase">{t.auth.register.username}</Label>
              <InputGroup>
                <InputGroup.Prefix><User className="size-4 text-muted" aria-hidden /></InputGroup.Prefix>
                <InputGroup.Input placeholder={t.auth.register.usernamePlaceholder} autoComplete="username" />
              </InputGroup>
            </TextField>
            <TextField name="displayName" value={displayName} onChange={setDisplayName}>
              <Label className="text-[11px] font-medium tracking-wider text-muted uppercase">{t.auth.register.displayName}</Label>
              <InputGroup>
                <InputGroup.Input placeholder={t.auth.register.displayNamePlaceholder} />
              </InputGroup>
            </TextField>
          </div>

          <TextField name="password" value={password} onChange={setPassword} isRequired>
            <Label className="text-[11px] font-medium tracking-wider text-muted uppercase">{t.auth.register.password}</Label>
            <InputGroup>
              <InputGroup.Prefix><Lock className="size-4 text-muted" aria-hidden /></InputGroup.Prefix>
              <InputGroup.Input type={showPassword ? 'text' : 'password'} placeholder={t.auth.register.passwordDesc} autoComplete="new-password" />
              <InputGroup.Suffix className="pr-0">
                <Button isIconOnly size="sm" variant="ghost" aria-label={showPassword ? t.auth.register.hide : t.auth.register.show} onPress={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </InputGroup.Suffix>
            </InputGroup>
          </TextField>

          <TextField name="confirmPassword" value={confirmPassword} onChange={setConfirmPassword} isRequired>
            <Label className="text-[11px] font-medium tracking-wider text-muted uppercase">{t.auth.register.confirmPassword}</Label>
            <InputGroup>
              <InputGroup.Prefix><Lock className="size-4 text-muted" aria-hidden /></InputGroup.Prefix>
              <InputGroup.Input type={showPassword ? 'text' : 'password'} placeholder={t.auth.register.confirmPlaceholder} autoComplete="new-password" />
            </InputGroup>
          </TextField>

          <div className="flex items-start gap-2.5">
            <Checkbox isSelected={acceptTerms} onChange={setAcceptTerms} aria-label={t.auth.register.accept}>
              <Checkbox.Content>
                <Checkbox.Control className="mt-0.5">
                  <Checkbox.Indicator />
                </Checkbox.Control>
              </Checkbox.Content>
            </Checkbox>
            <p className="text-[13px] leading-relaxed text-muted select-none">
              {t.auth.register.accept}{' '}
              <NextLink href="/terms" className="text-foreground underline underline-offset-4 hover:text-accent">{t.auth.register.termsOf}</NextLink>
              {' '}{t.auth.register.and}{' '}
              <NextLink href="/privacy" className="text-foreground underline underline-offset-4 hover:text-accent">{t.auth.register.privacyPolicy}</NextLink>
            </p>
          </div>

          {turnstileEnabled && turnstileSiteKey && <div ref={turnstileRef} />}

          <Button type="submit" size="lg" className="w-full gap-2" isDisabled={isLoading || (!registrationEnabled && !inviteCode)}>
            {isLoading && <Spinner size="sm" color="current" />}
            {isLoading ? t.auth.register.creating : t.auth.register.createAccount}
          </Button>
        </Form>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-separator" />
            <span className="text-[10px] tracking-wider text-muted uppercase">{t.auth.login.or}</span>
            <div className="h-px flex-1 bg-separator" />
          </div>
          <p className="text-[13px] text-muted">
            {t.auth.register.alreadyAccount}{' '}
            <Link href="/login" className="font-medium text-accent hover:underline">{t.auth.register.logIn}</Link>
          </p>
        </div>
      </div>
    </AlfyAuthShell>
  );
}
