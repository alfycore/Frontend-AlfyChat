'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { hostingApi } from '@/lib/hosting-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';

const COUNTRIES = [
  { code: 'FR', label: 'France' }, { code: 'DE', label: 'Allemagne' },
  { code: 'GB', label: 'Royaume-Uni' }, { code: 'NL', label: 'Pays-Bas' },
  { code: 'BE', label: 'Belgique' }, { code: 'CH', label: 'Suisse' },
  { code: 'LU', label: 'Luxembourg' }, { code: 'IT', label: 'Italie' },
  { code: 'ES', label: 'Espagne' }, { code: 'PT', label: 'Portugal' },
  { code: 'PL', label: 'Pologne' }, { code: 'SE', label: 'Suede' },
  { code: 'FI', label: 'Finlande' }, { code: 'DK', label: 'Danemark' },
  { code: 'NO', label: 'Norvege' }, { code: 'AT', label: 'Autriche' },
  { code: 'CZ', label: 'Republique tcheque' }, { code: 'RO', label: 'Roumanie' },
  { code: 'US', label: 'Etats-Unis' }, { code: 'CA', label: 'Canada' },
  { code: 'SG', label: 'Singapour' }, { code: 'AU', label: 'Australie' },
  { code: 'JP', label: 'Japon' }, { code: 'BR', label: 'Bresil' },
];

const LEGAL_FORMS = [
  { value: 'sas', label: 'SAS / SASU' },
  { value: 'sarl', label: 'SARL / EURL' },
  { value: 'sa', label: 'SA' },
  { value: 'ei', label: 'Entreprise individuelle' },
  { value: 'ae', label: 'Auto-entrepreneur / Micro-entreprise' },
  { value: 'association', label: 'Association loi 1901' },
  { value: 'other', label: 'Autre' },
];

const REGIONS = [
  { code: 'EU-W', label: 'Europe Ouest' }, { code: 'EU-E', label: 'Europe Est' },
  { code: 'EU-N', label: 'Europe Nord' }, { code: 'US-E', label: 'USA Est' },
  { code: 'US-W', label: 'USA Ouest' }, { code: 'ASIA-SE', label: 'Asie du Sud-Est' },
  { code: 'ASIA-E', label: 'Asie de l\'Est' }, { code: 'OCEANIA', label: 'Oceanie' },
  { code: 'LATAM', label: 'Amerique Latine' }, { code: 'AFRICA', label: 'Afrique' },
];

const CERTIFICATIONS = ['ISO 27001', 'SOC 2', 'PCI-DSS', 'HDS', 'SecNumCloud', 'ISO 9001'];

const PARTNER_BENEFITS = [
  { icon: 'bi-award-fill', color: 'indigo', title: 'Badge Hebergeur Partenaire Officiel', desc: 'Logo AlfyChat sur votre site + certification visible par tous les serveurs.' },
  { icon: 'bi-shop', color: 'violet', title: 'Acces au marketplace AlfyChat', desc: 'Vos offres listees devant +500 000 serveurs actifs a la recherche d\'hebergement.' },
  { icon: 'bi-headset', color: 'blue', title: 'Support technique prioritaire 24/7', desc: 'Canal Slack dedie avec l\'equipe d\'ingenierie AlfyChat pour un SLA rapide.' },
  { icon: 'bi-cash-coin', color: 'emerald', title: 'Commission reduite a 5%', desc: 'Taux preferentiel vs 15% standard pour les hebergeurs non-certifies.' },
  { icon: 'bi-bar-chart-fill', color: 'cyan', title: 'Tableau de bord analytique avance', desc: 'Metriques temps reel, alertes SLA automatiques, rapports PDF mensuels.' },
  { icon: 'bi-megaphone-fill', color: 'pink', title: 'Mise en avant newsletter & reseaux', desc: 'Presentation a 200 000+ abonnes lors de votre lancement officiel.' },
  { icon: 'bi-rocket-takeoff-fill', color: 'orange', title: 'Acces beta aux nouvelles API', desc: 'Testez les prochaines fonctionnalites 3 mois avant leur sortie publique.' },
  { icon: 'bi-shield-fill-check', color: 'teal', title: 'SLA contractuel garanti 99.9%', desc: 'Contrat de niveau de service avec penalites contractuelles en votre faveur.' },
  { icon: 'bi-globe', color: 'purple', title: 'Integration CDN AlfyChat mondial', desc: 'Vos noeuds integres dans le reseau CDN distribue pour des latences optimales.' },
  { icon: 'bi-star-fill', color: 'yellow', title: 'Programme de fidelite & recompenses', desc: 'Bonus progressifs selon le volume (1k a 1M+ serveurs heberges).' },
];

