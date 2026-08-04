'use client';

import { useEffect, useState } from 'react';
import { Button, Chip, Code, Input, Label, TextField, toast } from '@heroui/react';
import { Globe } from 'lucide-react';

import { api } from '@/lib/api';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsContent, SettingsRow, SettingsSection } from '@/components/alfy/settings/section';
import { useTranslation } from '@/components/locale-provider';

export function DomainPanel({ serverId }: { serverId: string }) {
  const { t } = useTranslation();
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
        toast(t.domainPanel.txtGenerated, { description: t.domainPanel.txtGeneratedDesc });
      } else {
        toast.danger(r?.error || t.domainPanel.startVerifyError);
      }
    } catch {
      toast.danger(t.domainPanel.startVerifyError);
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
        toast.success(t.domainPanel.domainVerified, { description: savedDomain });
      } else if (r?.success) {
        toast(t.domainPanel.notVerifiedYet, { description: t.domainPanel.notVerifiedYetDesc });
      } else {
        toast.danger(r?.error || t.domainPanel.verifyError);
      }
    } catch {
      toast.danger(t.domainPanel.verifyError);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <PanelHeader
        title={t.domainPanel.panelTitle}
        description={t.domainPanel.panelDescription}
      />

      <SettingsSection title={t.domainPanel.domainSection}>
        <SettingsContent className="flex flex-col gap-4">
          <TextField value={domain} onChange={setDomain} isDisabled={verified} className="max-w-sm">
            <Label>{t.domainPanel.domainNameLabel}</Label>
            <Input placeholder={t.domainPanel.domainPlaceholder} />
          </TextField>
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-muted" aria-hidden />
            <span className="text-sm">{savedDomain || t.domainPanel.noDomain}</span>
            {savedDomain && (
              verified ? (
                <Chip size="sm" color="success" variant="soft">{t.domainPanel.verified}</Chip>
              ) : (
                <Chip size="sm" color="warning" variant="soft">{t.domainPanel.pending}</Chip>
              )
            )}
          </div>
          {!verified && (
            <Button size="sm" variant="secondary" className="self-start" onPress={handleStartVerify} isDisabled={!domain.trim() || starting}>
              {starting ? t.domainPanel.generating : t.domainPanel.generateTxt}
            </Button>
          )}
        </SettingsContent>
      </SettingsSection>

      {txtRecord && !verified && (
        <SettingsSection
          title={t.domainPanel.dnsVerification}
          description={t.domainPanel.dnsVerificationDesc}
        >
          <SettingsRow label={t.domainPanel.txtRecord}>
            <Code className="text-[11px]">{txtRecord}</Code>
            <Button
              size="sm"
              variant="ghost"
              onPress={async () => {
                await navigator.clipboard.writeText(txtRecord);
                toast(t.domainPanel.recordCopied);
              }}
            >
              {t.domainPanel.copy}
            </Button>
          </SettingsRow>
        </SettingsSection>
      )}

      {!verified && txtRecord && (
        <div className="flex justify-end gap-2">
          <Button onPress={handleCheckVerify} isDisabled={checking}>
            {checking ? t.domainPanel.checking : t.domainPanel.verifyNow}
          </Button>
        </div>
      )}
    </div>
  );
}
