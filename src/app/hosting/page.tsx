'use client';

import { useEffect, useState } from 'react';
import { hostingApi, HostingOffer } from '@/lib/hosting-api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useTranslation } from '@/components/locale-provider';

const TIER_COLOR: Record<string, string> = {
  free: 'bg-zinc-700 text-zinc-100',
  starter: 'bg-emerald-700 text-white',
  standard: 'bg-blue-700 text-white',
  premium: 'bg-purple-700 text-white',
  enterprise: 'bg-yellow-600 text-white',
};

const FEATURE_KEY_MAP: Record<string, keyof ReturnType<typeof useTranslation>['t']['hosting']> = {
  basic_text:        'featureText',
  basic_voice:       'featureVoice',
  custom_icon:       'featureIcon',
  animated_icon:     'featureAnimIcon',
  server_banner:     'featureBanner',
  vanity_url:        'featureUrl',
  hd_streaming:      'featureHdStream',
  '4k_streaming':    'feature4kStream',
  dedicated_storage: 'featureStorage',
  priority_support:  'featureSupport',
};

const TIER_KEY_MAP: Record<string, keyof ReturnType<typeof useTranslation>['t']['hosting']> = {
  free: 'tierFree', starter: 'tierStarter', standard: 'tierStandard',
  premium: 'tierPremium', enterprise: 'tierEnterprise',
};

export default function HostingMarketplacePage() {
  const { t } = useTranslation();
  const h = t.hosting;
  const [offers, setOffers] = useState<HostingOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');

  useEffect(() => {
    hostingApi.listOffers().then((res: any) => {
      if (Array.isArray(res)) setOffers(res);
      else if (res?.data && Array.isArray(res.data)) setOffers(res.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = offers.filter(o => {
    const matchSearch = o.name.toLowerCase().includes(search.toLowerCase()) ||
      (o.hoster_name || '').toLowerCase().includes(search.toLowerCase());
    const matchTier = filterTier === 'all' || o.tier === filterTier;
    return matchSearch && matchTier;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-950 via-background to-background border-b border-white/10 py-16 px-6 text-center">
        <Badge className="mb-4 bg-indigo-600/30 text-indigo-300 border-indigo-600/40">{h.title}</Badge>
        <h1 className="text-4xl font-bold font-heading mb-3">{h.subtitle}</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          {h.description}
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Input
            placeholder={h.searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex gap-2 flex-wrap">
            {(['all', 'free', 'starter', 'standard', 'premium', 'enterprise'] as const).map(tier => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  filterTier === tier
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                }`}
              >
                {tier === 'all' ? h.filterAll : h[TIER_KEY_MAP[tier] as keyof typeof h]}
              </button>
            ))}
          </div>
        </div>

        {/* Grille */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <i className="bi bi-box-seam text-4xl block mb-3 opacity-30" />
            {h.noResults}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(offer => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}

        {/* CTA hébergeur */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-800/40 p-8 text-center">
          <h2 className="text-xl font-bold mb-2">{h.partnerCTA}</h2>
          <p className="text-muted-foreground mb-4 text-sm">{h.partnerDesc}</p>
          <Link href="/hosting/panel/register">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <i className="bi bi-server mr-2" />
              {h.partnerBtn}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function OfferCard({ offer }: { offer: HostingOffer }) {
  const { t } = useTranslation();
  const h = t.hosting;
  const freeGb = offer.limits?.storage_mb ? (offer.limits.storage_mb / 1024).toFixed(1) : '?';
  const tierLabel = TIER_KEY_MAP[offer.tier] ? h[TIER_KEY_MAP[offer.tier] as keyof typeof h] as string : offer.tier;
  const featureLabel = (f: string) => {
    const k = FEATURE_KEY_MAP[f];
    return k ? h[k] as string : f;
  };

  return (
    <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-all hover:-translate-y-0.5 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLOR[offer.tier] || 'bg-zinc-700'}`}>
              {tierLabel}
            </span>
            <h3 className="font-semibold mt-2 text-base">{offer.name}</h3>
            {offer.hoster_name && (
              <p className="text-xs text-muted-foreground mt-0.5">{h.by.replace('{name}', offer.hoster_name)}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className="text-xl font-bold">
              {offer.price_monthly === 0 ? h.free : `${offer.price_monthly}€`}
            </span>
            {offer.price_monthly > 0 && <span className="text-xs text-muted-foreground">{h.perMonth}</span>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3">
        {/* Limites */}
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <LimitItem icon="people-fill" label={h.members.replace('{n}', String(offer.limits?.members ?? '?'))} />
          <LimitItem icon="hash" label={h.channels.replace('{n}', String(offer.limits?.channels ?? '?'))} />
          <LimitItem icon="hdd-fill" label={`${freeGb} ${h.storage}`} />
          <LimitItem icon="upload" label={`${offer.limits?.file_size_mb ?? 8} ${h.fileSize}`} />
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-1 mt-auto">
          {(offer.features || []).slice(0, 4).map(f => (
            <span key={f} className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-muted-foreground">
              {featureLabel(f)}
            </span>
          ))}
          {offer.features?.length > 4 && (
            <span className="text-xs text-muted-foreground">+{offer.features.length - 4}</span>
          )}
        </div>

        {offer.boost_enabled && (
          <p className="text-xs text-indigo-400 flex items-center gap-1">
            <i className="bi bi-lightning-fill" /> {h.boostable}
          </p>
        )}

        <Link href={`/hosting/checkout?offer=${offer.id}`} className="mt-2">
          <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700">
            {h.chooseOffer}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function LimitItem({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <i className={`bi bi-${icon}`} />
      {label}
    </span>
  );
}
