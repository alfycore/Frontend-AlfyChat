'use client';

import { Alert, Button, Input, Label, Modal, Spinner, TextField } from '@heroui/react';
import { Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { serverListStore } from '@/lib/server-list-store';
import { socketService } from '@/lib/socket';

interface JoinServerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined?: (server: { id: string; name: string; iconUrl?: string }) => void;
}

/** Rejoindre un serveur existant via un code ou lien d'invitation. */
export function JoinServerDialog({ isOpen, onOpenChange, onJoined }: JoinServerDialogProps) {
  const [invite, setInvite] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setInvite('');
    setError('');
  }, [isOpen]);

  const rejoindre = async () => {
    const code = invite.trim();
    if (!code || joining) return;
    setJoining(true);
    setError('');
    try {
      const res = await api.joinServer(code);
      if (!res.success || !res.data) {
        setError(res.error ?? 'Code invalide ou serveur introuvable.');
        return;
      }
      const s = res.data as { id?: string; serverId?: string; name: string; iconUrl?: string };
      const server = { id: (s.id ?? s.serverId)!, name: s.name, iconUrl: s.iconUrl };
      serverListStore.add(server);
      socketService.getSocket()?.emit('SERVER_SELF_JOIN', server);
      onJoined?.(server);
      onOpenChange(false);
    } finally {
      setJoining(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-default text-foreground">
                <Link2 className="size-5" />
              </Modal.Icon>
              <Modal.Heading>Rejoindre un serveur</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              {error && (
                <Alert status="danger">
                  <Alert.Content>
                    <Alert.Title>Impossible de rejoindre</Alert.Title>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
              <TextField
                value={invite}
                onChange={setInvite}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void rejoindre();
                }}
              >
                <Label>Code ou lien d&apos;invitation</Label>
                <Input placeholder="https://alfychat.app/invite/... ou ABCD1234" autoFocus />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">
                Annuler
              </Button>
              <Button onPress={rejoindre} isDisabled={!invite.trim() || joining}>
                {joining ? <Spinner size="sm" /> : 'Rejoindre'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
