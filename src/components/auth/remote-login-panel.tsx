'use client';

import { Button, Spinner } from '@heroui/react';
import { Check, QrCode, RefreshCw, ShieldCheck, Smartphone, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { pollRemoteSession, startRemoteSession, type RemoteSession } from '@/lib/remote-auth';
import { cn } from '@/lib/utils';

/** Intervalle de sondage. Un code vit 120 s, soit ~60 requêtes au plus. */
const POLL_MS = 2000;

type Etat = 'chargement' | 'attente' | 'scanne' | 'refuse' | 'expire' | 'erreur' | 'connecte';

export function RemoteLoginPanel() {
  const router = useRouter();
  const { completeRemoteLogin } = useAuth();

  const [session, setSession] = useState<RemoteSession | null>(null);
  const [etat, setEtat] = useState<Etat>('chargement');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arrete = useRef(false);

  const nouvelleSession = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    arrete.current = false;
    setEtat('chargement');
    try {
      const s = await startRemoteSession();
      setSession(s);
      setEtat('attente');
    } catch {
      setEtat('erreur');
    }
  }, []);

  useEffect(() => {
    void nouvelleSession();
    return () => {
      arrete.current = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [nouvelleSession]);

  /* Boucle de sondage — relancée à chaque nouvelle session. */
  useEffect(() => {
    if (!session || etat === 'connecte') return;

    let annule = false;

    const tick = async () => {
      if (annule || arrete.current) return;
      try {
        const res = await pollRemoteSession(session);

        if (annule || arrete.current) return;

        if (res.status === 'approved') {
          arrete.current = true;
          setEtat('connecte');
          const out = await completeRemoteLogin(res);
          if (out.success) router.replace('/channels/me');
          else setEtat('erreur');
          return;
        }

        if (res.status === 'denied') { setEtat('refuse'); return; }
        if (res.status === 'expired') { setEtat('expire'); return; }
        if (res.status === 'scanned') setEtat('scanne');

        timer.current = setTimeout(tick, POLL_MS);
      } catch {
        if (!annule) timer.current = setTimeout(tick, POLL_MS);
      }
    };

    timer.current = setTimeout(tick, POLL_MS);
    return () => {
      annule = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [session, etat, completeRemoteLogin, router]);

  const inactif = etat === 'expire' || etat === 'refuse' || etat === 'erreur';

  return (
    <section
      className="at-fade-up flex w-full flex-col items-center gap-5 rounded-3xl bg-surface p-8"
      style={{ animationDelay: '80ms' } as CSSProperties}
    >
      <div className="text-center">
        <h2 className="font-heading text-lg tracking-tight">Se connecter avec le téléphone</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Ouvrez AlfyChat sur votre mobile et scannez ce code. Aucun mot de passe à saisir.
        </p>
      </div>

      {/* ── Le code ─────────────────────────────────────────────────────── */}
      <div className="relative">
        <div
          className={cn(
            'flex size-56 items-center justify-center overflow-hidden rounded-2xl bg-white p-3 transition-all duration-300',
            inactif && 'opacity-20 blur-[3px]',
            etat === 'scanne' && 'scale-[0.97]',
          )}
        >
          {session ? (
            <img src={session.qrCodeDataUrl} alt="Code de connexion" className="size-full" />
          ) : (
            <QrCode className="size-16 text-black/20" aria-hidden />
          )}
        </div>

        {/* Voile d'état par-dessus le code */}
        {(etat === 'chargement' || etat === 'scanne' || etat === 'connecte' || inactif) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            {etat === 'chargement' && <Spinner size="lg" />}

            {etat === 'scanne' && (
              <>
                <span className="at-pop flex size-12 items-center justify-center rounded-full bg-accent text-accent-fg">
                  <Smartphone className="size-6" aria-hidden />
                </span>
                <p className="text-sm font-medium">Code scanné</p>
                <p className="max-w-40 text-xs text-muted">Confirmez sur votre téléphone.</p>
              </>
            )}

            {etat === 'connecte' && (
              <>
                {/* Seul endroit qui garde un dépassement : succès terminal,
                  * vu une fois par connexion. Le reste de l'app utilise
                  * at-pop, sans rebond. */}
                <span className="at-pop-bounce flex size-12 items-center justify-center rounded-full bg-success text-success-fg">
                  <Check className="size-6" strokeWidth={3} aria-hidden />
                </span>
                <p className="text-sm font-medium">Connexion…</p>
              </>
            )}

            {inactif && (
              <>
                <span className="flex size-12 items-center justify-center rounded-full bg-surface-2">
                  <TriangleAlert className="size-6 text-warning" aria-hidden />
                </span>
                <p className="text-sm font-medium">
                  {etat === 'refuse'
                    ? 'Connexion refusée'
                    : etat === 'erreur'
                      ? 'Une erreur est survenue'
                      : 'Code expiré'}
                </p>
                <Button size="sm" variant="secondary" onPress={() => void nouvelleSession()}>
                  <RefreshCw className="size-3.5" aria-hidden />
                  Nouveau code
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <p className="flex items-start gap-2 text-center text-xs leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
        <span>
          Vos clés de chiffrement sont transférées directement depuis votre téléphone.
          Le serveur ne peut pas les lire.
        </span>
      </p>
    </section>
  );
}
