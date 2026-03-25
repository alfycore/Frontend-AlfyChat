'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  MessageCircleIcon, ShieldIcon, LockIcon, ZapIcon,
  EyeIcon, EyeOffIcon, MailIcon, KeyRoundIcon,
} from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import {
  Alert, Button, Card, Form, TextField, Label, InputGroup,
  Link, Separator, Spinner, InputOTP,
} from '@heroui/react';

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
      setError('Veuillez completer le captcha');
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
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-[900px]">
        <Card className="overflow-hidden border border-[var(--border)] bg-[var(--surface)] p-0 shadow-xl">
          <div className="grid md:grid-cols-[1fr_340px]">
            {/* ── Formulaire ── */}
            <div className="p-8 md:p-10">

              {/* ────── Étape email non vérifié ────── */}
              {emailNotVerifiedStep ? (
                <>
                  <div className="mb-8 flex flex-col items-center gap-3 md:items-start">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10">
                      <HugeiconsIcon icon={MailIcon} size={22} className="text-amber-400" />
                    </div>
                    <div className="text-center md:text-left">
                      <h1 className="text-2xl font-bold text-[var(--foreground)]">Email non vérifié</h1>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Vous devez vérifier votre adresse email avant de vous connecter.
                        Consultez votre boite mail et cliquez sur le lien d&apos;activation.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {resendSuccess && (
                      <Alert status="success">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>Email renvoyé ! Vérifiez votre boite mail.</Alert.Title>
                        </Alert.Content>
                      </Alert>
                    )}

                    <Button
                      fullWidth
                      isPending={resendLoading}
                      onPress={handleResendVerification}
                      isDisabled={resendSuccess}
                    >
                      {({ isPending }) => (
                        <>
                          {isPending ? <Spinner size="sm" color="current" /> : null}
                          {isPending ? 'Envoi...' : resendSuccess ? 'Email envoyé ✓' : 'Renvoyer l\'email de vérification'}
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      fullWidth
                      onPress={() => { setEmailNotVerifiedStep(false); setResendSuccess(false); setError(''); }}
                    >
                      Retour
                    </Button>
                  </div>
                </>
              ) : twoFactorStep ? (
                <>
                  <div className="mb-8 flex flex-col items-center gap-3 md:items-start">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--accent)]">
                      <HugeiconsIcon icon={ShieldIcon} size={22} className="text-[var(--accent-foreground)]" />
                    </div>
                    <div className="text-center md:text-left">
                      <h1 className="text-2xl font-bold text-[var(--foreground)]">Vérification 2FA</h1>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Entrez le code de votre application d&apos;authentification
                      </p>
                    </div>
                  </div>

                  <Form onSubmit={handle2FASubmit} className="flex flex-col gap-5">
                    {error && (
                      <Alert status="danger">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>{error}</Alert.Title>
                        </Alert.Content>
                      </Alert>
                    )}

                    <div className="flex flex-col items-center gap-4">
                      <InputOTP maxLength={6} value={totpCode} onChange={setTotpCode} autoFocus>
                        <InputOTP.Group>
                          <InputOTP.Slot index={0} className="bg-[var(--surface-secondary)] border-[var(--border)]" />
                          <InputOTP.Slot index={1} className="bg-[var(--surface-secondary)] border-[var(--border)]" />
                          <InputOTP.Slot index={2} className="bg-[var(--surface-secondary)] border-[var(--border)]" />
                        </InputOTP.Group>
                        <InputOTP.Separator />
                        <InputOTP.Group>
                          <InputOTP.Slot index={3} className="bg-[var(--surface-secondary)] border-[var(--border)]" />
                          <InputOTP.Slot index={4} className="bg-[var(--surface-secondary)] border-[var(--border)]" />
                          <InputOTP.Slot index={5} className="bg-[var(--surface-secondary)] border-[var(--border)]" />
                        </InputOTP.Group>
                      </InputOTP>
                      <p className="text-xs text-[var(--muted)]">
                        Code de sauvegarde ? Entrez vos 8 caractères dans le champ ci-dessus.
                      </p>
                    </div>

                    <div className="mt-1 flex flex-col gap-3">
                      <Button type="submit" fullWidth isPending={isLoading} isDisabled={totpCode.length < 6}>
                        {({ isPending }) => (
                          <>
                            {isPending ? <Spinner size="sm" color="current" /> : null}
                            {isPending ? 'Vérification...' : 'Vérifier'}
                          </>
                        )}
                      </Button>
                      <Button variant="ghost" fullWidth onPress={() => { setTwoFactorStep(false); setError(''); setTotpCode(''); }}>
                        Retour
                      </Button>
                    </div>
                  </Form>
                </>
              ) : (
                <>
              {/* En-tete */}
              <div className="mb-8 flex flex-col items-center gap-3 md:items-start">
                <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--accent)]">
                  <HugeiconsIcon icon={MessageCircleIcon} size={22} className="text-[var(--accent-foreground)]" />
                </div>
                <div className="text-center md:text-left">
                  <h1 className="text-2xl font-bold text-[var(--foreground)]">Bon retour !</h1>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Connectez-vous a votre compte AlfyChat
                  </p>
                </div>
              </div>

              <Form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {error && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>{error}</Alert.Title>
                    </Alert.Content>
                  </Alert>
                )}

                <div className="flex flex-col gap-5">
                  {/* Email */}
                  <TextField fullWidth name="email" isRequired value={email} onChange={setEmail}>
                    <Label>Adresse email</Label>
                    <InputGroup fullWidth className="bg-[var(--surface-secondary)] border-[var(--border)]">
                      <InputGroup.Prefix>
                        <HugeiconsIcon icon={MailIcon} size={16} className="text-[var(--muted)]" />
                      </InputGroup.Prefix>
                      <InputGroup.Input type="email" placeholder="votre@email.com" />
                    </InputGroup>
                  </TextField>

                  {/* Mot de passe */}
                  <TextField fullWidth name="password" isRequired value={password} onChange={setPassword}>
                    <div className="flex w-full items-center justify-between">
                      <Label>Mot de passe</Label>
                      <Link href="/forgot-password" className="text-xs font-medium text-[var(--accent)]">
                        Oublie ?
                      </Link>
                    </div>
                    <InputGroup fullWidth className="bg-[var(--surface-secondary)] border-[var(--border)]">
                      <InputGroup.Prefix>
                        <HugeiconsIcon icon={KeyRoundIcon} size={16} className="text-[var(--muted)]" />
                      </InputGroup.Prefix>
                      <InputGroup.Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Votre mot de passe"
                      />
                      <InputGroup.Suffix className="pr-0">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          onPress={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        >
                          <HugeiconsIcon icon={showPassword ? EyeOffIcon : EyeIcon} size={16} />
                        </Button>
                      </InputGroup.Suffix>
                    </InputGroup>
                  </TextField>

                  {/* Turnstile */}
                  {turnstileEnabled && turnstileSiteKey && (
                    <div className="flex justify-center">
                      <div ref={turnstileRef} />
                    </div>
                  )}
                </div>

                <div className="mt-1 flex flex-col gap-5">
                  <Button
                    type="submit"
                    fullWidth
                    isPending={isLoading}
                    isDisabled={turnstileEnabled && !turnstileToken}
                  >
                    {({ isPending }) => (
                      <>
                        {isPending ? <Spinner size="sm" color="current" /> : null}
                        {isPending ? 'Connexion...' : 'Se connecter'}
                      </>
                    )}
                  </Button>

                  <Separator />

                  <p className="text-center text-sm text-[var(--foreground)]">
                    Pas encore de compte ?{' '}
                    <Link href="/register" className="font-semibold text-[var(--accent)]">
                      Creer un compte
                    </Link>
                  </p>

                  <p className="text-center text-xs text-[var(--muted)]">
                    En continuant, vous acceptez nos{' '}
                    <Link href="/terms" className="text-xs text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)]">
                      CGU
                    </Link>{' '}
                    et notre{' '}
                    <Link href="/privacy" className="text-xs text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)]">
                      Politique de confidentialite
                    </Link>
                  </p>
                </div>
              </Form>
                </>
              )}
            </div>

            {/* ── Panneau visuel ── */}
            <div className="relative hidden overflow-hidden border-l border-[var(--border)] bg-[var(--surface-secondary)] md:flex md:flex-col md:items-center md:justify-center md:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,var(--accent)/8%,transparent_70%)]" />
              <div className="relative flex flex-col items-center gap-6">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/20">
                  <HugeiconsIcon icon={MessageCircleIcon} size={28} className="text-[var(--accent-foreground)]" />
                </div>
                <div className="text-center">
                  <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">AlfyChat</h2>
                  <p className="mt-1.5 max-w-56 text-sm leading-relaxed text-[var(--muted)]">
                    Messagerie securisee et privee
                  </p>
                </div>
                <div className="mt-2 w-full max-w-xs space-y-2.5">
                  {[
                    { icon: ShieldIcon, label: 'Chiffrement E2EE', color: 'text-blue-400' },
                    { icon: LockIcon, label: 'Conforme RGPD', color: 'text-violet-400' },
                    { icon: ZapIcon, label: 'Temps reel WebSocket', color: 'text-amber-400' },
                  ].map((feat) => (
                    <div
                      key={feat.label}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-tertiary)] px-4 py-3"
                    >
                      <HugeiconsIcon icon={feat.icon} size={18} className={feat.color} />
                      <span className="text-sm font-medium text-[var(--foreground)]">{feat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
