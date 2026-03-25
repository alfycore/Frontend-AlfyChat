'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  MessageCircleIcon, ShieldIcon, LockIcon, UsersIcon,
  EyeIcon, EyeOffIcon, MailIcon, KeyRoundIcon, UserIcon, AtSignIcon,
} from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import {
  Alert, Button, Card, Checkbox, Description, Form, InputGroup,
  Label, Link, Separator, Spinner, TextField,
} from '@heroui/react';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[var(--background)]"><Spinner size="lg" /></div>}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
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
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (!acceptTerms) {
      setError("Vous devez accepter les conditions d'utilisation");
      return;
    }
    if (turnstileEnabled && !turnstileToken) {
      setError('Veuillez compléter le captcha');
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
        router.push('/channels/me');
      } else {
        setError(result.error || "Erreur lors de l'inscription");
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
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-[900px]">
        <Card className="overflow-hidden border border-[var(--border)] bg-[var(--surface)] p-0 shadow-xl">
          <div className="grid md:grid-cols-[340px_1fr]">
            {/* ── Panneau visuel ── */}
            <div className="relative hidden overflow-hidden border-r border-[var(--border)] bg-[var(--surface-secondary)] md:flex md:flex-col md:items-center md:justify-center md:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,var(--accent)/8%,transparent_70%)]" />
              <div className="relative flex flex-col items-center gap-6">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/20">
                  <HugeiconsIcon icon={MessageCircleIcon} size={28} className="text-[var(--accent-foreground)]" />
                </div>
                <div className="text-center">
                  <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">Rejoignez AlfyChat</h2>
                  <p className="mt-1.5 max-w-56 text-sm leading-relaxed text-[var(--muted)]">
                    La messagerie chiffrée nouvelle generation
                  </p>
                </div>
                <div className="mt-2 w-full max-w-xs space-y-2.5">
                  {[
                    { icon: ShieldIcon, label: 'Chiffrement E2EE', desc: 'AES-256 + ECDH P-256', color: 'text-blue-400' },
                    { icon: LockIcon, label: 'Vie privee', desc: 'Conforme RGPD', color: 'text-violet-400' },
                    { icon: UsersIcon, label: 'Communaute', desc: 'Serveurs et groupes', color: 'text-emerald-400' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-tertiary)] px-4 py-3"
                    >
                      <HugeiconsIcon icon={item.icon} size={18} className={item.color} />
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{item.label}</p>
                        <p className="text-xs text-[var(--muted)]">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Formulaire ── */}
            <div className="p-8 md:p-10">
              {/* En-tete */}
              <div className="mb-6 flex flex-col items-center gap-3 md:items-start">
                <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--accent)] md:hidden">
                  <HugeiconsIcon icon={MessageCircleIcon} size={22} className="text-[var(--accent-foreground)]" />
                </div>
                <div className="text-center md:text-left">
                  <h1 className="text-2xl font-bold text-[var(--foreground)]">Creer un compte</h1>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Rejoignez la communaute AlfyChat
                  </p>
                </div>
              </div>

              <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>{error}</Alert.Title>
                    </Alert.Content>
                  </Alert>
                )}

                {!registrationEnabled && !inviteCode && settingsLoaded && (
                  <Alert status="warning">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>Inscriptions fermees</Alert.Title>
                      <Alert.Description>Un lien d&apos;invitation est requis.</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}

                {inviteCode && (
                  <Alert status="success">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>Invitation detectee</Alert.Title>
                      <Alert.Description>Utilisez l&apos;email associe a votre invitation.</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}

                <div className="flex flex-col gap-4">
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

                  {/* Identifiant + Nom */}
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      fullWidth
                      name="username"
                      isRequired
                      value={username}
                      onChange={(v: string) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    >
                      <Label>Identifiant</Label>
                      <InputGroup fullWidth className="bg-[var(--surface-secondary)] border-[var(--border)]">
                        <InputGroup.Prefix>
                          <HugeiconsIcon icon={AtSignIcon} size={16} className="text-[var(--muted)]" />
                        </InputGroup.Prefix>
                        <InputGroup.Input placeholder="username" />
                      </InputGroup>
                    </TextField>

                    <TextField fullWidth name="displayName" value={displayName} onChange={setDisplayName}>
                      <Label>Nom d&apos;affichage</Label>
                      <InputGroup fullWidth className="bg-[var(--surface-secondary)] border-[var(--border)]">
                        <InputGroup.Prefix>
                          <HugeiconsIcon icon={UserIcon} size={16} className="text-[var(--muted)]" />
                        </InputGroup.Prefix>
                        <InputGroup.Input placeholder="Votre nom" />
                      </InputGroup>
                    </TextField>
                  </div>

                  {/* Mot de passe */}
                  <TextField fullWidth name="password" isRequired value={password} onChange={setPassword}>
                    <Label>Mot de passe</Label>
                    <InputGroup fullWidth className="bg-[var(--surface-secondary)] border-[var(--border)]">
                      <InputGroup.Prefix>
                        <HugeiconsIcon icon={KeyRoundIcon} size={16} className="text-[var(--muted)]" />
                      </InputGroup.Prefix>
                      <InputGroup.Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimum 8 caracteres"
                      />
                      <InputGroup.Suffix className="pr-0">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          onPress={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Masquer' : 'Afficher'}
                        >
                          <HugeiconsIcon icon={showPassword ? EyeOffIcon : EyeIcon} size={16} />
                        </Button>
                      </InputGroup.Suffix>
                    </InputGroup>
                    <Description>Minimum 8 caracteres</Description>
                  </TextField>

                  {/* Confirmation */}
                  <TextField fullWidth name="confirmPassword" isRequired value={confirmPassword} onChange={setConfirmPassword}>
                    <Label>Confirmer le mot de passe</Label>
                    <InputGroup fullWidth className="bg-[var(--surface-secondary)] border-[var(--border)]">
                      <InputGroup.Prefix>
                        <HugeiconsIcon icon={KeyRoundIcon} size={16} className="text-[var(--muted)]" />
                      </InputGroup.Prefix>
                      <InputGroup.Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Retapez votre mot de passe"
                      />
                    </InputGroup>
                  </TextField>

                  {/* CGU */}
                  <Checkbox
                    isSelected={acceptTerms}
                    onChange={setAcceptTerms}
                    name="terms"
                  >
                    <Checkbox.Control className='bg-[var(--surface-secondary)] border-[var(--border)] data-[state=checked]:border-[var(--accent)]'>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Content>
                      <span className="">
                        J&apos;accepte les{' '}
                        <Link href="/terms" className="text-sm font-medium text-[var(--accent)]">
                          conditions d&apos;utilisation
                        </Link>{' '}
                        et la{' '}
                        <Link href="/privacy" className="text-sm font-medium text-[var(--accent)]">
                          politique de confidentialite
                        </Link>
                      </span>
                    </Checkbox.Content>
                  </Checkbox>

                  {/* Turnstile */}
                  {turnstileEnabled && turnstileSiteKey && (
                    <div className="flex justify-center">
                      <div ref={turnstileRef} />
                    </div>
                  )}
                </div>

                <div className="mt-2 flex flex-col gap-4">
                  <Button
                    type="submit"
                    fullWidth
                    isPending={isLoading}
                    isDisabled={!registrationEnabled && !inviteCode}
                  >
                    {({ isPending }) => (
                      <>
                        {isPending ? <Spinner size="sm" color="current" /> : null}
                        {isPending ? 'Creation...' : 'Creer mon compte'}
                      </>
                    )}
                  </Button>

                  <Separator />

                  <p className="text-center text-sm text-[var(--foreground)]">
                    Deja un compte ?{' '}
                    <Link href="/login" className="font-semibold text-[var(--accent)]">
                      Se connecter
                    </Link>
                  </p>

                  <p className="text-center text-xs text-[var(--muted)]">
                    En creant un compte, vous acceptez nos{' '}
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
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
