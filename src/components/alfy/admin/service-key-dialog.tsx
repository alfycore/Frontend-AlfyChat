'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Modal } from '@heroui/react';
import { Check, Copy, Eye, EyeOff, KeyRound } from 'lucide-react';

import { serviceEnvSnippet } from './service-types';

export interface IssuedServiceKey {
  id: string;
  key: string;
  endpoint?: string;
  /** true juste après la création, false après une rotation */
  created?: boolean;
}

/**
 * Affiche une clé de service une seule fois, avec les lignes .env à reporter
 * dans le microservice. Partagé par les pages Services et Load balancer.
 */
export function ServiceKeyDialog({
  issued,
  onClose,
}: {
  issued: IssuedServiceKey | null;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied]   = useState<'key' | 'env' | null>(null);

  useEffect(() => { setVisible(false); setCopied(null); }, [issued]);

  const copy = async (what: 'key' | 'env') => {
    if (!issued) return;
    const text = what === 'key'
      ? issued.key
      : serviceEnvSnippet(issued.id, issued.key, issued.endpoint);
    await navigator.clipboard.writeText(text);
    setCopied(what);
  };

  return (
    <Modal.Backdrop isOpen={issued !== null} onOpenChange={(o) => !o && onClose()}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[520px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-warning/12 text-warning">
              <KeyRound className="size-5" aria-hidden />
            </Modal.Icon>
            <Modal.Heading>
              {issued?.created ? `${issued.id} ajoutée` : `Nouvelle clé pour ${issued?.id}`}
            </Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            <Alert status="warning">
              <Alert.Content>
                <Alert.Description>
                  Cette clé n’est affichée qu’une fois. Reportez-la dans le .env de
                  l’instance puis redémarrez-la : elle se déclarera au gateway toute seule.
                </Alert.Description>
              </Alert.Content>
            </Alert>

            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-secondary p-2.5">
              <code className="min-w-0 flex-1 truncate font-mono text-xs">
                {visible ? issued?.key : '•'.repeat(48)}
              </code>
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                aria-label={visible ? 'Masquer la clé' : 'Afficher la clé'}
                onPress={() => setVisible((v) => !v)}
              >
                {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </Button>
              <Button size="sm" variant="ghost" isIconOnly aria-label="Copier la clé" onPress={() => copy('key')}>
                {copied === 'key'
                  ? <Check className="size-4 text-success" aria-hidden />
                  : <Copy className="size-4" aria-hidden />}
              </Button>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-medium text-muted">Variables d’environnement</p>
                <Button size="sm" variant="ghost" onPress={() => copy('env')}>
                  {copied === 'env'
                    ? <Check className="size-3.5 text-success" aria-hidden />
                    : <Copy className="size-3.5" aria-hidden />}
                  {copied === 'env' ? 'Copié' : 'Copier'}
                </Button>
              </div>
              <pre className="overflow-x-auto rounded-md border border-border bg-surface-secondary p-2.5 font-mono text-xs leading-relaxed">
                {issued && serviceEnvSnippet(
                  issued.id,
                  visible ? issued.key : 'sk_••••••••',
                  issued.endpoint,
                )}
              </pre>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button slot="close">J’ai copié la clé</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
