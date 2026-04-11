'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailIcon, LockIcon, ZapIcon, GlobeIcon } from '@/components/icons';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';

export default function ForgotPasswordPage() {
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
            {sent ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-green-500/10">
                  <CheckCircle2 className="size-7 text-green-500" />
                </div>
                <h1 className="font-(family-name:--font-krona) text-2xl font-bold">
                  Email envoyé !
                </h1>
                <p className="text-sm text-muted-foreground text-balance">
                  Si un compte existe avec l'adresse <strong className="text-foreground">{email}</strong>,
                  vous recevrez un email avec un lien de réinitialisation dans quelques minutes.
                </p>
                <p className="text-xs text-muted-foreground">
                  Le lien expire dans <strong>1 heure</strong>.
                </p>
                <Link href="/login">
                  <Button variant="outline" className="mt-2 w-full">
                    Retour à la connexion
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="font-(family-name:--font-krona) text-2xl font-bold">
                    Mot de passe oublié
                  </h1>
                  <p className="text-sm text-balance text-muted-foreground">
                    Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Adresse email</FieldLabel>
                    <div className="relative">
                      <MailIcon size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="votre@email.com"
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
                          Envoi en cours…
                        </>
                      ) : (
                        'Envoyer le lien de réinitialisation'
                      )}
                    </Button>
                  </Field>
                </FieldGroup>

                <p className="text-center text-sm text-muted-foreground">
                  Vous vous souvenez de votre mot de passe ?{' '}
                  <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
                    Se connecter
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
