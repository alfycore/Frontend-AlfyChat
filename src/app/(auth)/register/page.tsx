'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { EyeIcon, EyeOffIcon, LockIcon, ZapIcon, GlobeIcon, UsersIcon } from '@/components/icons';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
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
        router.push('/channels/gotostart');
      } else if ((result as any).emailNotVerified) {
        router.push('/login?emailVerification=1&email=' + encodeURIComponent(email));
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
          <div className="w-full max-w-sm">

            <form onSubmit={handleSubmit} className="font-(family-name:--font-geist-sans) flex flex-col gap-6">
              <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                  <h1 className="font-(family-name:--font-krona) text-2xl font-bold">Créer un compte</h1>
                  <p className="text-sm text-balance text-muted-foreground">
                    Rejoignez la communauté ALFYCHAT
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {!registrationEnabled && !inviteCode && settingsLoaded && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
                    Inscriptions fermées — un lien d&apos;invitation est requis.
                  </div>
                )}

                {inviteCode && (
                  <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                    Invitation détectée — utilisez l&apos;email associé.
                  </div>
                )}

                {/* Email */}
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

                {/* Identifiant + Nom */}
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="username">Identifiant</FieldLabel>
                    <Input
                      id="username"
                      type="text"
                      placeholder="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="displayName">Nom d&apos;affichage</FieldLabel>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Votre nom"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </Field>
                </div>

                {/* Mot de passe */}
                <Field>
                  <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 8 caractères"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-9"
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Masquer' : 'Afficher'}
                    >
                      {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                  <FieldDescription>Minimum 8 caractères</FieldDescription>
                </Field>

                {/* Confirmation */}
                <Field>
                  <FieldLabel htmlFor="confirmPassword">Confirmer le mot de passe</FieldLabel>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Retapez votre mot de passe"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </Field>

                {/* CGU */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                    className="shrink-0"
                  />
                  <label htmlFor="terms" className="text-sm font-normal leading-normal select-none">
                    J&apos;accepte les <Link href="/terms" className="underline underline-offset-4 hover:text-primary">conditions d&apos;utilisation</Link> et la <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">politique de confidentialité</Link>
                  </label>
                </div>

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
                    disabled={isLoading || (!registrationEnabled && !inviteCode)}
                  >
                    {isLoading && <Loader2 className="size-4 animate-spin" />}
                    {isLoading ? 'Création...' : 'Créer mon compte'}
                  </Button>
                </Field>

                <FieldSeparator>Ou</FieldSeparator>

                <FieldDescription className="font-(family-name:--font-geist-sans) text-center">
                  Déjà un compte ?{' '}
                  <Link href="/login" className="underline underline-offset-4">
                    Se connecter
                  </Link>
                </FieldDescription>
              </FieldGroup>
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
          <div className="flex size-20 items-center justify-center rounded-[28px] t p-4">
            <img src="/logo/Alfychat.svg" alt="ALFYCHAT" className="size-full" />
          </div>
          <div>
            <h2 className="font-(family-name:--font-krona) text-2xl font-bold tracking-tight">ALFYCHAT</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <AnimatedGradientText colorFrom="#7c3aed" colorTo="#9E7AFF" speed={0.6}>
                La messagerie privée open source
              </AnimatedGradientText>
            </p>
          </div>
          <div className="flex flex-col gap-3 text-left">
            {[
              { icon: LockIcon, text: 'Chiffrement E2EE par design' },
              { icon: UsersIcon, text: 'Serveurs, salons & appels' },
              { icon: ZapIcon, text: 'Temps réel avec Socket.IO' },
              { icon: GlobeIcon, text: 'Hébergé en France · RGPD' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/60 px-4 py-2.5 backdrop-blur-sm">
                <item.icon size={14} className="shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent" />
      </div>
    </div>
  );
}