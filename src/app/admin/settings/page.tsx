'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge }  from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  UsersIcon, ShieldCheckIcon, Link2Icon, MailIcon, PlusIcon,
  CopyIcon, CheckCircle2Icon, Trash2Icon,
} from '@/components/icons';
import { api } from '@/lib/api';

function Section({ icon: Icon, title, desc, color, children }: {
  icon: React.ElementType; title: string; desc: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-start gap-4 border-b border-border p-5">
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onCheckedChange }: {
  label: string; desc?: string; checked: boolean; onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/20">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [invites, setInvites]   = useState<any[]>([]);
  const [email, setEmail]       = useState('');
  const [expiry, setExpiry]     = useState('48');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [sr, lr] = await Promise.all([api.getAdminSettings(), api.getInviteLinks()]);
    if (sr.success && sr.data) setSettings(sr.data as any);
    if (lr.success && lr.data) setInvites(lr.data as any[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = async (key: string, value: string) => {
    await api.updateAdminSetting(key, value);
    setSettings(p => ({ ...p, [key]: value }));
  };

  const createInvite = async () => {
    if (!email) return;
    setCreating(true);
    try {
      const r = await api.createInviteLink(email, parseInt(expiry));
      if (r.success && r.data) {
        const d = r.data as any;
        setInvites(p => [d, ...p]);
        setEmail('');
        try {
          await navigator.clipboard.writeText(d.link);
          setCopiedId(d.id);
          setTimeout(() => setCopiedId(null), 3000);
        } catch {}
      }
    } finally { setCreating(false); }
  };

  const copyLink = async (link: any) => {
    const fullLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?invite=${link.code}`;
    try { await navigator.clipboard.writeText(fullLink); setCopiedId(link.id); setTimeout(() => setCopiedId(null), 3000); } catch {}
  };

  if (loading) return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
      {[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />)}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Configuration globale de la plateforme.</p>
      </div>

      {/* Inscriptions */}
      <Section icon={UsersIcon} title="Inscriptions" desc="Contrôlez qui peut créer un compte." color="bg-primary/10 text-primary">
        <ToggleRow
          label="Inscriptions ouvertes"
          desc="Si désactivé, seuls les utilisateurs invités pourront s'inscrire."
          checked={settings.registration_enabled !== 'false'}
          onCheckedChange={v => set('registration_enabled', v ? 'true' : 'false')}
        />
      </Section>

      {/* Turnstile */}
      <Section icon={ShieldCheckIcon} title="Cloudflare Turnstile" desc="Protégez le formulaire d'inscription contre les bots." color="bg-amber-500/10 text-amber-500">
        <div className="space-y-4">
          <ToggleRow
            label="Activer Turnstile"
            desc="Les utilisateurs devront résoudre un captcha lors de l'inscription."
            checked={settings.turnstile_enabled === 'true'}
            onCheckedChange={v => set('turnstile_enabled', v ? 'true' : 'false')}
          />
          {settings.turnstile_enabled === 'true' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Clé du site (Site Key)</label>
              <div className="flex gap-2">
                <Input
                  placeholder="0x4AAAAAA…"
                  value={settings.turnstile_site_key || ''}
                  onChange={e => setSettings(p => ({ ...p, turnstile_site_key: e.target.value }))}
                />
                <Button onClick={() => set('turnstile_site_key', settings.turnstile_site_key || '')}>
                  Sauvegarder
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Obtenez votre clé sur <span className="text-primary">dash.cloudflare.com → Turnstile</span>.
                Clé secrète dans <code className="rounded bg-muted px-1 py-0.5">TURNSTILE_SECRET_KEY</code>.
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* Invitations */}
      <Section icon={Link2Icon} title="Liens d'invitation" desc="Générez des liens d'inscription à usage unique." color="bg-teal-500/10 text-teal-500">
        <div className="space-y-4">
          {/* Create form */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <MailIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email" className="pl-9"
                placeholder="email@exemple.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createInvite()}
              />
            </div>
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              value={expiry} onChange={e => setExpiry(e.target.value)}
            >
              <option value="24">24 h</option>
              <option value="48">48 h</option>
              <option value="168">7 jours</option>
              <option value="720">30 jours</option>
            </select>
            <Button size="sm" className="h-9" disabled={!email || creating} onClick={createInvite}>
              <PlusIcon className="size-4" /> Générer
            </Button>
          </div>

          {/* Invites list */}
          {invites.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
              <Link2Icon className="mb-2 size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aucun lien d&apos;invitation créé.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Email</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Expire</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map(link => {
                    const expired = new Date(link.expiresAt) < new Date();
                    return (
                      <TableRow key={link.id} className="transition-colors">
                        <TableCell className="font-medium text-sm">{link.email}</TableCell>
                        <TableCell>
                          {link.used
                            ? <Badge className="bg-green-600 text-white">Utilisé</Badge>
                            : expired
                            ? <Badge variant="destructive">Expiré</Badge>
                            : <Badge variant="outline" className="border-blue-500 text-blue-500">Actif</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(link.expiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {!link.used && !expired && (
                              <button
                                onClick={() => copyLink(link)}
                                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                {copiedId === link.id
                                  ? <CheckCircle2Icon className="size-4 text-green-500" />
                                  : <CopyIcon className="size-4" />}
                              </button>
                            )}
                            <button
                              onClick={() => api.deleteInviteLink(link.id).then(() => setInvites(p => p.filter(l => l.id !== link.id)))}
                              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2Icon className="size-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
