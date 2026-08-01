'use client';

import { useEffect, useState } from 'react';
import { Button, Code, Tooltip, toast } from '@heroui/react';
import { Copy, Laptop, Lock } from 'lucide-react';

import { api } from '@/lib/api';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsRow, SettingsSection } from '@/components/alfy/settings/section';

async function fingerprintOf(publicKey: string): Promise<string> {
  const bytes = new TextEncoder().encode(publicKey);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest).slice(0, 16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return hex.match(/.{1,4}/g)?.join(' ') ?? hex;
}

export function KeysPanel() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    api.getMyE2EEKeys().then(async (res: any) => {
      const publicKey = res?.data?.publicKey;
      if (publicKey) setFingerprint(await fingerprintOf(publicKey));
    }).catch(() => {});
  }, []);

  return (
    <div>
      <PanelHeader
        title="Clés de chiffrement"
        description="Votre compte possède une seule paire de clés Signal, chiffrée avec votre mot de passe et stockée uniquement sous cette forme chiffrée sur nos serveurs."
      />

      <div className="mb-8 flex items-start gap-3 rounded-lg border border-(--alfy-e2e)/25 bg-(--alfy-e2e-soft) p-4">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-(--alfy-e2e)/15 text-(--alfy-e2e)">
          <Lock className="size-3.5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold">Chiffrement de bout en bout actif</p>
          <p className="mt-0.5 text-xs leading-relaxed text-foreground/75">
            Vos clés privées ne quittent jamais vos appareils. AlfyChat ne peut pas lire vos
            messages — et personne d&apos;autre non plus.
          </p>
        </div>
      </div>

      <SettingsSection
        title="Votre empreinte"
        description="Comparez cette empreinte de visu ou par un autre canal sûr avec vos contacts pour vous protéger des attaques de l'intercepteur."
      >
        <SettingsRow
          label={
            <span className="flex items-center gap-2">
              <Laptop className="size-4 text-muted" aria-hidden />
              Identité de chiffrement du compte
            </span>
          }
          description={fingerprint ? <Code className="text-[11px] tracking-tight">{fingerprint}</Code> : 'Chargement…'}
        >
          {fingerprint && (
            <Tooltip delay={300}>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="Copier l'empreinte"
                onPress={async () => {
                  await navigator.clipboard.writeText(fingerprint);
                  toast('Empreinte copiée');
                }}
              >
                <Copy className="size-3.5" />
              </Button>
              <Tooltip.Content>
                <p>Copier l&apos;empreinte</p>
              </Tooltip.Content>
            </Tooltip>
          )}
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
