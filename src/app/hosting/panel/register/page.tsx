'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { hostingApi } from '@/lib/hosting-api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const COUNTRIES = [
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Allemagne' },
  { code: 'GB', label: 'Royaume-Uni' },
  { code: 'NL', label: 'Pays-Bas' },
  { code: 'US', label: 'États-Unis' },
  { code: 'CA', label: 'Canada' },
  { code: 'BE', label: 'Belgique' },
  { code: 'CH', label: 'Suisse' },
  { code: 'PL', label: 'Pologne' },
  { code: 'SE', label: 'Suède' },
];

export default function HosterRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [token, setToken] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    slug: '',
    description: '',
    website_url: '',
    country_code: 'FR',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 60);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name || form.name.length < 2) e.name = 'Nom requis (min. 2 caractères)';
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalide';
    if (!form.slug || !/^[a-z0-9-]{2,60}$/.test(form.slug)) e.slug = 'Slug invalide (a-z, 0-9, tirets)';
    if (form.website_url && !/^https?:\/\//.test(form.website_url)) e.website_url = 'URL invalide';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res: any = await hostingApi.registerProvider(form);
      const data = res?.data ?? res;
      if (data?.token) {
        setToken(data.token);
        setStep('success');
      } else {
        toast.error(data?.error || 'Erreur lors de l\'inscription');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erreur serveur');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full bg-white/5 border-white/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
                <i className="bi bi-check-circle-fill text-emerald-400 text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Inscription soumise !</h2>
                <p className="text-sm text-muted-foreground">En attente de validation par les admins AlfyChat</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4">
              <p className="text-sm font-medium text-yellow-300 mb-2">
                <i className="bi bi-key-fill mr-2" />
                Votre token d'hébergeur — à sauvegarder maintenant
              </p>
              <code className="block bg-black/40 rounded-lg p-3 text-xs font-mono break-all select-all">
                {token}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Ajoutez <code className="bg-white/10 px-1 rounded">HOSTING_PROVIDER_TOKEN={token.slice(0, 20)}...</code> dans le <code className="bg-white/10 px-1 rounded">.env</code> de vos pods de stockage.
              </p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <h3 className="font-medium text-foreground">Prochaines étapes</h3>
              <Step n={1} text="Attendez la validation par l'équipe AlfyChat (24-48h)" />
              <Step n={2} text="Une fois validé, connectez-vous au panel hébergeur" />
              <Step n={3} text="Créez une clé API puis ajoutez vos nœuds de stockage" />
              <Step n={4} text="Publiez vos offres et ouvrez-les aux clients" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(token);
                  toast.success('Token copié !');
                }}
              >
                <i className="bi bi-clipboard mr-2" /> Copier le token
              </Button>
              <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push('/hosting/panel')}>
                Accéder au panel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-600/30 mb-4">
            <i className="bi bi-server text-indigo-400 text-2xl" />
          </div>
          <h1 className="text-3xl font-bold font-heading">Devenir hébergeur partenaire</h1>
          <p className="text-muted-foreground mt-2">
            Proposez vos capacités de stockage aux communautés AlfyChat
          </p>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Nom de votre hébergeur" error={errors.name}>
                <Input
                  value={form.name}
                  onChange={e => {
                    const name = e.target.value;
                    setForm(f => ({ ...f, name, slug: autoSlug(name) }));
                  }}
                  placeholder="MonHébergeur"
                />
              </Field>

              <Field label="Email de contact" error={errors.email}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="contact@monhebergeur.fr"
                />
              </Field>

              <Field label="Slug (identifiant unique)" error={errors.slug}>
                <div className="flex items-center">
                  <span className="px-3 bg-white/5 border border-r-0 border-white/10 rounded-l-md text-muted-foreground text-sm h-9 flex items-center">
                    hosting/
                  </span>
                  <Input
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: autoSlug(e.target.value) }))}
                    className="rounded-l-none"
                    placeholder="mon-hebergeur"
                  />
                </div>
              </Field>

              <Field label="Site web (optionnel)" error={errors.website_url}>
                <Input
                  value={form.website_url}
                  onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))}
                  placeholder="https://monhebergeur.fr"
                />
              </Field>

              <Field label="Pays">
                <select
                  value={form.country_code}
                  onChange={e => setForm(f => ({ ...f, country_code: e.target.value }))}
                  className="w-full h-9 px-3 rounded-md bg-background border border-input text-sm"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Description (optionnel)">
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-md bg-background border border-input px-3 py-2 text-sm min-h-[80px] resize-none"
                  placeholder="Décrivez votre infrastructure, régions disponibles..."
                />
              </Field>

              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-300">
                <i className="bi bi-info-circle mr-1.5" />
                Votre inscription sera examinée par l'équipe AlfyChat avant activation.
                <br />Vous recevrez un token à configurer dans votre infrastructure.
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                {loading ? (
                  <><i className="bi bi-arrow-repeat animate-spin mr-2" />Envoi en cours...</>
                ) : (
                  <><i className="bi bi-send mr-2" />Soumettre ma candidature</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
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

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 text-xs flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </span>
      <span>{text}</span>
    </div>
  );
}