type StepId = 'base' | 'legal' | 'infra' | 'success';

interface CompanyInfo {
  nom: string;
  adresse: string;
  etat: string;
  siren: string;
  forme_juridique?: string;
}

const colorMap: Record<string, string> = {
  indigo: 'bg-indigo-600/20 text-indigo-400',
  violet: 'bg-violet-600/20 text-violet-400',
  blue: 'bg-blue-600/20 text-blue-400',
  emerald: 'bg-emerald-600/20 text-emerald-400',
  cyan: 'bg-cyan-600/20 text-cyan-400',
  pink: 'bg-pink-600/20 text-pink-400',
  orange: 'bg-orange-600/20 text-orange-400',
  teal: 'bg-teal-600/20 text-teal-400',
  purple: 'bg-purple-600/20 text-purple-400',
  yellow: 'bg-yellow-600/20 text-yellow-400',
};

export default function HosterRegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepId>('base');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');

  const [base, setBase] = useState({
    name: '', email: '', slug: '', description: '', website_url: '', country_code: 'FR',
  });

  const [legal, setLegal] = useState({
    legal_form: 'sas', siret: '', legal_name: '', vat_number: '', legal_address: '',
  });
  const [siretLoading, setSiretLoading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [siretError, setSiretError] = useState('');

  const [infra, setInfra] = useState({
    datacenter_count: '1', bandwidth_gbps: '', as_number: '',
    regions: [] as string[], certifications: [] as string[], accept_terms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }

  async function verifySiret() {
    const siret = legal.siret.replace(/\s/g, '');
    if (!siret || !/^\d{9,14}$/.test(siret)) {
      setSiretError('Numero SIRET/SIREN invalide (9 a 14 chiffres)');
      return;
    }
    setSiretLoading(true);
    setSiretError('');
    setCompanyInfo(null);
    try {
      const res = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siret)}&page=1&per_page=1`,
      );
      if (!res.ok) throw new Error('API indisponible');
      const data = await res.json();
      const r = data?.results?.[0];
      if (!r) { setSiretError('Aucune entreprise trouvee pour ce numero.'); return; }
      const info: CompanyInfo = {
        nom: r.nom_complet || r.nom_raison_sociale || '',
        adresse: r.siege?.adresse || `${r.siege?.code_postal || ''} ${r.siege?.libelle_commune || ''}`.trim(),
        etat: r.etat_administratif || 'A',
        siren: r.siren || '',
        forme_juridique: r.nature_juridique,
      };
      setCompanyInfo(info);
      setLegal(f => ({
        ...f,
        legal_name: f.legal_name || info.nom,
        legal_address: f.legal_address || info.adresse,
      }));
    } catch {
      setSiretError('Erreur de verification. Verifiez votre connexion.');
    } finally {
      setSiretLoading(false);
    }
  }

  function validateBase() {
    const e: Record<string, string> = {};
    if (!base.name || base.name.length < 2) e.name = 'Nom requis (min. 2 caracteres)';
    if (!base.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(base.email)) e.email = 'Email invalide';
    if (!base.slug || !/^[a-z0-9-]{2,60}$/.test(base.slug)) e.slug = 'Slug invalide (a-z, 0-9, tirets)';
    if (base.website_url && !/^https?:\/\//.test(base.website_url)) e.website_url = 'URL invalide (http:// ou https://)';
    return e;
  }

  function validateLegal() {
    const e: Record<string, string> = {};
    if (!legal.legal_name || legal.legal_name.length < 2) e.legal_name = 'Raison sociale requise';
    if (legal.vat_number && !/^[A-Z]{2}[0-9A-Z]{2,13}$/.test(legal.vat_number.replace(/\s/g, ''))) {
      e.vat_number = 'Format TVA invalide (ex: FR12345678901)';
    }
    return e;
  }

  function validateInfra() {
    const e: Record<string, string> = {};
    if (infra.regions.length === 0) e.regions = 'Selectionnez au moins une region';
    if (!infra.accept_terms) e.accept_terms = 'Vous devez accepter les conditions';
    return e;
  }

  function handleNextBase() {
    const e = validateBase();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setCurrentStep('legal');
  }

  function handleNextLegal() {
    const e = validateLegal();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setCurrentStep('infra');
  }

  async function handleSubmit() {
    const e = validateInfra();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await hostingApi.registerProvider({
        name: base.name,
        email: base.email,
        slug: base.slug,
        description: base.description || undefined,
        website_url: base.website_url || undefined,
        country_code: base.country_code,
      } as any);
      const data = (res as any)?.data ?? res;
      if (data?.token) {
        setToken(data.token);
        setCurrentStep('success');
      } else {
        toast.error((res as any)?.error || data?.error || 'Erreur lors de l\'inscription');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erreur serveur');
    } finally {
      setLoading(false);
    }
  }

  const STEPS = [
    { id: 'base', label: 'Informations de base', icon: 'bi-building' },
    { id: 'legal', label: 'Structure legale', icon: 'bi-bank' },
    { id: 'infra', label: 'Infrastructure', icon: 'bi-hdd-network' },
  ] as const;

  const stepIndex = currentStep === 'success' ? 3 : STEPS.findIndex(s => s.id === currentStep);

  if (currentStep === 'success') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] p-4">
        <Card className="max-w-lg w-full bg-white/5 border-white/10">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
                <i className="bi bi-check-circle-fill text-emerald-400 text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Candidature soumise !</h2>
                <p className="text-sm text-muted-foreground">En attente de validation par l'equipe AlfyChat</p>
              </div>
            </div>
            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4">
              <p className="text-sm font-medium text-yellow-300 mb-2">
                <i className="bi bi-key-fill mr-2" />Token d'hebergeur  a sauvegarder maintenant
              </p>
              <code className="block bg-black/40 rounded-lg p-3 text-xs font-mono break-all select-all">{token}</code>
              <p className="text-xs text-muted-foreground mt-2">
                Ajoutez <code className="bg-white/10 px-1 rounded">HOSTING_PROVIDER_TOKEN=...</code> dans le <code className="bg-white/10 px-1 rounded">.env</code> de vos pods.
              </p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <h3 className="font-medium text-foreground">Prochaines etapes</h3>
              {["Validation par l'equipe AlfyChat (24-48h)", "Connectez-vous au panel hebergeur", "Ajoutez vos noeuds de stockage (DB + Media)", "Publiez vos offres pour les serveurs"].map((t, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(token); toast.success('Token copie !'); }}>
                <i className="bi bi-clipboard mr-2" /> Copier
              </Button>
              <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push('/channels/hosting/panel')}>
                Acceder au panel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/channels/hosting" className="hover:text-foreground transition-colors">Hebergement</Link>
          <i className="bi bi-chevron-right text-xs" />
          <span className="text-foreground">Devenir hebergeur</span>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-600/30 mb-4">
            <i className="bi bi-server text-indigo-400 text-2xl" />
          </div>
          <h1 className="text-3xl font-bold">Devenir hebergeur partenaire</h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
            Rejoignez le reseau d'hebergeurs certifies AlfyChat et proposez vos capacites de stockage.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                i < stepIndex ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                  : i === stepIndex ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40'
                  : 'bg-white/5 text-muted-foreground border border-white/10'
              }`}>
                {i < stepIndex
                  ? <i className="bi bi-check-circle-fill text-xs" />
                  : <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px]">{i + 1}</span>
                }
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < stepIndex ? 'bg-emerald-600/40' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/*  STEP 1: BASE  */}
        {currentStep === 'base' && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6 space-y-4">
              <SectionTitle icon="bi-building" title="Informations de base" desc="Renseignez les informations publiques de votre hebergeur" />

              <Field label="Nom de votre hebergeur *" error={errors.name}>
                <Input value={base.name} onChange={e => { const name = e.target.value; setBase(f => ({ ...f, name, slug: autoSlug(name) })); }} placeholder="MonHebergeur Pro" autoComplete="organization" />
              </Field>

              <Field label="Email de contact *" error={errors.email}>
                <Input type="email" value={base.email} onChange={e => setBase(f => ({ ...f, email: e.target.value }))} placeholder="contact@monhebergeur.fr" autoComplete="email" />
              </Field>

              <Field label="Identifiant unique (slug) *" error={errors.slug}>
                <div className="flex items-center">
                  <span className="px-3 bg-white/5 border border-r-0 border-input rounded-l-md text-muted-foreground text-sm h-9 flex items-center">hosting/</span>
                  <Input value={base.slug} onChange={e => setBase(f => ({ ...f, slug: autoSlug(e.target.value) }))} className="rounded-l-none" placeholder="mon-hebergeur" />
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Site web" error={errors.website_url}>
                  <Input value={base.website_url} onChange={e => setBase(f => ({ ...f, website_url: e.target.value }))} placeholder="https://monhebergeur.fr" type="url" />
                </Field>
                <Field label="Pays principal">
                  <select value={base.country_code} onChange={e => setBase(f => ({ ...f, country_code: e.target.value }))} className="w-full h-9 px-3 rounded-md bg-background border border-input text-sm">
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Description publique">
                <textarea value={base.description} onChange={e => setBase(f => ({ ...f, description: e.target.value }))} className="w-full rounded-md bg-background border border-input px-3 py-2 text-sm min-h-20 resize-none" placeholder="Decrivez votre infrastructure, regions, specialites, SLA..." />
              </Field>

              <Button onClick={handleNextBase} className="w-full bg-indigo-600 hover:bg-indigo-700">
                Continuer <i className="bi bi-arrow-right ml-2" />
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Deja inscrit ?{' '}
                <Link href="/channels/hosting/panel" className="text-indigo-400 hover:underline">Acceder au panel</Link>
              </p>
            </CardContent>
          </Card>
        )}

        {/*  STEP 2: LEGAL  */}
        {currentStep === 'legal' && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6 space-y-4">
              <SectionTitle icon="bi-bank" title="Structure legale" desc="Verification d'identite legale  ces informations ne sont pas publiques." />

              <Field label="Forme juridique">
                <select value={legal.legal_form} onChange={e => setLegal(f => ({ ...f, legal_form: e.target.value }))} className="w-full h-9 px-3 rounded-md bg-background border border-input text-sm">
                  {LEGAL_FORMS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </Field>

              {base.country_code === 'FR' ? (
                <div className="space-y-3">
                  <Field label="Numero SIRET ou SIREN (France)" error={siretError}>
                    <div className="flex gap-2">
                      <Input value={legal.siret} onChange={e => { setLegal(f => ({ ...f, siret: e.target.value.replace(/[^\d\s]/g, '') })); setSiretError(''); setCompanyInfo(null); }} placeholder="123 456 789 00010" className="flex-1" maxLength={17} />
                      <Button type="button" variant="outline" onClick={verifySiret} disabled={siretLoading} className="shrink-0">
                        {siretLoading ? <i className="bi bi-arrow-repeat animate-spin" /> : <><i className="bi bi-search mr-1.5" />Verifier INSEE</>}
                      </Button>
                    </div>
                  </Field>

                  {companyInfo && (
                    <div className={`rounded-xl p-4 border text-sm space-y-2 ${companyInfo.etat === 'A' ? 'bg-emerald-600/10 border-emerald-600/30' : 'bg-red-600/10 border-red-600/30'}`}>
                      <div className="flex items-center gap-2 font-medium">
                        <i className={`bi ${companyInfo.etat === 'A' ? 'bi-check-circle-fill text-emerald-400' : 'bi-x-circle-fill text-red-400'}`} />
                        <span>{companyInfo.etat === 'A' ? 'Entreprise active' : 'Entreprise cessee / radiee'}</span>
                      </div>
                      <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-xs">
                        <span className="font-medium text-muted-foreground">Raison sociale</span><span>{companyInfo.nom}</span>
                        <span className="font-medium text-muted-foreground">SIREN</span><span className="font-mono">{companyInfo.siren}</span>
                        <span className="font-medium text-muted-foreground">Siege</span><span>{companyInfo.adresse}</span>
                      </div>
                      <p className="text-xs text-muted-foreground/60">Source : base SIRENE / data.gouv.fr</p>
                    </div>
                  )}
                </div>
              ) : (
                <Field label="Numero d'immatriculation legale">
                  <Input value={legal.siret} onChange={e => setLegal(f => ({ ...f, siret: e.target.value }))} placeholder="Numero d'enregistrement dans votre pays" />
                </Field>
              )}

              <Field label="Raison sociale legale *" error={errors.legal_name}>
                <Input value={legal.legal_name} onChange={e => setLegal(f => ({ ...f, legal_name: e.target.value }))} placeholder="Denomination legale complete" />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="N° TVA intracommunautaire" error={errors.vat_number}>
                  <Input value={legal.vat_number} onChange={e => setLegal(f => ({ ...f, vat_number: e.target.value.toUpperCase() }))} placeholder="FR12345678901" maxLength={16} />
                </Field>
                <Field label="Adresse du siege social">
                  <Input value={legal.legal_address} onChange={e => setLegal(f => ({ ...f, legal_address: e.target.value }))} placeholder="1 rue de la Paix, 75001 Paris" />
                </Field>
              </div>

              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-300 flex items-start gap-2">
                <i className="bi bi-shield-lock shrink-0 mt-0.5" />
                Ces informations sont utilisees uniquement pour la verification d'identite legale et ne sont jamais affichees publiquement.
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCurrentStep('base')} className="flex-1">
                  <i className="bi bi-arrow-left mr-2" />Retour
                </Button>
                <Button onClick={handleNextLegal} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                  Continuer <i className="bi bi-arrow-right ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/*  STEP 3: INFRA & AVANTAGES  */}
        {currentStep === 'infra' && (
          <div className="space-y-6">
            {/* Top 10 avantages */}
            <Card className="bg-linear-to-br from-indigo-950/70 to-purple-950/50 border-indigo-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <i className="bi bi-trophy-fill text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Les 10 avantages du partenariat officiel</h3>
                    <p className="text-xs text-muted-foreground">Reserves exclusivement aux hebergeurs certifies AlfyChat</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PARTNER_BENEFITS.map((b, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorMap[b.color]}`}>
                        <i className={`bi ${b.icon} text-sm`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-snug">{b.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Infrastructure annexes */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6 space-y-5">
                <SectionTitle icon="bi-hdd-network" title="Informations annexes d'infrastructure" desc="Aidez-nous a mieux vous referencer dans le reseau AlfyChat." />

                <div className="grid grid-cols-3 gap-4">
                  <Field label="Nb. datacenters">
                    <Input type="number" min="1" max="999" value={infra.datacenter_count} onChange={e => setInfra(f => ({ ...f, datacenter_count: e.target.value }))} placeholder="1" />
                  </Field>
                  <Field label="Bande passante (Gbit/s)">
                    <Input type="number" min="0.1" step="0.1" value={infra.bandwidth_gbps} onChange={e => setInfra(f => ({ ...f, bandwidth_gbps: e.target.value }))} placeholder="10" />
                  </Field>
                  <Field label="Numero AS (BGP)">
                    <Input value={infra.as_number} onChange={e => setInfra(f => ({ ...f, as_number: e.target.value }))} placeholder="AS12345" />
                  </Field>
                </div>

                <Field label="Regions couvertes *" error={errors.regions}>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {REGIONS.map(r => (
                      <button key={r.code} type="button" onClick={() => setInfra(f => ({ ...f, regions: f.regions.includes(r.code) ? f.regions.filter(x => x !== r.code) : [...f.regions, r.code] }))}
                        className={`px-3 py-1 rounded-full text-xs border transition-all ${infra.regions.includes(r.code) ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/25'}`}>
                        {infra.regions.includes(r.code) && <i className="bi bi-check mr-1 text-[10px]" />}
                        {r.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Certifications obtenues">
                  <div className="flex flex-wrap gap-2 mt-1">
                    {CERTIFICATIONS.map(cert => (
                      <button key={cert} type="button" onClick={() => setInfra(f => ({ ...f, certifications: f.certifications.includes(cert) ? f.certifications.filter(c => c !== cert) : [...f.certifications, cert] }))}
                        className={`px-3 py-1 rounded-full text-xs border transition-all ${infra.certifications.includes(cert) ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/25'}`}>
                        {infra.certifications.includes(cert) && <i className="bi bi-check mr-1 text-[10px]" />}
                        {cert}
                      </button>
                    ))}
                  </div>
                </Field>

                <div className={`rounded-xl p-4 border ${errors.accept_terms ? 'border-red-500/40 bg-red-500/5' : 'border-white/10 bg-white/2'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={infra.accept_terms} onChange={e => setInfra(f => ({ ...f, accept_terms: e.target.checked }))} className="mt-0.5 rounded" />
                    <span className="text-sm leading-relaxed">
                      J'accepte les{' '}
                      <a href="/legal/partner-terms" target="_blank" className="text-indigo-400 hover:underline">Conditions Generales du Programme Partenaire Hebergeur AlfyChat</a>
                      {' '}et je certifie que les informations fournies sont exactes et verifiables.
                    </span>
                  </label>
                  {errors.accept_terms && <p className="text-xs text-red-400 mt-2">{errors.accept_terms}</p>}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep('legal')} className="flex-1">
                    <i className="bi bi-arrow-left mr-2" />Retour
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                    {loading ? <><i className="bi bi-arrow-repeat animate-spin mr-2" />Envoi...</> : <><i className="bi bi-send mr-2" />Soumettre ma candidature</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 pb-3 border-b border-white/10">
      <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center shrink-0 mt-0.5">
        <i className={`bi ${icon} text-indigo-400 text-sm`} />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}