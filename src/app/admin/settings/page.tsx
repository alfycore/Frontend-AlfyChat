'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Input, Label, Modal, TextField } from '@heroui/react';
import { Copy, Link2, Mail, Plus, RotateCcw, Settings2, Shield, Trash2 } from 'lucide-react';

import { api } from '@/lib/api';
import {
  DateText, EmptyState, PageHeader, SectionCard, SettingRow, TableShell,
  TableSkeleton, Td, Th, Toggle, Tr,
} from '@/components/alfy/admin/primitives';

interface InviteLink {
  id: string;
  code: string;
  email: string;
  used: boolean;
  usedAt?: string | null;
  expiresAt: string;
  createdAt: string;
  createdByUsername?: string | null;
}

/** L'URL du front sert à reconstruire le lien d'invitation complet. */
const FRONTEND_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '');

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [links, setLinks]       = useState<InviteLink[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [notice, setNotice]     = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail]     = useState('');
  const [expiry, setExpiry]   = useState('48');
  const [saving, setSaving]   = useState(false);
  const [copied, setCopied]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [setRes, linkRes] = await Promise.all([api.getAdminSettings(), api.getInviteLinks()]);

    if (setRes.success && setRes.data) setSettings(setRes.data as Record<string, string>);
    else setError(setRes.error ?? 'Impossible de charger les paramètres.');

    if (linkRes.success && linkRes.data) setLinks(linkRes.data as InviteLink[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Bascule un réglage booléen, en reflétant l'état avant confirmation serveur. */
  const setFlag = async (key: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: String(value) }));
    const res = await api.updateAdminSetting(key, String(value));
    if (!res.success) {
      setError(res.error ?? 'Le paramètre n’a pas pu être enregistré.');
      load();
    } else {
      setNotice('Paramètre enregistré.');
      setTimeout(() => setNotice(null), 2500);
    }
  };

  const setValue = async (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    await api.updateAdminSetting(key, value);
  };

  const createInvite = async () => {
    if (!email.trim()) {
      setError('L’adresse e-mail est obligatoire.');
      return;
    }
    setSaving(true);
    const res = await api.createInviteLink(email.trim(), Number(expiry) || 48);
    setSaving(false);

    if (!res.success) {
      setError(res.error ?? 'Le lien n’a pas pu être créé.');
      return;
    }
    setInviteOpen(false);
    setEmail('');
    load();
  };

  const copyLink = async (link: InviteLink) => {
    await navigator.clipboard.writeText(`${FRONTEND_URL}/register?invite=${link.code}`);
    setCopied(link.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const removeLink = async (link: InviteLink) => {
    const res = await api.deleteInviteLink(link.id);
    if (res.success) load();
  };

  const registrationOpen = settings.registration_enabled !== 'false';
  const turnstileOn      = settings.turnstile_enabled === 'true';

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Ouverture des inscriptions, protection anti-robot et liens d’invitation."
      >
        <Button size="sm" variant="secondary" onPress={load} isPending={loading}>
          <RotateCcw className="size-3.5" aria-hidden />
          Actualiser
        </Button>
      </PageHeader>

      {error && (
        <Alert status="danger" className="mb-5">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      {notice && (
        <Alert status="success" className="mb-5">
          <Alert.Content>
            <Alert.Description>{notice}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Inscriptions ── */}
        <SectionCard
          flush
          title="Inscriptions"
          description="Contrôle de l’ouverture des nouveaux comptes"
        >
          <SettingRow
            label="Inscriptions ouvertes"
            description={
              registrationOpen
                ? 'N’importe qui peut créer un compte.'
                : 'Fermées — un lien d’invitation est exigé pour s’inscrire.'
            }
          >
            <Toggle
              isSelected={registrationOpen}
              onChange={(v) => setFlag('registration_enabled', v)}
              label="Ouvrir les inscriptions"
            />
          </SettingRow>

          <SettingRow
            label="Captcha Turnstile"
            description="Vérification Cloudflare à l’inscription et à la connexion."
          >
            <Toggle
              isSelected={turnstileOn}
              onChange={(v) => setFlag('turnstile_enabled', v)}
              label="Activer Turnstile"
            />
          </SettingRow>

          {turnstileOn && (
            <div className="px-4 py-3.5">
              <TextField
                value={settings.turnstile_site_key ?? ''}
                onChange={(v) => setValue('turnstile_site_key', v)}
              >
                <Label>Clé publique Turnstile</Label>
                <Input placeholder="0x4AAA…" autoComplete="off" />
              </TextField>
            </div>
          )}
        </SectionCard>

        {/* ── Filtre des pseudos ── */}
        <SectionCard title="Filtre des pseudos" description="Appliqué à la création de compte">
          <div className="flex gap-3">
            <Shield className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <div className="space-y-2 text-sm">
              <p className="leading-relaxed text-muted">
                Les pseudos injurieux, haineux ou usurpant l’identité du staff sont
                refusés à l’inscription, au changement de pseudo et sur le nom affiché.
                Le filtre résout le leetspeak, les accents et les lettres répétées.
              </p>
              <a
                href="/admin/moderation"
                className="inline-flex text-xs font-medium text-accent hover:underline"
              >
                Gérer les termes interdits →
              </a>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── Liens d'invitation ── */}
      <SectionCard
        flush
        className="mt-4"
        title="Liens d’invitation"
        description={`${links.length} lien${links.length > 1 ? 's' : ''} — usage unique`}
        actions={
          <Button size="sm" onPress={() => setInviteOpen(true)}>
            <Plus className="size-3.5" aria-hidden />
            Créer un lien
          </Button>
        }
      >
        {loading ? (
          <TableSkeleton rows={3} cols={4} />
        ) : links.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="Aucun lien d’invitation"
            description="Créez un lien nominatif pour inviter quelqu’un même inscriptions fermées."
          />
        ) : (
          <TableShell
            minWidth={760}
            head={
              <>
                <Th>Destinataire</Th>
                <Th>Statut</Th>
                <Th>Expire</Th>
                <Th>Créé par</Th>
                <Th align="right">Actions</Th>
              </>
            }
          >
            {links.map((link) => {
              const expired = new Date(link.expiresAt) < new Date();
              return (
                <Tr key={link.id} className={link.used || expired ? 'opacity-60' : undefined}>
                  <Td>
                    <p className="truncate text-sm font-medium">{link.email}</p>
                    <code className="text-xs text-muted">{link.code.slice(0, 12)}…</code>
                  </Td>
                  <Td>
                    <span className="text-sm">
                      {link.used ? 'Utilisé' : expired ? 'Expiré' : 'Actif'}
                    </span>
                    {link.used && link.usedAt && (
                      <p className="text-xs text-muted">
                        <DateText value={link.usedAt} />
                      </p>
                    )}
                  </Td>
                  <Td><DateText value={link.expiresAt} withTime /></Td>
                  <Td>
                    <span className="text-xs text-muted">
                      {link.createdByUsername ? `@${link.createdByUsername}` : '—'}
                    </span>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      {!link.used && !expired && (
                        <Button
                          size="sm"
                          variant="ghost"
                          isIconOnly
                          aria-label={`Copier le lien pour ${link.email}`}
                          onPress={() => copyLink(link)}
                        >
                          <Copy className="size-4" aria-hidden />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label={`Supprimer le lien pour ${link.email}`}
                        className="text-danger hover:bg-danger/10"
                        onPress={() => removeLink(link)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                    {copied === link.id && (
                      <p className="mt-0.5 text-xs text-success">Copié</p>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </TableShell>
        )}
      </SectionCard>

      {/* ── Création de lien ── */}
      <Modal.Backdrop isOpen={inviteOpen} onOpenChange={setInviteOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-accent/12 text-accent">
                <Mail className="size-5" aria-hidden />
              </Modal.Icon>
              <Modal.Heading>Créer un lien d’invitation</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="space-y-4">
              <TextField value={email} onChange={setEmail} type="email" isRequired>
                <Label>Adresse e-mail</Label>
                <Input placeholder="personne@exemple.fr" autoComplete="off" />
              </TextField>

              <TextField value={expiry} onChange={setExpiry}>
                <Label>Validité (heures)</Label>
                <Input inputMode="numeric" placeholder="48" />
              </TextField>

              <p className="text-xs leading-relaxed text-muted">
                Le lien ne fonctionne que pour cette adresse et ne peut servir
                qu’une seule fois.
              </p>
            </Modal.Body>

            <Modal.Footer>
              <Button slot="close" variant="tertiary" isDisabled={saving}>Annuler</Button>
              <Button onPress={createInvite} isPending={saving}>Créer</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
