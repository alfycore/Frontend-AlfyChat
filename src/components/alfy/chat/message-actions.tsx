'use client';

import { Button, Dropdown, Label, Separator, toast, Tooltip } from '@heroui/react';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import {
  Copy,
  CornerUpRight,
  Ellipsis,
  Link2,
  MessageSquareText,
  Pencil,
  Pin,
  Quote,
  Reply,
  SmilePlus,
  Trash2,
} from 'lucide-react';
import { useTranslation } from '@/components/locale-provider';

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

/**
 * Barre d'actions flottante au survol d'un message.
 *
 * Chaque commande n'apparaît que si un gestionnaire la porte vraiment. Avant,
 * le fil privé affichait « Créer un fil », « Citer », « Transférer », « Marquer
 * comme non lu » et « Épingler » alors qu'aucune de ces props n'était fournie :
 * les boutons ne faisaient rien, et le menu allait jusqu'à afficher un toast de
 * réussite pour une action qui n'avait pas eu lieu.
 */
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
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation();

  /* Le séparateur n'a de sens que s'il sépare vraiment deux blocs. */
  const separateur = Boolean(onPinToggle || (isOwn && onEdit) || ((isOwn || canManage) && onDelete));

  const handle = (key: React.Key) => {
    switch (key) {
      case 'copy':
        void navigator.clipboard.writeText(content);
        toast(t.messageItem.textCopiedToast);
        break;
      case 'copy-link':
        // Le domaine `alfy.chat` codé en dur ne pointait nulle part. L'URL
        // courante est déjà celle de la conversation : elle rouvre au bon
        // endroit, avec l'ancre du message.
        void navigator.clipboard.writeText(
          `${window.location.origin}${window.location.pathname}#msg-${messageId}`,
        );
        toast(t.messageItem.linkCopiedToast);
        break;
      case 'quote':
        onQuote?.();
        break;
      case 'forward':
        onForward?.();
        toast(t.messageItem.forwardedToast, { description: t.messageItem.forwardedToastDesc });
        break;
      case 'pin':
        onPinToggle?.();
        toast(pinned ? t.messageItem.unpinnedToast : t.messageItem.pinnedToast);
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
    <div
      className={cn(
        'absolute -top-3 right-4 items-center gap-0.5 rounded-md border border-border bg-overlay p-0.5 shadow-sm',
        // Tant que le menu est ouvert la barre doit rester affichée : en la
        // masquant dès que la souris quitte le message, son bouton déclencheur
        // passait en display:none et le menu, privé d'ancre, se repositionnait
        // dans le coin haut gauche de la fenêtre.
        menuOpen ? 'flex' : 'hidden group-hover/msg:flex group-focus-within/msg:flex',
      )}
    >
      <Tooltip delay={400}>
        <Button isIconOnly size="sm" variant="ghost" className="size-7" onPress={onReact} aria-label={t.messageItem.react}>
          <SmilePlus className="size-4" />
        </Button>
        <Tooltip.Content>
          <p>{t.messageItem.react}</p>
        </Tooltip.Content>
      </Tooltip>
      {onReply && (
        <Tooltip delay={400}>
          <Button isIconOnly size="sm" variant="ghost" className="size-7" onPress={onReply} aria-label={t.messageItem.reply}>
            <Reply className="size-4" />
          </Button>
          <Tooltip.Content>
            <p>{t.messageItem.reply}</p>
          </Tooltip.Content>
        </Tooltip>
      )}
      {onThread && (
        <Tooltip delay={400}>
          <Button isIconOnly size="sm" variant="ghost" className="size-7" onPress={onThread} aria-label={t.messageItem.createThread}>
            <MessageSquareText className="size-4" />
          </Button>
          <Tooltip.Content>
            <p>{t.messageItem.createThread}</p>
          </Tooltip.Content>
        </Tooltip>
      )}
      <Dropdown isOpen={menuOpen} onOpenChange={setMenuOpen}>
        <Dropdown.Trigger
          aria-label={t.messageItem.moreActions}
          className="flex size-7 cursor-pointer items-center justify-center rounded-sm text-muted outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Ellipsis className="size-4" />
        </Dropdown.Trigger>
        <Dropdown.Popover className="min-w-48">
          <Dropdown.Menu onAction={handle}>
            <Dropdown.Item id="copy" textValue={t.messageItem.copyText}>
              <Copy className="size-4" />
              <Label>{t.messageItem.copyText}</Label>
            </Dropdown.Item>
            <Dropdown.Item id="copy-link" textValue={t.messageItem.copyLink}>
              <Link2 className="size-4" />
              <Label>{t.messageItem.copyLink}</Label>
            </Dropdown.Item>
            {onQuote && (
              <Dropdown.Item id="quote" textValue={t.messageItem.quote}>
                <Quote className="size-4" />
                <Label>{t.messageItem.quote}</Label>
              </Dropdown.Item>
            )}
            {onForward && (
              <Dropdown.Item id="forward" textValue={t.messageItem.forward}>
                <CornerUpRight className="size-4" />
                <Label>{t.messageItem.forward}</Label>
              </Dropdown.Item>
            )}
            {separateur && <Separator />}
            {onPinToggle && (
              <Dropdown.Item id="pin" textValue={pinned ? t.messageItem.unpin : t.messageItem.pin}>
                <Pin className="size-4" />
                <Label>{pinned ? t.messageItem.unpin : t.messageItem.pin}</Label>
              </Dropdown.Item>
            )}
            {isOwn && onEdit && (
              <Dropdown.Item id="edit" textValue={t.messageItem.edit}>
                <Pencil className="size-4" />
                <Label>{t.messageItem.edit}</Label>
              </Dropdown.Item>
            )}
            {(isOwn || canManage) && onDelete && (
              <Dropdown.Item id="delete" textValue={t.messageItem.delete} variant="danger">
                <Trash2 className="size-4" />
                <Label>{t.messageItem.delete}</Label>
              </Dropdown.Item>
            )}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
