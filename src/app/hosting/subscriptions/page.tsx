'use client';

import { useState, useEffect } from 'react';
import { subscriptionsApi, Subscription } from '@/lib/hosting-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  trialing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  past_due: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  canceled: 'bg-red-500/20 text-red-400 border-red-500/30',
  expired: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

const PROVIDER_ICON: Record<string, string> = {
  stripe: 'credit-card',
  paypal: 'paypal',
  mollie: 'wallet2',
  tebex: 'bag-check',
};

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tab, setTab] = useState<'subs' | 'history'>('subs');
  const [loading, setLoading] = useState(true);
  const [txPage, setTxPage] = useState(1);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [subsRes, txRes] = await Promise.all([
        subscriptionsApi.getMySubscriptions().catch(() => null),
        subscriptionsApi.getTransactions(1).catch(() => null),
      ]);
      const subsData = (subsRes as any)?.data ?? subsRes ?? [];
      const txData = (txRes as any)?.data ?? txRes ?? [];
      setSubs(Array.isArray(subsData) ? subsData : []);
      setTransactions(Array.isArray(txData) ? txData : []);
    } finally {
      setLoading(false);
    }
  }

  async function loadMoreTx() {
    const next = txPage + 1;
    try {
      const res: any = await subscriptionsApi.getTransactions(next);
      const data = res?.data ?? res ?? [];
      setTransactions(prev => [...prev, ...(Array.isArray(data) ? data : [])]);
      setTxPage(next);
    } catch {
      toast.error('Impossible de charger plus de transactions');
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Annuler cet abonnement ? Il restera actif jusqu\'à la fin de la période en cours.')) return;
    setCancelingId(id);
    try {
      await subscriptionsApi.cancelSubscription(id);
      toast.success('Abonnement annulé — actif jusqu\'à la fin de la période');
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur annulation');
    } finally {
      setCancelingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="font-bold text-xl">Mes abonnements</h1>
          <Link href="/hosting">
            <Button size="sm" variant="outline"><i className="bi bi-plus-lg mr-2" />Souscrire</Button>
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Onglets */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit">
          {(['subs', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
                tab === t ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'subs' ? 'Abonnements actifs' : 'Historique'}
            </button>
          ))}
        </div>

        {/* Abonnements */}
        {tab === 'subs' && (
          <div className="space-y-3">
            {subs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <i className="bi bi-journals text-5xl block mb-3 opacity-30" />
                <p className="mb-4">Aucun abonnement actif</p>
                <Link href="/hosting">
                  <Button className="bg-indigo-600 hover:bg-indigo-700">Explorer les offres</Button>
                </Link>
              </div>
            ) : (
              subs.map(sub => <SubCard key={sub.id} sub={sub} onCancel={handleCancel} cancelingId={cancelingId} />)
            )}
          </div>
        )}

        {/* Historique */}
        {tab === 'history' && (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <i className="bi bi-clock-history text-4xl block mb-2 opacity-30" />
                <p className="text-sm">Aucune transaction</p>
              </div>
            ) : (
              <>
                {transactions.map((tx, i) => (
                  <Card key={tx.id ?? i} className="bg-white/5 border-white/10">
                    <CardContent className="py-3 flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tx.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        <i className={`bi bi-${tx.status === 'completed' ? 'check' : 'x'} text-sm`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{tx.plan_name ?? tx.description ?? 'Transaction'}</p>
                        <p className="text-xs text-muted-foreground">
                          <i className={`bi bi-${PROVIDER_ICON[tx.provider] || 'credit-card'} mr-1`} />
                          {tx.provider} · {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <span className={`text-sm font-bold ${tx.status === 'completed' ? 'text-foreground' : 'text-red-400'}`}>
                        {(tx.amount / 100).toFixed(2)} {tx.currency}
                      </span>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="ghost" size="sm" onClick={loadMoreTx} className="w-full text-muted-foreground">
                  Charger plus
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SubCard({ sub, onCancel, cancelingId }: {
  sub: Subscription;
  onCancel: (id: string) => void;
  cancelingId: string | null;
}) {
  const periodEnd = new Date(sub.current_period_end);
  const daysLeft = Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / 86_400_000));

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{sub.plan_name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[sub.status] || STATUS_COLOR.expired}`}>
                {sub.status}
              </span>
              {sub.cancel_at_period_end && (
                <span className="text-xs px-2 py-0.5 rounded-full border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  Annulation programmée
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              <i className={`bi bi-${PROVIDER_ICON[sub.provider] || 'credit-card'} mr-1`} />
              {sub.provider} · {sub.billing_cycle}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold">{sub.amount.toFixed(2)} {sub.currency}</p>
            <p className="text-xs text-muted-foreground">
              {sub.billing_cycle === 'monthly' ? '/mois' : sub.billing_cycle === 'yearly' ? '/an' : '/trimestre'}
            </p>
          </div>
        </div>

        {sub.features?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sub.features.slice(0, 4).map(f => (
              <span key={f} className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{f}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-white/10 pt-2">
          <span>
            Expire le {periodEnd.toLocaleDateString('fr-FR')} · {daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''}
          </span>
          {sub.status === 'active' && !sub.cancel_at_period_end && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 h-7 px-2 text-xs"
              disabled={cancelingId === sub.id}
              onClick={() => onCancel(sub.id)}
            >
              {cancelingId === sub.id ? 'Annulation...' : 'Annuler'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
