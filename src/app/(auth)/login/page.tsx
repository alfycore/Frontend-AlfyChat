'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { Button, Form, InputGroup, InputOTP, Label, Link, Spinner, TextField } from '@heroui/react';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, QrCode, ShieldCheck } from 'lucide-react';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';

import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import { api } from '@/lib/api';
import { AlfyAuthShell, AlfyAuthHeading, AlfyAuthBanner } from '@/components/alfy/auth/alfy-auth-shell';
import { RemoteLoginPanel } from '@/components/auth/remote-login-panel';

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

  /** Bascule vers la connexion par QR depuis un téléphone déjà connecté. */
  const [qrStep, setQrStep] = useState(false);

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
        const data = res.data as { turnstileEnabled?: boolean; turnstileSiteKey?: string };
        setTurnstileEnabled(data.turnstileEnabled === true);
        setTurnstileSiteKey(data.turnstileSiteKey || null);
      }
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

  const resetTurnstile = () => {
    const w = window as unknown as { turnstile?: { reset: (id: string) => void } };
    if (turnstileWidgetId.current && w.turnstile) {
      w.turnstile.reset(turnstileWidgetId.current);
      setTurnstileToken(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (turnstileEnabled && !turnstileToken) { setError(t.auth.login.captchaRequired); return; }
    setIsLoading(true);
    try {
      const result = await login(email, password, turnstileToken || undefined);
      if (result.twoFactorRequired && result.twoFactorToken) { set2FAToken(result.twoFactorToken); setTwoFactorStep(true); return; }
      if (result.emailNotVerified) { setEmailNotVerifiedStep(true); return; }
      if (result.success) router.push('/channels/me');
      else { setError(result.error || t.auth.login.loginError); resetTurnstile(); }
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (totpCode.length < 6) { setError(t.auth.login.needCode6Digits); return; }
    setIsLoading(true);
    try {
      const result = await loginWith2FA(twoFactorToken, totpCode, password);
      if (result.success) router.push('/channels/me');
      else { setError(result.error || t.auth.login.invalidCode); setTotpCode(''); }
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
    <AlfyAuthShell>
      {emailNotVerifiedStep ? (
        /* ── Email non vérifié ── */
        <div className="alfy-enter flex flex-col gap-6">
          <AlfyAuthHeading
            title={t.auth.login.emailUnverified}
            subtitle={t.auth.login.emailUnverifiedDesc}
            icon={<span className="flex size-11 items-center justify-center rounded-xl bg-warning/12 text-warning"><Mail className="size-5" /></span>}
          />
          <div className="flex flex-col gap-2">
            {resendSuccess && <AlfyAuthBanner variant="success" message={t.auth.login.emailResent} />}
            <Button size="lg" className="w-full gap-2" isDisabled={resendLoading || resendSuccess} onPress={handleResendVerification}>
              {resendLoading && <Spinner size="sm" color="current" />}
              {resendLoading ? t.common.sending : resendSuccess ? `${t.common.send} ✓` : t.auth.login.resendVerification}
            </Button>
            <Button variant="ghost" size="lg" className="w-full gap-1.5 text-muted" onPress={() => { setEmailNotVerifiedStep(false); setResendSuccess(false); setError(''); }}>
              <ArrowLeft className="size-3.5" /> {t.common.back}
            </Button>
          </div>
        </div>
      ) : twoFactorStep ? (
        /* ── 2FA ── */
        <div className="alfy-enter flex flex-col gap-6">
          <AlfyAuthHeading
            title={t.auth.login.twoFAHeading}
            subtitle={t.auth.login.twoFASubtitle}
            icon={<span className="flex size-11 items-center justify-center rounded-xl bg-accent/12 text-accent"><ShieldCheck className="size-5" /></span>}
          />
          <Form onSubmit={handle2FASubmit} className="flex flex-col gap-4">
            {error && <AlfyAuthBanner message={error} />}
            <div className="flex flex-col gap-2">
              <Label className="text-[11px] font-medium tracking-wider text-muted uppercase">{t.auth.login.twoFACodeLabel}</Label>
              <InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS_AND_CHARS} value={totpCode} onChange={setTotpCode} autoFocus>
                <InputOTP.Group>
                  <InputOTP.Slot index={0} />
                  <InputOTP.Slot index={1} />
                  <InputOTP.Slot index={2} />
                </InputOTP.Group>
                <InputOTP.Separator />
                <InputOTP.Group>
                  <InputOTP.Slot index={3} />
                  <InputOTP.Slot index={4} />
                  <InputOTP.Slot index={5} />
                </InputOTP.Group>
              </InputOTP>
              <p className="text-[11px] text-muted">{t.auth.login.twoFABackupHint}</p>
            </div>
            <Button type="submit" size="lg" className="w-full gap-2" isDisabled={isLoading || totpCode.length < 6}>
              {isLoading && <Spinner size="sm" color="current" />}
              {isLoading ? t.auth.login.twoFAVerifying : t.auth.login.twoFAVerify}
            </Button>
            <Button type="button" variant="ghost" size="lg" className="w-full gap-1.5 text-muted" onPress={() => { setTwoFactorStep(false); setError(''); setTotpCode(''); }}>
              <ArrowLeft className="size-3.5" /> {t.common.back}
            </Button>
          </Form>
        </div>
      ) : qrStep ? (
        /* ── Connexion par QR code ── */
        <div className="alfy-enter flex flex-col gap-4">
          <RemoteLoginPanel />
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full gap-1.5 text-muted"
            onPress={() => setQrStep(false)}
          >
            <ArrowLeft className="size-3.5" /> {t.common.back}
          </Button>
        </div>
      ) : (
        /* ── Formulaire principal ── */
        <div className="alfy-enter flex flex-col gap-6">
          <AlfyAuthHeading title={t.auth.login.heading} subtitle={t.auth.login.subtitle} />
          <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <AlfyAuthBanner message={error} />}

            <TextField name="email" value={email} onChange={setEmail} isRequired>
              <Label className="text-[11px] font-medium tracking-wider text-muted uppercase">{t.auth.login.email}</Label>
              <InputGroup>
                <InputGroup.Prefix>
                  <Mail className="size-4 text-muted" aria-hidden />
                </InputGroup.Prefix>
                <InputGroup.Input type="email" placeholder={t.auth.login.emailPlaceholder} autoComplete="email" />
              </InputGroup>
            </TextField>

            <TextField name="password" value={password} onChange={setPassword} isRequired>
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-medium tracking-wider text-muted uppercase">{t.auth.login.password}</Label>
                <Link href="/forgot-password" className="text-xs text-muted hover:text-accent">{t.auth.login.forgotPassword}</Link>
              </div>
              <InputGroup>
                <InputGroup.Prefix>
                  <Lock className="size-4 text-muted" aria-hidden />
                </InputGroup.Prefix>
                <InputGroup.Input type={showPassword ? 'text' : 'password'} placeholder={t.auth.login.passwordPlaceholder} autoComplete="current-password" />
                <InputGroup.Suffix className="pr-0">
                  <Button isIconOnly size="sm" variant="ghost" aria-label={showPassword ? t.auth.login.hidePassword : t.auth.login.showPassword} onPress={() => setShowPassword((v) => !v)}>
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </InputGroup.Suffix>
              </InputGroup>
            </TextField>

            {turnstileEnabled && turnstileSiteKey && <div ref={turnstileRef} />}

            <Button type="submit" size="lg" className="w-full gap-2" isDisabled={isLoading || (turnstileEnabled && !turnstileToken)}>
              {isLoading && <Spinner size="sm" color="current" />}
              {isLoading ? t.auth.login.logging : t.auth.login.login}
            </Button>
          </Form>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-separator" />
              <span className="text-[10px] tracking-wider text-muted uppercase">{t.auth.login.or}</span>
              <div className="h-px flex-1 bg-separator" />
            </div>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full gap-2"
              onPress={() => setQrStep(true)}
            >
              <QrCode className="size-4" aria-hidden />
              Se connecter avec le téléphone
            </Button>

            <p className="text-[13px] text-muted">
              {t.auth.login.noAccount}{' '}
              <NextLink href="/register" className="font-medium text-accent hover:underline">{t.auth.login.createAccount}</NextLink>
            </p>
          </div>
        </div>
      )}
    </AlfyAuthShell>
  );
}
