'use client';

import { Button, Dropdown, Label, Separator, toast, Tooltip } from '@heroui/react';
import {
  Copy,
  CornerUpRight,
  Ellipsis,
  Link2,
  MailOpen,
  MessageSquareText,
  Pencil,
  Pin,
  Quote,
  Reply,
  SmilePlus,
  Trash2,
} from 'lucide-react';

interface MessageActionsProps {
  messageId: string;
  content: string;
  canManage?: boolean;
  isOwn?: boolean;
  pinned?: boolean;
  onReact?: () => void;
  onReply?: () => void;
  onThread?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPinToggle?: () => void;
  onQuote?: () => void;
  onForward?: () => void;
}

/** Barre d'actions flottante au survol d'un message. */
export function MessageActions({
  messageId,
  content,
  canManage,
  isOwn,
  pinned,
  onReact,
  onReply,
  onThread,
  onEdit,
  onDelete,
  onPinToggle,
  onQuote,
  onForward,
}: MessageActionsProps) {
  const handle = (key: React.Key) => {
    switch (key) {
      case 'copy':
        void navigator.clipboard.writeText(content);
        toast('Texte copié');
        break;
      case 'copy-link':
        void navigator.clipboard.writeText(`https://alfy.chat/m/${messageId}`);
        toast('Lien du message copié');
        break;
      case 'quote':
        onQuote?.();
        break;
      case 'forward':
        onForward?.();
        toast('Message transféré', { description: 'Choisissez une destination.' });
        break;
      case 'unread':
        toast('Marqué comme non lu');
        break;
      case 'pin':
        onPinToggle?.();
        toast(pinned ? 'Message désépinglé' : 'Message épinglé');
        break;
      case 'edit':
        onEdit?.();
        break;
      case 'delete':
        onDelete?.();
        break;
    }
  };

  return (
    <div className="absolute -top-3 right-4 hidden items-center gap-0.5 rounded-md border border-border bg-overlay p-0.5 shadow-sm group-hover/msg:flex group-focus-within/msg:flex">
      <Tooltip delay={400}>
        <Button isIconOnly size="sm" variant="ghost" className="size-7" onPress={onReact} aria-label="Réagir">
          <SmilePlus className="size-4" />
        </Button>
        <Tooltip.Content>
          <p>Réagir</p>
        </Tooltip.Content>
      </Tooltip>
      <Tooltip delay={400}>
        <Button isIconOnly size="sm" variant="ghost" className="size-7" onPress={onReply} aria-label="Répondre">
          <Reply className="size-4" />
        </Button>
        <Tooltip.Content>
          <p>Répondre</p>
        </Tooltip.Content>
      </Tooltip>
      <Tooltip delay={400}>
        <Button isIconOnly size="sm" variant="ghost" className="size-7" onPress={onThread} aria-label="Créer un fil">
          <MessageSquareText className="size-4" />
        </Button>
        <Tooltip.Content>
          <p>Créer un fil</p>
        </Tooltip.Content>
      </Tooltip>
      <Dropdown>
        <Dropdown.Trigger
          aria-label="Plus d'actions"
          className="flex size-7 cursor-pointer items-center justify-center rounded-sm text-muted outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Ellipsis className="size-4" />
        </Dropdown.Trigger>
        <Dropdown.Popover className="min-w-48">
          <Dropdown.Menu onAction={handle}>
            <Dropdown.Item id="copy" textValue="Copier le texte">
              <Copy className="size-4" />
              <Label>Copier le texte</Label>
            </Dropdown.Item>
            <Dropdown.Item id="copy-link" textValue="Copier le lien">
              <Link2 className="size-4" />
              <Label>Copier le lien du message</Label>
            </Dropdown.Item>
            <Dropdown.Item id="quote" textValue="Citer">
              <Quote className="size-4" />
              <Label>Citer</Label>
            </Dropdown.Item>
            <Dropdown.Item id="forward" textValue="Transférer">
              <CornerUpRight className="size-4" />
              <Label>Transférer</Label>
            </Dropdown.Item>
            <Dropdown.Item id="unread" textValue="Marquer comme non lu">
              <MailOpen className="size-4" />
              <Label>Marquer comme non lu</Label>
            </Dropdown.Item>
            <Separator />
            <Dropdown.Item id="pin" textValue={pinned ? 'Désépingler' : 'Épingler'}>
              <Pin className="size-4" />
              <Label>{pinned ? 'Désépingler' : 'Épingler'}</Label>
            </Dropdown.Item>
            {isOwn && (
              <Dropdown.Item id="edit" textValue="Modifier">
                <Pencil className="size-4" />
                <Label>Modifier</Label>
              </Dropdown.Item>
            )}
            {(isOwn || canManage) && (
              <Dropdown.Item id="delete" textValue="Supprimer" variant="danger">
                <Trash2 className="size-4" />
                <Label>Supprimer</Label>
              </Dropdown.Item>
            )}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
