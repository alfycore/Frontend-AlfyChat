'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { subscriptionsApi, hostingApi, HostingOffer, SubscriptionPlan } from '@/lib/hosting-api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
import { useTranslation } from '@/components/locale-provider';

const PROVIDERS_DATA = [
  { id: 'stripe',  icon: 'credit-card' },
  { id: 'paypal',  icon: 'paypal' },
  { id: 'mollie',  icon: 'wallet2' },
  { id: 'tebex',   icon: 'bag-check' },
] as const;

type Provider = typeof PROVIDERS_DATA[number]['id'];

const BILLING_IDS = ['monthly', 'quarterly', 'yearly'] as const;
type BillingId = typeof BILLING_IDS[number];

function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const offerId = params.get('offer');
  const planId = params.get('plan');
  const serverId = params.get('server_id');
  const targetType = (params.get('target') as 'user' | 'server') || 'server';
  const { t } = useTranslation();
  const h = t.hosting;

  const [offer, setOffer] = useState<HostingOffer | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [billing, setBilling] = useState<BillingId>('monthly');
  const [provider, setProvider] = useState<Provider>('stripe');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    loadData();
  }, [offerId, planId]);

  async function loadData() {
    setLoading(true);
    try {
      if (planId) {
        const res: any = await subscriptionsApi.listPlans(targetType);
        const plans: SubscriptionPlan[] = res?.data ?? res ?? [];
        const found = plans.find((p: SubscriptionPlan) => p.id === planId);
        if (found) setPlan(found);
      } else if (offerId) {
        // L'offre vient du marketplace - on charge toutes les offres et on filtre
        const res: any = await hostingApi.listOffers();
        const offers: HostingOffer[] = res?.data ?? (Array.isArray(res) ? res : []);
        const found = offers.find((o: HostingOffer) => o.id === offerId || o.slug === offerId);
        if (found) setOffer(found);
      }
    } catch {
      toast.error(h.offerNotFound);
    } finally {
      setLoading(false);
    }
  }

  function getPrice() {
    if (plan) {
      if (billing === 'yearly' && plan.price_yearly) return plan.price_yearly;
      if (billing === 'quarterly' && plan.price_quarterly) return plan.price_quarterly;
      return plan.price_monthly ?? 0;
    }
    if (offer) {
      if (billing === 'yearly' && offer.price_yearly) return offer.price_yearly;
      return offer.price_monthly ?? 0;
    }
    return 0;
  }

  function getCurrency() {
    return plan?.currency || offer?.currency || 'EUR';
  }

  async function handleCheckout() {
    if (!plan && !offer) return;
    if (targetType === 'server' && !serverId) {
      toast.error(h.missingServerId);
      return;
    }
    setPaying(true);
    try {
      const body = {
        plan_id: plan?.id ?? offer?.id ?? '',
        target_type: targetType,
        target_id: serverId ?? 'me',
        billing_cycle: billing,
      };
      const res: any = await subscriptionsApi.checkout(provider, body);
      const data = res?.data ?? res;
      const url: string = data?.checkout_url || data?.url || data?.redirect_url;
      if (url) {
        window.location.href = url;
      } else {
        toast.error(h.paymentUrlError);
      }
    } catch (err: any) {
      toast.error(err?.message || h.paymentError);
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!plan && !offer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center p-4">
        <div>
          <i className="bi bi-exclamation-circle text-5xl text-muted-foreground block mb-4" />
          <h2 className="text-xl font-bold mb-2">{h.offerNotFound}</h2>
          <p className="text-muted-foreground text-sm mb-4">{h.offerNotFoundDesc}</p>
          <Link href="/hosting">
            <Button variant="outline">{h.filterAll !== 'All' ? h.filterAll : 'Voir les offres'}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const price = getPrice();
  const currency = getCurrency();
  const name = plan?.name ?? offer?.name ?? '';
  const tier = (plan as any)?.tier ?? offer?.tier ?? '';
  const features: string[] = plan?.features ?? offer?.features ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Titre */}
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-1">{h.checkoutTitle}</h1>
          <p className="text-muted-foreground text-sm">{h.checkoutSub}</p>
        </div>

        {/* Résumé offre */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4 flex items-start justify-between gap-4">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{tier}</span>
              <h2 className="text-xl font-bold">{name}</h2>
              {features.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {features.slice(0, 5).map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <i className="bi bi-check-circle-fill text-emerald-400 text-xs" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl font-bold">{price.toFixed(2)} {currency}</div>
              <div className="text-xs text-muted-foreground">{
                billing === 'monthly' ? h.perMonth : billing === 'quarterly' ? h.per3Months : h.perYear
              }</div>
            </div>
          </CardContent>
        </Card>

        {/* Cycle de facturation */}
        <div>
          <Label className="text-sm font-medium block mb-2">{h.billingCycle}</Label>
          <div className="grid grid-cols-3 gap-2">
            {BILLING_IDS.map(bid => {
              const badge = bid === 'quarterly' ? '-10%' : bid === 'yearly' ? '-20%' : undefined;
              const label = bid === 'monthly' ? h.billingMonthly : bid === 'quarterly' ? h.billingQuarterly : h.billingYearly;
              const hasOption = bid === 'monthly' ||
                (bid === 'quarterly' && plan?.price_quarterly) ||
                (bid === 'yearly' && (plan?.price_yearly || offer?.price_yearly));
              if (!hasOption) return null;
              return (
                <button
                  key={bid}
                  onClick={() => setBilling(bid)}
                  className={`relative rounded-xl border p-3 text-left transition-colors ${
                    billing === bid
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {badge && (
                    <span className="absolute -top-2 -right-1 text-xs bg-emerald-600 text-white px-1.5 rounded-full">
                      {badge}
                    </span>
                  )}
                  <p className="text-sm font-medium">{label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Moyen de paiement */}
        <div>
          <Label className="text-sm font-medium block mb-2">{h.paymentMethod}</Label>
          <div className="space-y-2">
            {PROVIDERS_DATA.map(p => {
              const label = p.id === 'stripe' ? h.providerCard : p.id === 'paypal' ? h.providerPayPal : p.id === 'mollie' ? h.providerMollie : h.providerTebex;
              const sub = p.id === 'stripe' ? h.providerCardSub : p.id === 'paypal' ? h.providerPayPalSub : p.id === 'mollie' ? h.providerMollieSub : h.providerTebexSub;
              return (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
                    provider === p.id
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <i className={`bi bi-${p.icon} text-2xl`} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    provider === p.id ? 'border-indigo-500' : 'border-white/30'
                  }`}>
                    {provider === p.id && <div className="w-2 h-2 bg-indigo-500 rounded-full" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Récap + CTA */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{h.subtotal}</span>
            <span>{price.toFixed(2)} {currency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{h.alfychatFee}</span>
            <span className="text-emerald-400">0,00 {currency}</span>
          </div>
          <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
            <span>{h.total}</span>
            <span>{price.toFixed(2)} {currency}</span>
          </div>
        </div>

        <Button
          onClick={handleCheckout}
          disabled={paying}
          className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-700"
        >
          {paying ? (
            <><i className="bi bi-arrow-repeat animate-spin mr-2" />{h.redirecting}</>
          ) : (
            <><i className="bi bi-lock-fill mr-2" />{h.pay.replace('{amount}', price.toFixed(2)).replace('{currency}', currency)}</>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">{h.checkoutDisclaimer}</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin text-2xl text-muted-foreground"><i className="bi bi-arrow-repeat" /></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
