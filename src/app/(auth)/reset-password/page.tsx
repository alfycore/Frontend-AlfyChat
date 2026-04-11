'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LockIcon, ZapIcon, GlobeIcon, EyeIcon, EyeOffIcon } from '@/components/icons';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';

function ResetPasswordForm() {
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
      setError('Lien invalide. Veuillez demander un nouveau lien de réinitialisation.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 8) {
      setError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
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
        setError((result as any).error || 'Lien invalide ou expiré. Veuillez redemander un lien.');
      }
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
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
          <div className="w-full max-w-xs">
            {success ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-green-500/10">
                  <CheckCircle2 className="size-7 text-green-500" />
                </div>
                <h1 className="font-(family-name:--font-krona) text-2xl font-bold">
                  Mot de passe mis à jour !
                </h1>
                <p className="text-sm text-muted-foreground text-balance">
                  Votre mot de passe a été réinitialisé avec succès. Vous allez être redirigé vers la page de connexion…
                </p>
                <Link href="/login">
                  <Button className="mt-2 w-full">
                    Se connecter maintenant
                  </Button>
                </Link>
              </div>
            ) : !token ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="size-7 text-destructive" />
                </div>
                <h1 className="font-(family-name:--font-krona) text-2xl font-bold">
                  Lien invalide
                </h1>
                <p className="text-sm text-muted-foreground text-balance">
                  Ce lien de réinitialisation est invalide ou a expiré.
                </p>
                <Link href="/forgot-password">
                  <Button variant="outline" className="mt-2 w-full">
                    Demander un nouveau lien
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="font-(family-name:--font-krona) text-2xl font-bold">
                    Nouveau mot de passe
                  </h1>
                  <p className="text-sm text-balance text-muted-foreground">
                    Choisissez un nouveau mot de passe sécurisé pour votre compte.
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="password">Nouveau mot de passe</FieldLabel>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Au moins 8 caractères"
                        required
                        autoFocus
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

                  <Field>
                    <FieldLabel htmlFor="confirm-password">Confirmer le mot de passe</FieldLabel>
                    <Input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Répétez le mot de passe"
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
                          Mise à jour…
                        </>
                      ) : (
                        'Réinitialiser le mot de passe'
                      )}
                    </Button>
                  </Field>
                </FieldGroup>

                <p className="text-center text-sm text-muted-foreground">
                  <Link href="/forgot-password" className="underline underline-offset-4 hover:text-foreground">
                    Demander un nouveau lien
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
