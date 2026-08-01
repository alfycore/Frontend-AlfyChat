'use client';

import { useEffect, useState } from 'react';
import { Button, Chip, FieldError, Input, InputOTP, Label, Modal, TextField, toast } from '@heroui/react';

import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { deriveKey, decryptPrivateKey, encryptPrivateKey, generateSalt } from '@/lib/e2ee';
import { signalService } from '@/lib/signal-service';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsRow, SettingsSection } from '@/components/alfy/settings/section';

type TwoFAStep = 'setup' | 'backup' | 'disable';

export function SecurityPanel() {
  const { user } = useAuth();

  const [twoFAEnabled, setTwoFAEnabled] = useState<boolean | null>(null);
  const [twoFAModalOpen, setTwoFAModalOpen] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState<TwoFAStep>('setup');
  const [twoFAQR, setTwoFAQR] = useState('');
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFABackupCodes, setTwoFABackupCodes] = useState<string[]>([]);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFADisableCode, setTwoFADisableCode] = useState('');
  const [twoFADisabling, setTwoFADisabling] = useState(false);

  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    api.get2FAStatus().then((r: any) => {
      if (r?.success && r?.data) setTwoFAEnabled(r.data.enabled === true);
    }).catch(() => {});
  }, []);

  const handleStartSetup = async () => {
    setTwoFAStep('setup');
    setTwoFAModalOpen(true);
    setTwoFALoading(true);
    const r: any = await api.setup2FA();
    setTwoFALoading(false);
    if (r?.success && r?.data) {
      setTwoFAQR(r.data.qrCodeDataUrl);
      setTwoFASecret(r.data.secret);
    } else {
      setTwoFAModalOpen(false);
      toast.danger("Impossible de démarrer la configuration 2FA");
    }
  };

  const handleEnable2FA = async () => {
    setTwoFALoading(true);
    const r: any = await api.enable2FA(twoFACode);
    setTwoFALoading(false);
    if (r?.success && r?.data) {
      setTwoFABackupCodes(r.data.backupCodes ?? []);
      setTwoFAEnabled(true);
      setTwoFACode('');
      setTwoFAStep('backup');
    } else {
      setTwoFACode('');
      toast.danger('Code invalide');
    }
  };

  const openDisable = () => {
    setTwoFAStep('disable');
    setTwoFADisableCode('');
    setTwoFAModalOpen(true);
  };

  const handleDisable2FA = async () => {
    setTwoFADisabling(true);
    const r: any = await api.disable2FA(twoFADisableCode);
    setTwoFADisabling(false);
    if (r?.success) {
      setTwoFAEnabled(false);
      setTwoFADisableCode('');
      setTwoFAModalOpen(false);
    } else {
      setTwoFADisableCode('');
      toast.danger('Code invalide');
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (!currentPassword.trim() || !newPassword.trim()) { setPwError('Veuillez remplir tous les champs'); return; }
    if (newPassword !== confirmPassword) { setPwError('Les mots de passe ne correspondent pas'); return; }
    if (newPassword.length < 8) { setPwError('Le nouveau mot de passe doit faire au moins 8 caractères'); return; }
    setChangingPassword(true);
    setPwError('');
    try {
      let e2ee: { encryptedPrivateKey?: string; keySalt?: string } = {};
      try {
        const kr: any = await api.getMyE2EEKeys();
        if (kr?.data?.keySalt && kr?.data?.encryptedPrivateKey) {
          const oldKey = await deriveKey(currentPassword, kr.data.keySalt);
          const rawKey = await decryptPrivateKey(kr.data.encryptedPrivateKey, oldKey);
          const salt = generateSalt();
          const newKey = await deriveKey(newPassword, salt);
          e2ee = { encryptedPrivateKey: await encryptPrivateKey(rawKey, newKey), keySalt: salt };
        }
      } catch {
        setPwError('Impossible de ré-encrypter la clé de chiffrement.');
        setChangingPassword(false);
        return;
      }
      const r: any = await api.changePassword(user.id, { currentPassword, newPassword, ...e2ee });
      if (r?.success) {
        try { await api.uploadPrivateBundle(await signalService.encryptPrivateBundle(newPassword)); } catch { /* non bloquant */ }
        toast('Mot de passe modifié avec succès');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        setPwModalOpen(false);
      } else {
        setPwError(r?.error || 'Mot de passe actuel incorrect');
      }
    } catch {
      setPwError('Erreur lors du changement de mot de passe');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div>
      <PanelHeader title="Sécurité" description="Mot de passe, double authentification et connexions." />

      <SettingsSection title="Authentification">
        <SettingsRow label="Mot de passe" description="Modifiez votre mot de passe de connexion.">
          <Modal isOpen={pwModalOpen} onOpenChange={(open) => { setPwModalOpen(open); if (!open) { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPwError(''); } }}>
            <Button size="sm" variant="secondary" onPress={() => setPwModalOpen(true)}>
              Changer
            </Button>
            <Modal.Backdrop>
              <Modal.Container>
                <Modal.Dialog className="sm:max-w-95">
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>Changer le mot de passe</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="flex flex-col gap-3">
                    <TextField name="currentPassword" type="password" value={currentPassword} onChange={(v) => { setCurrentPassword(v); setPwError(''); }}>
                      <Label>Mot de passe actuel</Label>
                      <Input placeholder="Mot de passe actuel" />
                    </TextField>
                    <TextField name="newPassword" type="password" value={newPassword} onChange={(v) => { setNewPassword(v); setPwError(''); }}>
                      <Label>Nouveau mot de passe</Label>
                      <Input placeholder="Min. 8 caractères" />
                    </TextField>
                    <TextField name="confirmPassword" type="password" value={confirmPassword} onChange={(v) => { setConfirmPassword(v); setPwError(''); }} isInvalid={!!pwError}>
                      <Label>Confirmer le nouveau mot de passe</Label>
                      <Input placeholder="Confirmer" />
                      {pwError ? <FieldError>{pwError}</FieldError> : null}
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button slot="close" variant="tertiary">Annuler</Button>
                    <Button
                      onPress={handleChangePassword}
                      isDisabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                    >
                      {changingPassword ? 'Modification…' : 'Modifier le mot de passe'}
                    </Button>
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
        </SettingsRow>

        <SettingsRow
          label={
            <span className="flex items-center gap-2">
              Double authentification (2FA)
              {twoFAEnabled !== null && (
                <Chip size="sm" color={twoFAEnabled ? 'success' : 'warning'} variant="soft">
                  {twoFAEnabled ? 'Activée' : 'Désactivée'}
                </Chip>
              )}
            </span>
          }
          description="Application d'authentification (TOTP) — recommandé pour tous les comptes."
        >
          <Modal
            isOpen={twoFAModalOpen}
            onOpenChange={(open) => {
              setTwoFAModalOpen(open);
              if (!open) { setTwoFACode(''); setTwoFADisableCode(''); setTwoFAQR(''); setTwoFASecret(''); }
            }}
          >
            {twoFAEnabled ? (
              <Button size="sm" variant="secondary" onPress={openDisable}>
                Désactiver
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onPress={handleStartSetup}>
                Configurer
              </Button>
            )}
            <Modal.Backdrop>
              <Modal.Container>
                <Modal.Dialog className="sm:max-w-95">
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>
                      {twoFAStep === 'disable' ? 'Désactiver la 2FA' : twoFAStep === 'backup' ? '2FA activée' : 'Vérifier votre appareil'}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="flex flex-col items-center gap-3">
                    {twoFAStep === 'setup' && (
                      <>
                        <p className="text-sm text-muted">
                          Scannez ce QR code avec votre application d&apos;authentification, puis saisissez le code à 6 chiffres.
                        </p>
                        {twoFALoading && !twoFAQR ? (
                          <p className="text-xs text-muted">Génération du secret…</p>
                        ) : (
                          <>
                            {twoFAQR && <img src={twoFAQR} alt="QR 2FA" className="size-40 rounded-xl" />}
                            <div className="w-full rounded-xl bg-surface-secondary p-3 text-center font-mono text-[11px] break-all text-muted">
                              {twoFASecret}
                            </div>
                          </>
                        )}
                        <InputOTP maxLength={6} value={twoFACode} onChange={setTwoFACode} aria-label="Code de vérification">
                          <InputOTP.Group>
                            <InputOTP.Slot index={0} /><InputOTP.Slot index={1} /><InputOTP.Slot index={2} />
                          </InputOTP.Group>
                          <InputOTP.Separator />
                          <InputOTP.Group>
                            <InputOTP.Slot index={3} /><InputOTP.Slot index={4} /><InputOTP.Slot index={5} />
                          </InputOTP.Group>
                        </InputOTP>
                      </>
                    )}
                    {twoFAStep === 'disable' && (
                      <>
                        <p className="text-sm text-muted">
                          Saisissez le code à 6 chiffres de votre application d&apos;authentification pour désactiver la 2FA.
                        </p>
                        <InputOTP maxLength={6} value={twoFADisableCode} onChange={setTwoFADisableCode} aria-label="Code de désactivation">
                          <InputOTP.Group>
                            <InputOTP.Slot index={0} /><InputOTP.Slot index={1} /><InputOTP.Slot index={2} />
                          </InputOTP.Group>
                          <InputOTP.Separator />
                          <InputOTP.Group>
                            <InputOTP.Slot index={3} /><InputOTP.Slot index={4} /><InputOTP.Slot index={5} />
                          </InputOTP.Group>
                        </InputOTP>
                      </>
                    )}
                    {twoFAStep === 'backup' && (
                      <>
                        <p className="text-sm font-semibold">La 2FA est activée !</p>
                        <p className="text-xs text-muted">
                          Conservez ces codes de récupération : ils permettent de retrouver l&apos;accès si vous perdez votre appareil. Ils ne seront plus affichés ensuite.
                        </p>
                        <div className="grid w-full grid-cols-2 gap-1 rounded-xl bg-surface-secondary p-3">
                          {twoFABackupCodes.map((c) => (
                            <span key={c} className="font-mono text-[11px]">{c}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </Modal.Body>
                  <Modal.Footer>
                    {twoFAStep === 'backup' ? (
                      <Button className="w-full" onPress={() => setTwoFAModalOpen(false)}>Fermer</Button>
                    ) : twoFAStep === 'disable' ? (
                      <>
                        <Button slot="close" variant="tertiary">Annuler</Button>
                        <Button variant="danger" isDisabled={twoFADisableCode.length < 6 || twoFADisabling} onPress={handleDisable2FA}>
                          {twoFADisabling ? 'Désactivation…' : 'Désactiver'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button slot="close" variant="tertiary">Annuler</Button>
                        <Button isDisabled={twoFACode.length < 6 || twoFALoading} onPress={handleEnable2FA}>
                          Activer
                        </Button>
                      </>
                    )}
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
