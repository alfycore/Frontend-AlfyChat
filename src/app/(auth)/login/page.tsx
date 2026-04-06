'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldIcon, EyeIcon, EyeOffIcon, MailIcon } from '@/components/icons';
import { Loader2 } from 'lucide-react';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot,
} from '@/components/ui/input-otp';
import {
  Field, FieldGroup, FieldLabel, FieldDescription, FieldSeparator,
} from '@/components/ui/field';

export default function LoginPage() {
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
      setError('Veuillez compléter le captcha');
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
        setError(result.error || 'Erreur de connexion');
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
      setError('Veuillez entrer un code à 6 chiffres');
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginWith2FA(twoFactorToken, totpCode, password);
      if (result.success) {
        router.push('/channels/me');
      } else {
        setError(result.error || 'Code invalide');
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
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-(family-name:--font-krona) font-medium">
            <img src="/logo/Alfychat.svg" alt="ALFYCHAT" className="size-6" />
            ALFYCHAT
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">

            {/* ────── Étape email non vérifié ────── */}
            {emailNotVerifiedStep ? (
              <div className="font-(family-name:--font-geist-sans) flex flex-col gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10">
                    <MailIcon size={20} className="text-amber-400" />
                  </div>
                  <h1 className="font-(family-name:--font-krona) text-2xl font-bold">Email non vérifié</h1>
                  <p className="font-(family-name:--font-geist-sans) text-sm text-balance text-muted-foreground">
                    Vous devez vérifier votre adresse email avant de vous connecter.
                    Consultez votre boîte mail et cliquez sur le lien d&apos;activation.
                  </p>
                </div>

                <FieldGroup>
                  {resendSuccess && (
                    <div className="font-(family-name:--font-geist-sans) rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                      Email renvoyé ! Vérifiez votre boîte mail.
                    </div>
                  )}

                  <Field>
                    <Button
                      className="w-full"
                      disabled={resendLoading || resendSuccess}
                      onClick={handleResendVerification}
                    >
                      {resendLoading && <Loader2 className="size-4 animate-spin" />}
                      {resendLoading ? 'Envoi...' : resendSuccess ? 'Email envoyé ✓' : 'Renvoyer l\'email de vérification'}
                    </Button>
                  </Field>
                  <Field>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => { setEmailNotVerifiedStep(false); setResendSuccess(false); setError(''); }}
                    >
                      Retour
                    </Button>
                  </Field>
                </FieldGroup>
              </div>

            ) : twoFactorStep ? (
              /* ────── Étape 2FA ────── */
              <div className="font-(family-name:--font-geist-sans) flex flex-col gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <ShieldIcon size={20} className="text-primary" />
                  </div>
                  <h1 className="font-(family-name:--font-krona) text-2xl font-bold">Vérification 2FA</h1>
                  <p className="text-sm text-balance text-muted-foreground">
                    Entrez le code de votre application d&apos;authentification
                  </p>
                </div>

                <form onSubmit={handle2FASubmit}>
                  <FieldGroup>
                    {error && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error}
                      </div>
                    )}

                    <Field>
                      <FieldLabel>Code à 6 chiffres</FieldLabel>
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
                        Code de sauvegarde ? Entrez vos 8 caractères ci-dessus.
                      </p>
                    </Field>

                    <Field>
                      <Button type="submit" className="w-full" disabled={isLoading || totpCode.length < 6}>
                        {isLoading && <Loader2 className="size-4 animate-spin" />}
                        {isLoading ? 'Vérification...' : 'Vérifier'}
                      </Button>
                    </Field>
                    <Field>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={() => { setTwoFactorStep(false); setError(''); setTotpCode(''); }}
                      >
                        Retour
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              </div>

            ) : (
              /* ────── Formulaire principal ────── */
              <form onSubmit={handleSubmit} className="font-(family-name:--font-geist-sans) flex flex-col gap-6">
                <FieldGroup>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="font-(family-name:--font-krona) text-2xl font-bold">Bon retour !</h1>
                    <p className="text-sm text-balance text-muted-foreground">
                      Connectez-vous à votre compte ALFYCHAT
                    </p>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Field>
                    <FieldLabel htmlFor="email">Adresse email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>

                  <Field>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                      <Link
                        href="/forgot-password"
                        className="ml-auto text-sm underline-offset-4 hover:underline"
                      >
                        Oublié ?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Votre mot de passe"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-9"
                      />
                      <button
                        type="button"
                        className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      >
                        {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                      </button>
                    </div>
                  </Field>

                  {/* Turnstile */}
                  {turnstileEnabled && turnstileSiteKey && (
                    <div className="flex justify-center">
                      <div ref={turnstileRef} />
                    </div>
                  )}

                  <Field>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || (turnstileEnabled && !turnstileToken)}
                    >
                      {isLoading && <Loader2 className="size-4 animate-spin" />}
                      {isLoading ? 'Connexion...' : 'Se connecter'}
                    </Button>
                  </Field>

                  <FieldSeparator>Ou</FieldSeparator>

                  <FieldDescription className="font-(family-name:--font-geist-sans) text-center">
                    Pas encore de compte ?{' '}
                    <Link href="/register" className="underline underline-offset-4">
                      Créer un compte
                    </Link>
                  </FieldDescription>
                </FieldGroup>
              </form>
            )}

          </div>
        </div>
      </div>

      {/* ── Panneau visuel ── */}
      <div className="relative hidden bg-muted lg:block">
        <img
          src="https://img.freepik.com/photos-gratuite/beau-plan-vertical-long-sommet-montagne-recouvert-herbe-verte-parfait-pour-papier-peint_181624-4986.jpg?t=st=1775414869~exp=1775418469~hmac=3c1ac9a2bc04b3df52ba9a079bd94e6ae694be6fb2be7381a5248d028ca28d87&w=1060"
          alt=""
          className="absolute  h-full w-full object-cover"
        />
      </div>
    </div>
  );
}