'use client';

import { useEffect, useState } from 'react';
import { Button, Chip, Code, Input, Label, TextField, toast } from '@heroui/react';
import { Globe } from 'lucide-react';

import { api } from '@/lib/api';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsContent, SettingsRow, SettingsSection } from '@/components/alfy/settings/section';

export function DomainPanel({ serverId }: { serverId: string }) {
  const [domain, setDomain] = useState('');
  const [savedDomain, setSavedDomain] = useState('');
  const [verified, setVerified] = useState(false);
  const [txtRecord, setTxtRecord] = useState('');
  const [starting, setStarting] = useState(false);
  const [checking, setChecking] = useState(false);

  const loadServer = () => {
    api.get<any>(`/api/servers/${serverId}`).then((res: any) => {
      const data = res?.data ?? {};
      const cd = data.customDomain || data.custom_domain || '';
      setSavedDomain(cd);
      setDomain(cd);
      setVerified(Boolean(data.domainVerified ?? data.domain_verified));
    }).catch(() => {});
  };

  useEffect(() => { loadServer(); }, [serverId]);

  const handleStartVerify = async () => {
    if (!domain.trim()) return;
    setStarting(true);
    try {
      const r: any = await api.startDomainVerification(serverId, domain.trim());
      if (r?.success && r?.data) {
        setTxtRecord(r.data.txtRecord || '');
        setSavedDomain(domain.trim());
        toast('Enregistrement TXT généré', { description: "Ajoutez-le à votre zone DNS puis lancez la vérification." });
      } else {
        toast.danger(r?.error || 'Échec du démarrage de la vérification');
      }
    } catch {
      toast.danger('Échec du démarrage de la vérification');
    } finally {
      setStarting(false);
    }
  };

  const handleCheckVerify = async () => {
    setChecking(true);
    try {
      const r: any = await api.checkDomainVerification(serverId);
      loadServer();
      if (r?.success && r?.data?.verified) {
        toast.success('Domaine vérifié', { description: savedDomain });
      } else if (r?.success) {
        toast('Pas encore vérifié', { description: "L'enregistrement DNS n'a pas encore été détecté." });
      } else {
        toast.danger(r?.error || 'Échec de la vérification');
      }
    } catch {
      toast.danger('Échec de la vérification');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <PanelHeader
        title="Domaine personnalisé"
        description="Associez votre propre domaine à ce serveur auto-hébergé pour que vos membres s'y connectent directement."
      />

      <SettingsSection title="Domaine">
        <SettingsContent className="flex flex-col gap-4">
          <TextField value={domain} onChange={setDomain} isDisabled={verified} className="max-w-sm">
            <Label>Nom de domaine</Label>
            <Input placeholder="chat.exemple.fr" />
          </TextField>
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-muted" aria-hidden />
            <span className="text-sm">{savedDomain || 'Aucun domaine configuré'}</span>
            {savedDomain && (
              verified ? (
                <Chip size="sm" color="success" variant="soft">Vérifié</Chip>
              ) : (
                <Chip size="sm" color="warning" variant="soft">En attente</Chip>
              )
            )}
          </div>
          {!verified && (
            <Button size="sm" variant="secondary" className="self-start" onPress={handleStartVerify} isDisabled={!domain.trim() || starting}>
              {starting ? 'Génération…' : "Générer l'enregistrement TXT"}
            </Button>
          )}
        </SettingsContent>
      </SettingsSection>

      {txtRecord && !verified && (
        <SettingsSection
          title="Vérification DNS"
          description="Ajoutez cet enregistrement TXT à votre zone DNS, puis lancez la vérification."
        >
          <SettingsRow label="Enregistrement TXT">
            <Code className="text-[11px]">{txtRecord}</Code>
            <Button
              size="sm"
              variant="ghost"
              onPress={async () => {
                await navigator.clipboard.writeText(txtRecord);
                toast('Enregistrement copié');
              }}
            >
              Copier
            </Button>
          </SettingsRow>
        </SettingsSection>
      )}

      {!verified && txtRecord && (
        <div className="flex justify-end gap-2">
          <Button onPress={handleCheckVerify} isDisabled={checking}>
            {checking ? 'Vérification…' : 'Vérifier maintenant'}
          </Button>
        </div>
      )}
    </div>
  );
}
