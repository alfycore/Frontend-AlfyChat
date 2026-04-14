'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function SuccessContent() {
  const params = useSearchParams();
  const plan = params.get('plan');
  const provider = params.get('provider');
  const serverId = params.get('server_id');

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icône succès */}
        <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-4 border-emerald-500/40 flex items-center justify-center mx-auto">
          <i className="bi bi-check-lg text-5xl text-emerald-400" />
        </div>

        <div>
          <h1 className="text-2xl font-bold">Paiement confirmé !</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Votre abonnement a été activé avec succès.
            {provider && <> Traité via <span className="text-foreground capitalize">{provider}</span>.</>}
          </p>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-left space-y-2">
          <p className="text-sm font-medium">Prochaines étapes :</p>
          <ul className="space-y-1">
            {[
              "Votre serveur bénéficie des nouvelles limites immédiatement",
              "Vous recevrez un email de confirmation",
              "Gérez votre abonnement depuis les paramètres du serveur",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <i className="bi bi-arrow-right-circle-fill text-indigo-400 mt-0.5 shrink-0" />
                {step}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {serverId ? (
            <Link href={`/servers/${serverId}`} className="flex-1">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                <i className="bi bi-arrow-left-circle mr-2" />Retour au serveur
              </Button>
            </Link>
          ) : (
            <Link href="/hosting/subscriptions" className="flex-1">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                <i className="bi bi-journals mr-2" />Mes abonnements
              </Button>
            </Link>
          )}
          <Link href="/hosting" className="flex-1">
            <Button variant="outline" className="w-full">
              <i className="bi bi-grid mr-2" />Marketplace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
