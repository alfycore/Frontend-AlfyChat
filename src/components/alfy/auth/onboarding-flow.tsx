'use client';

/**
 * Onboarding — repris de la structure de la vraie page /login :
 * deux colonnes (formulaire à gauche avec logo en haut, image à droite en
 * rounded-2xl), titre en police Krona, labels uppercase, séparateur « OU ».
 * Porté sur HeroUI v3 + le design system alfy. Un seul écran, création du
 * compte + génération des clés en une action perçue (« moins de 30 s »).
 */

import { Button, FieldError, Form, Input, Label, Meter, Spinner, TextField } from '@heroui/react';
import { ArrowRight, Check, Lock, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AlfyMark } from '@/components/alfy/primitives/alfy-mark';
import { TrustBadges } from '@/components/alfy/primitives/trust-badges';

/** Force naïve du mot de passe pour la jauge (mock). */
function strength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s += 40;
  if (pw.length >= 12) s += 20;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s += 15;
  if (/\d/.test(pw)) s += 10;
  if (/[^A-Za-z0-9]/.test(pw)) s += 15;
  return Math.min(s, 100);
}

type Stage = 'form' | 'welcome';

export function OnboardingFlow() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('form');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pwScore = strength(password);
  const canSubmit = username.trim().length >= 3 && pwScore >= 40;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStage('welcome');
    }, 900);
  };

  return (
    <div className="grid h-full grid-cols-1 bg-background lg:grid-cols-2">
      {/* ── Colonne gauche : formulaire ── */}
      <div className="flex min-h-0 flex-col">
        {/* Logo en haut */}
        <div className="flex items-center gap-2.5 p-8 pb-0">
          <AlfyMark className="size-7" />
          <span className="font-heading text-sm font-medium tracking-wide">ALFYCHAT</span>
        </div>

        {/* Formulaire centré verticalement */}
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-8 py-12">
          <div className="w-full max-w-xs">
            {stage === 'form' ? (
              <div key="form" className="alfy-enter flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                  <h1 className="font-heading text-2xl font-bold">Créer un compte</h1>
                  <p className="text-[13px] text-muted">
                    Moins de 30 secondes. Aucun numéro de téléphone.
                  </p>
                </div>

                <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                  <TextField name="username" value={username} onChange={setUsername} isRequired>
                    <Label className="text-[11px] font-medium tracking-wider text-muted uppercase">
                      Nom d&apos;utilisateur
                    </Label>
                    <Input placeholder="renarde_du_38" autoComplete="username" />
                    <FieldError />
                  </TextField>

                  <TextField
                    name="password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    isRequired
                  >
                    <Label className="text-[11px] font-medium tracking-wider text-muted uppercase">
                      Mot de passe
                    </Label>
                    <Input placeholder="12 caractères ou plus" autoComplete="new-password" />
                    <FieldError />
                  </TextField>

                  {password.length > 0 && (
                    <Meter aria-label="Robustesse du mot de passe" value={pwScore}>
                      <Label className="text-xs">Robustesse</Label>
                      <span className="text-xs text-muted">
                        {pwScore >= 80 ? 'Excellente' : pwScore >= 40 ? 'Correcte' : 'Trop faible'}
                      </span>
                      <Meter.Track>
                        <Meter.Fill />
                      </Meter.Track>
                    </Meter>
                  )}

                  <Button type="submit" size="lg" className="w-full gap-2" isDisabled={!canSubmit || submitting}>
                    {submitting ? <Spinner size="sm" color="current" /> : null}
                    {submitting ? 'Création en cours…' : 'Créer mon compte'}
                    {!submitting && <ArrowRight className="size-4" />}
                  </Button>

                  <p className="flex items-center gap-1.5 text-[11px] text-muted">
                    <Lock className="size-3 text-(--alfy-e2e)" aria-hidden />
                    Vos clés de chiffrement restent sur votre appareil.
                  </p>
                </Form>

                {/* Séparateur + lien connexion */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-separator" />
                    <span className="text-[10px] tracking-wider text-muted uppercase">ou</span>
                    <div className="h-px flex-1 bg-separator" />
                  </div>
                  <p className="text-[13px] text-muted">
                    Déjà un compte ?{' '}
                    <button
                      type="button"
                      onClick={() => router.push('/login')}
                      className="cursor-pointer font-medium text-accent underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      Se connecter
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              <div key="welcome" className="alfy-enter flex flex-col gap-6">
                <div className="flex flex-col items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-(--alfy-e2e-soft) text-(--alfy-e2e)">
                    <ShieldCheck className="size-5" aria-hidden />
                  </div>
                  <div>
                    <h1 className="font-heading text-xl font-bold">Bienvenue, {username}</h1>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                      Vos clés Signal ont été générées sur cet appareil. Vos messages sont chiffrés
                      de bout en bout — même nous ne pouvons pas les lire.
                    </p>
                  </div>
                </div>
                <Button size="lg" className="w-full gap-2">
                  <Check className="size-4" />
                  Entrer sur AlfyChat
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Colonne droite : image ── */}
      <div className="hidden p-4 lg:block">
        <div className="relative h-full overflow-hidden rounded-2xl">
          <img
            src="/backgrounds/defaut.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8">
            <h2 className="max-w-sm font-heading text-2xl font-bold text-balance text-white">
              Vos messages ne regardent que vous.
            </h2>
            <p className="mt-2 max-w-sm text-sm text-white/70">
              Chiffrement de bout en bout par défaut, serveurs auto-hébergeables, aucune donnée
              revendue.
            </p>
            <TrustBadges className="mt-4" compact />
          </div>
        </div>
      </div>
    </div>
  );
}
