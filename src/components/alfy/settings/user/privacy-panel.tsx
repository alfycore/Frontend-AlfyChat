'use client';

import { useEffect, useState } from 'react';
import { AlertDialog, Button, FieldError, Label, Switch, TextField, Input, toast } from '@heroui/react';
import { Download, Flag } from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsRow, SettingsSection } from '@/components/alfy/settings/section';
import { TrustBadges } from '@/components/alfy/primitives/trust-badges';

export function PrivacyPanel() {
  const { user, logout } = useAuth();
  const [filterStrangers, setFilterStrangers] = useState(true);
  const [sharePresence, setSharePresence] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    api.getPreferences(user.id).then((res: any) => {
      if (res?.success && res?.data) {
        const p = res.data;
        if (p.privacyAllowDm !== undefined) setFilterStrangers(!p.privacyAllowDm);
        if (p.privacyShowOnline !== undefined) setSharePresence(p.privacyShowOnline);
      }
    }).catch(() => {});
  }, [user?.id]);

  const handleFilterStrangers = (v: boolean) => {
    setFilterStrangers(v);
    if (user?.id) api.updatePreferences(user.id, { privacyAllowDm: !v }).catch(() => {});
  };

  const handleSharePresence = (v: boolean) => {
    setSharePresence(v);
    if (user?.id) api.updatePreferences(user.id, { privacyShowOnline: v }).catch(() => {});
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res: any = await api.exportMyData();
      if (res?.success) {
        toast('Export lancé', { description: 'Vous recevrez un lien de téléchargement.' });
      } else {
        toast.danger(res?.error || "Échec de l'export");
      }
    } catch {
      toast.danger("Échec de l'export");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) { setDeleteError('Mot de passe requis'); return; }
    setDeleting(true);
    setDeleteError('');
    try {
      const res: any = await api.requestAccountDeletion(deletePassword);
      if (res?.success) {
        setDeleteOpen(false);
        setDeletePassword('');
        await logout();
      } else {
        setDeleteError(res?.error || 'Mot de passe incorrect');
      }
    } catch {
      setDeleteError('Une erreur est survenue');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PanelHeader
        title="Confidentialité"
        description="AlfyChat ne collecte aucune donnée publicitaire. Ces réglages ne concernent que ce que les autres membres voient de vous."
      />

      <SettingsSection title="Messages privés">
        <SettingsRow
          label="Filtrer les messages des inconnus"
          description="Les personnes sans ami commun passent par une demande de message."
        >
          <Switch isSelected={filterStrangers} onChange={handleFilterStrangers} aria-label="Filtrer les messages des inconnus">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Visibilité">
        <SettingsRow
          label="Partager mon statut de présence"
          description="Vos contacts voient si vous êtes en ligne. Désactivé = toujours invisible."
        >
          <Switch isSelected={sharePresence} onChange={handleSharePresence} aria-label="Partager mon statut de présence">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Vos données (RGPD)"
        description="Données hébergées en France. Export et suppression à tout moment, sans justification."
      >
        <SettingsRow
          label="Exporter mes données"
          description="Archive complète (profil, messages non chiffrés côté serveur, préférences) au format JSON."
        >
          <Button size="sm" variant="secondary" onPress={handleExport} isDisabled={exporting}>
            <Download className="size-3.5" />
            {exporting ? 'Export en cours…' : 'Exporter'}
          </Button>
        </SettingsRow>
        <SettingsRow label={<span className="flex items-center gap-2"><Flag className="size-3.5 text-muted" aria-hidden />Hébergement</span>}>
          <TrustBadges compact />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Zone dangereuse" danger>
        <SettingsRow
          label="Supprimer mon compte"
          description="Suppression définitive sous 30 jours, conformément au RGPD. Irréversible."
        >
          <AlertDialog isOpen={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) { setDeletePassword(''); setDeleteError(''); } }}>
            <Button size="sm" variant="danger">
              Supprimer
            </Button>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog className="sm:max-w-[400px]">
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger" />
                    <AlertDialog.Heading>Supprimer définitivement votre compte ?</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body className="flex flex-col gap-3">
                    <p>
                      Vos messages, clés de chiffrement et données personnelles seront supprimés sous
                      30 jours. Cette action est irréversible.
                    </p>
                    <TextField name="deletePassword" type="password" value={deletePassword} onChange={(v) => { setDeletePassword(v); setDeleteError(''); }} isInvalid={!!deleteError}>
                      <Label>Mot de passe</Label>
                      <Input placeholder="Confirmez avec votre mot de passe" />
                      {deleteError ? <FieldError>{deleteError}</FieldError> : null}
                    </TextField>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button slot="close" variant="tertiary">
                      Annuler
                    </Button>
                    <Button variant="danger" onPress={handleDeleteAccount} isDisabled={deleting}>
                      {deleting ? 'Suppression…' : 'Supprimer mon compte'}
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
