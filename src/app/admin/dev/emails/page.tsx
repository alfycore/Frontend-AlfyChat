'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input, Label, TextField, toast } from '@heroui/react';
import { Loader2, Mail, RefreshCw, Send } from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader, SectionCard, LoadingPanel } from '@/components/alfy/admin/primitives';
import { cn } from '@/lib/utils';

interface EmailType {
  id: string;
  label: string;
}

/** Page dev : aperçu visuel + envoi d'un vrai email de test pour chaque template. */
export default function AdminDevEmailsPage() {
  const { user } = useAuth();
  const [types, setTypes] = useState<EmailType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [activeType, setActiveType] = useState<string | null>(null);

  const [html, setHtml] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const toTouched = useRef(false);

  useEffect(() => {
    if (user?.email && !toTouched.current) setTo(user.email);
  }, [user?.email]);

  useEffect(() => {
    void (async () => {
      setLoadingTypes(true);
      const res = await api.getAdminDevEmailTypes();
      if (res.success && Array.isArray(res.data)) {
        setTypes(res.data);
        setActiveType((cur) => cur ?? res.data![0]?.id ?? null);
      } else {
        toast.danger('Impossible de charger les types d’email', { description: res.error });
      }
      setLoadingTypes(false);
    })();
  }, []);

  const loadPreview = useCallback(async (type: string) => {
    setLoadingPreview(true);
    setHtml('');
    const res = await api.getAdminDevEmailPreview(type);
    if (res.success && res.data?.html) {
      setHtml(res.data.html);
    } else {
      toast.danger('Aperçu indisponible', { description: res.error });
    }
    setLoadingPreview(false);
  }, []);

  useEffect(() => {
    if (activeType) void loadPreview(activeType);
  }, [activeType, loadPreview]);

  const handleSendTest = async () => {
    if (!activeType || !to.trim() || sending) return;
    setSending(true);
    try {
      const res = await api.sendAdminDevTestEmail(activeType, to.trim());
      if (res.success) {
        toast('Email de test envoyé', { description: to.trim() });
      } else {
        toast.danger('Envoi impossible', { description: res.error ?? 'Erreur inconnue' });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Test des emails"
        description="Aperçu en direct et envoi d'un vrai email de test pour chaque template transactionnel — utile pour vérifier le rendu avant un déploiement."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        {/* Liste des types */}
        <SectionCard title="Templates" className="lg:self-start">
          {loadingTypes ? (
            <LoadingPanel label="Chargement…" />
          ) : (
            <div className="flex flex-col gap-1">
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveType(t.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors',
                    activeType === t.id
                      ? 'bg-accent/10 font-medium text-foreground'
                      : 'text-muted hover:bg-surface-secondary hover:text-foreground',
                  )}
                >
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Aperçu + envoi */}
        <div className="flex min-w-0 flex-col gap-4">
          <SectionCard
            title="Aperçu"
            description="Rendu tel qu'il apparaîtra dans un client mail — données fictives."
            actions={
              <Button
                size="sm"
                variant="secondary"
                isDisabled={!activeType || loadingPreview}
                onPress={() => activeType && loadPreview(activeType)}
              >
                {loadingPreview ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                Rafraîchir
              </Button>
            }
            flush
          >
            <div className="relative h-[720px] w-full bg-[#0a0a0c]">
              {loadingPreview && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0c]">
                  <Loader2 className="size-5 animate-spin text-muted" />
                </div>
              )}
              {html && (
                <iframe
                  title="Aperçu email"
                  srcDoc={html}
                  sandbox=""
                  className="size-full border-0"
                />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Envoyer un test réel" description="Déclenche un vrai envoi SMTP avec des données fictives, préfixé [TEST] dans l'objet.">
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendTest();
              }}
            >
              <TextField
                value={to}
                onChange={(v) => {
                  toTouched.current = true;
                  setTo(v);
                }}
                className="min-w-64 flex-1"
              >
                <Label>Adresse destinataire</Label>
                <Input type="email" placeholder="toi@exemple.com" autoComplete="off" />
              </TextField>
              <Button type="submit" isDisabled={!activeType || !to.trim() || sending}>
                {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                {sending ? 'Envoi…' : 'Envoyer le test'}
              </Button>
            </form>
            {!types.length && !loadingTypes && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                <Mail className="size-3.5" aria-hidden />
                Aucun template disponible.
              </p>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
