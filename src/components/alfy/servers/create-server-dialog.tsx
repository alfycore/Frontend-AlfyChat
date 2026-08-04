'use client';

import {
  Avatar,
  Button,
  Input,
  Label,
  Modal,
  RadioGroup,
  Spinner,
  Switch,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import { Camera, Home, Rocket, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { api, resolveMediaUrl } from '@/lib/api';
import { serverListStore } from '@/lib/server-list-store';
import { HostingCategoryRadio } from '@/components/alfy/servers/hosting-category-radio';
import { cn } from '@/lib/utils';

type Category = 'standard' | 'community';

interface Quota {
  used: { standard: number; community: number };
  remaining: { total: number; standard: number; community: number };
}

const initiales = (nom: string) =>
  nom
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

interface CreateServerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Le serveur a été créé — laisse l'appelant naviguer dessus. */
  onCreated?: (server: { id: string; name: string; iconUrl?: string }) => void;
}

/**
 * Création d'un serveur Type 1 (hébergé à 100% par AlfyChat). Les Types 2
 * (auto-hébergé) et 3 (hébergeur certifié) restent hors de ce dialogue pour
 * l'instant — ils ont leurs propres parcours (lancement d'un server-node,
 * marketplace d'hébergement).
 */
export function CreateServerDialog({ isOpen, onOpenChange, onCreated }: CreateServerDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [category, setCategory] = useState<Category>('standard');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | undefined>(undefined);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const iconInput = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Rechargement du quota + reset du formulaire à chaque ouverture.
  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setDescription('');
    setIsPublic(false);
    setCategory('standard');
    setIconFile(null);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setIconPreview(undefined);
    setQuota(null);
    api.getServerQuota().then((res) => {
      if (res.success && res.data) {
        setQuota({ used: res.data.used, remaining: res.data.remaining });
        // Présélectionne une catégorie encore disponible.
        if (res.data.remaining.standard === 0 && res.data.remaining.community > 0) {
          setCategory('community');
        }
      }
    });
  }, [isOpen]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const previsualiserIcone = (fichier: File | undefined) => {
    if (!fichier) return;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(fichier);
    previewUrlRef.current = url;
    setIconFile(fichier);
    setIconPreview(url);
  };

  const standardFull = quota ? quota.remaining.standard === 0 : false;
  const communityFull = quota ? quota.remaining.community === 0 : false;
  const totalFull = quota ? quota.remaining.total === 0 : false;
  const invalide = name.trim().length < 2 || totalFull || (category === 'standard' ? standardFull : communityFull);

  const creer = async () => {
    if (invalide || submitting) return;
    setSubmitting(true);
    try {
      let iconUrl: string | undefined;
      if (iconFile) {
        const up = await api.uploadImage(iconFile, 'icon');
        if (!up.success || !up.data?.url) {
          toast.danger('Envoi de l’icône impossible', { description: up.error ?? iconFile.name });
          return;
        }
        iconUrl = up.data.url;
      }

      const res = await api.createServer({
        name: name.trim(),
        description: description.trim() || undefined,
        iconUrl,
        isPublic,
        category,
      });
      if (!res.success || !res.data) {
        toast.danger('Création impossible', { description: res.error ?? 'Réessayez dans un instant.' });
        return;
      }

      const resolvedIcon = resolveMediaUrl(iconUrl);
      serverListStore.add({ id: res.data.id, name: res.data.name, iconUrl: resolvedIcon });
      toast('Serveur créé', { description: res.data.name });
      onCreated?.({ id: res.data.id, name: res.data.name, iconUrl: resolvedIcon });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-default text-foreground">
                <Rocket className="size-5" />
              </Modal.Icon>
              <Modal.Heading>Créer un serveur</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => iconInput.current?.click()}
                  aria-label="Choisir une icône"
                  className="group/icon relative shrink-0 cursor-pointer rounded-full outline-none transition-transform duration-200 hover:scale-105 focus-visible:scale-105"
                >
                  <Avatar size="lg">
                    {iconPreview && <Avatar.Image src={iconPreview} alt="" />}
                    <Avatar.Fallback>{initiales(name)}</Avatar.Fallback>
                  </Avatar>
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity duration-200 group-hover/icon:opacity-100 group-focus-visible/icon:opacity-100">
                    <Camera className="size-4.5 text-white" aria-hidden />
                  </span>
                </button>
                <input
                  ref={iconInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    previsualiserIcone(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <TextField value={name} onChange={setName} className="flex-1">
                  <Label>Nom du serveur</Label>
                  <Input placeholder="Ex. Le repaire" />
                </TextField>
              </div>

              <TextField value={description} onChange={setDescription}>
                <Label>Description (facultatif)</Label>
                <TextArea placeholder="En une phrase, de quoi parle ce serveur ?" rows={2} />
              </TextField>

              <RadioGroup
                value={category}
                onChange={(v) => setCategory(v as Category)}
                aria-label="Catégorie du serveur"
                className="grid gap-3 sm:grid-cols-2"
              >
                <HostingCategoryRadio
                  value="standard"
                  icon={Home}
                  title="Standard"
                  subtitle="Jusqu'à 200 membres"
                  isDisabled={standardFull}
                  usage={quota ? `${quota.used.standard}/${quota.used.standard + quota.remaining.standard} utilisés` : undefined}
                />
                <HostingCategoryRadio
                  value="community"
                  icon={Users}
                  title="Communautaire"
                  subtitle="Jusqu'à 4000 membres"
                  isDisabled={communityFull}
                  usage={quota ? `${quota.used.community}/${quota.used.community + quota.remaining.community} utilisés` : undefined}
                />
              </RadioGroup>
              {totalFull && (
                <p className="text-xs text-danger">
                  Limite de 5 serveurs hébergés par AlfyChat atteinte pour votre compte.
                </p>
              )}

              <div className={cn('flex items-center justify-between gap-3 rounded-lg border border-border p-3')}>
                <span className="flex flex-col gap-0.5">
                  <Label>Serveur public</Label>
                  <span className="text-xs text-muted">Visible dans Découvrir, indépendamment de la catégorie.</span>
                </span>
                <Switch isSelected={isPublic} onChange={setIsPublic} aria-label="Serveur public" />
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">
                Annuler
              </Button>
              <Button onPress={creer} isDisabled={invalide || submitting}>
                {submitting ? <Spinner size="sm" /> : 'Créer le serveur'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
