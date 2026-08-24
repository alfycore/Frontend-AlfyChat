'use client';

import { Button, Chip, Input, SearchField, Tabs, TextField, Tooltip, toast } from '@heroui/react';
import { Ban, Check, MailCheck, Menu, MessageCircle, Phone, Search, UserPlus, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useCallContext } from '@/hooks/use-call-context';
import type { AlfyUser } from '@/components/alfy/mock/types';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { usePresenceLabels } from '@/components/alfy/primitives/status-dot';
import { EmptyState } from '@/components/alfy/primitives/empty-state';
import { SectionLabel } from '@/components/alfy/primitives/section-label';
import { useTranslation } from '@/components/locale-provider';

const isOnline = (u: AlfyUser) => u.status !== 'offline' && u.status !== 'invisible';

/**
 * Style de la variante « secondary » des onglets, appliqué à la main.
 *
 * `variant="secondary"` pose bien `tabs--secondary` sur la racine, mais son CSS
 * cible `.tabs--secondary > .tabs__list-container` : un combinateur enfant
 * direct. Ici le conteneur est un petit-enfant (Tabs → header → ListContainer),
 * donc aucune de ces règles ne l'atteint — d'où le conteneur arrondi et la
 * pastille pleine qui subsistaient. La couche `utilities` prime sur
 * `components`, aucun `!` n'est nécessaire.
 */
const TAB_CLASS = 'h-full rounded-none whitespace-nowrap data-[selected=true]:text-foreground';
const TAB_INDICATOR_CLASS = 'top-auto bottom-0 h-0.5 rounded-none bg-accent shadow-none';

export interface FriendsPendingEntry {
  requestId: string;
  user: AlfyUser;
  direction: 'incoming' | 'outgoing';
}

interface FriendsViewProps {
  onMessage?: (userId: string) => void;
  /** Ouvre le tiroir de navigation (mobile) — sans lui, on est piégé sur cet écran. */
  onOpenNav?: () => void;
  friends?: AlfyUser[];
  pending?: FriendsPendingEntry[];
  blocked?: AlfyUser[];
  onAccept?: (requestId: string) => void;
  onDecline?: (requestId: string) => void;
  /** Renvoie si la demande a bien été envoyée — pilote le toast de retour. */
  onAddFriend?: (username: string) => Promise<boolean> | void;
  onUnblock?: (userId: string) => void;
}

function FriendRow({ user, onMessage }: { user: AlfyUser; onMessage?: (id: string) => void }) {
  const { t, tx } = useTranslation();
  const presenceLabels = usePresenceLabels();
  const { initiateCall } = useCallContext();
  return (
    <div
      className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-secondary"
      onDoubleClick={() => onMessage?.(user.id)}
    >
      <AlfyAvatar
        name={user.displayName}
        avatarUrl={user.avatarUrl}
        size="sm"
        status={isOnline(user) ? user.status : undefined}
        statusRingClass="ring-surface"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.displayName}</p>
        <p className="truncate text-xs text-muted">
          {user.customStatus ?? presenceLabels[user.status]}
        </p>
      </div>
      {/* `opacity-0` seul laissait les boutons cliquables et focusables alors
          qu'ils étaient invisibles. */}
      <div className="pointer-events-none flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-100 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        <Tooltip delay={300}>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={tx(t.friends.people.sendMessageTo, { name: user.displayName })}
            className="rounded-full bg-surface-tertiary text-muted hover:text-foreground"
            onPress={() => onMessage?.(user.id)}
          >
            <MessageCircle className="size-4" />
          </Button>
          <Tooltip.Content>
            <p>{t.friends.message}</p>
          </Tooltip.Content>
        </Tooltip>
        <Tooltip delay={300}>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={tx(t.friends.people.callUser, { name: user.displayName })}
            className="rounded-full bg-surface-tertiary text-muted hover:text-foreground"
            onPress={() => initiateCall(user.id, 'voice', undefined, user.displayName)}
          >
            <Phone className="size-4" />
          </Button>
          <Tooltip.Content>
            <p>{t.friends.people.call}</p>
          </Tooltip.Content>
        </Tooltip>
      </div>
    </div>
  );
}

export function FriendsView({
  onMessage,
  onOpenNav,
  friends = [],
  pending = [],
  blocked = [],
  onAccept,
  onDecline,
  onAddFriend,
  onUnblock,
}: FriendsViewProps) {
  const { t, tx } = useTranslation();
  const [query, setQuery] = useState('');

  const requete = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      friends.filter(
        (u) =>
          (u.displayName ?? '').toLowerCase().includes(requete) ||
          (u.username ?? '').toLowerCase().includes(requete),
      ),
    [requete, friends],
  );
  const online = filtered.filter(isOnline);
  const offline = filtered.filter((u) => !isOnline(u));

  const [tab, setTab] = useState('online');
  const [addName, setAddName] = useState('');
  const [sending, setSending] = useState(false);

  /* Distingue « aucun ami » de « la recherche ne donne rien » : les deux
     affichaient le même vide, impossible à interpréter. */
  const videRecherche = requete.length > 0 && filtered.length === 0;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-surface">
      {/* `secondary` : indicateur souligné plutôt que pastille pleine. */}
      <Tabs
        variant="secondary"
        selectedKey={tab}
        onSelectionChange={(k) => setTab(String(k))}
        className="flex h-full flex-col"
      >
        {/* En-tête */}
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-separator bg-surface/85 px-4 backdrop-blur-sm">
          {/* Sans ce bouton, arriver sur /channels/me depuis un téléphone
              laissait l'utilisateur sans aucun accès à la navigation. */}
          {onOpenNav && (
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={t.chat.openNav}
              className="-ml-1 shrink-0 text-muted md:hidden"
              onPress={onOpenNav}
            >
              <Menu className="size-4.5" aria-hidden />
            </Button>
          )}

          <div className="flex shrink-0 items-center gap-2">
            <Users className="size-4.5 text-muted" aria-hidden />
            <h2 className="hidden text-sm font-semibold sm:block">{t.friends.title}</h2>
          </div>
          <div className="hidden h-5 w-px bg-separator sm:block" aria-hidden />
          {/* `h-full` sur toute la chaîne pour que le soulignement tombe sur la
              ligne de base du bandeau plutôt que de coller au texte. HeroUI
              insère un `.tabs__list-container__scroller` entre le conteneur et
              la liste, et ne lui donne `h-full` qu'en orientation verticale :
              `[&>[data-orientation]]:h-full` le vise (c'est le seul enfant
              direct porteur de cet attribut) sans toucher aux chevrons de
              débordement. Voir TAB_CLASS pour le style de la variante. */}
          <Tabs.ListContainer className="h-full min-w-0 rounded-none bg-transparent [&>[data-orientation]]:h-full">
            <Tabs.List aria-label={t.friends.title} className="h-full gap-1 p-0">
              <Tabs.Tab id="online" className={TAB_CLASS}>
                {t.friends.onlineSidebar}
                <Tabs.Indicator className={TAB_INDICATOR_CLASS} />
              </Tabs.Tab>
              <Tabs.Tab id="all" className={TAB_CLASS}>
                {t.friends.people.allTab}
                <Tabs.Indicator className={TAB_INDICATOR_CLASS} />
              </Tabs.Tab>
              <Tabs.Tab id="pending" className={TAB_CLASS}>
                {t.friends.pending}
                {pending.length > 0 && (
                  <Chip size="sm" color="danger" variant="soft" className="ml-1 text-[10px]">
                    {pending.length}
                  </Chip>
                )}
                <Tabs.Indicator className={TAB_INDICATOR_CLASS} />
              </Tabs.Tab>
              <Tabs.Tab id="blocked" className={TAB_CLASS}>
                {t.friends.tabBlocked}
                <Tabs.Indicator className={TAB_INDICATOR_CLASS} />
              </Tabs.Tab>
              {/* L'onglet « Ajouter » était piloté par un bouton hors de la
                  liste : la clé sélectionnée ne correspondait alors à aucun
                  onglet de la collection. */}
              <Tabs.Tab id="add" className="sr-only">
                {t.friends.tabAdd}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <div className="ml-auto shrink-0">
            <Button size="sm" variant={tab === 'add' ? 'primary' : 'secondary'} onPress={() => setTab('add')}>
              <UserPlus className="size-3.5" />
              <span className="hidden sm:inline">{t.friends.people.addFriendButton}</span>
              <span className="sm:hidden">{t.friends.tabAdd}</span>
            </Button>
          </div>
        </header>

        {/* Recherche — masquée sur l'onglet « Ajouter », qui a son propre champ */}
        {tab !== 'add' && (
          <div className="shrink-0 px-4 pt-3">
            <SearchField value={query} onChange={setQuery} aria-label={t.friends.searchPlaceholder}>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder={t.friends.searchPlaceholder} />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </div>
        )}

        <Tabs.Panel id="online" className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <SectionLabel className="mb-1.5 px-3">
            {tx(t.friends.onlineCount, { n: online.length })}
          </SectionLabel>
          <div className="flex flex-col gap-0.5">
            {online.map((u) => (
              <FriendRow key={u.id} user={u} onMessage={onMessage} />
            ))}
          </div>
          {online.length === 0 && (
            <EmptyState
              icon={videRecherche ? Search : Users}
              title={videRecherche ? t.friends.noResults : t.friends.noOneOnline}
              description={videRecherche ? t.friends.noResultsHint : t.friends.people.onlineEmptyDesc}
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel id="all" className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {filtered.length === 0 ? (
            <EmptyState
              icon={videRecherche ? Search : Users}
              title={videRecherche ? t.friends.noResults : t.friends.noFriends}
              description={videRecherche ? t.friends.noResultsHint : t.friends.addFriendsHint}
              actionLabel={videRecherche ? undefined : t.friends.people.addFriendButton}
              onAction={videRecherche ? undefined : () => setTab('add')}
            />
          ) : (
            <>
              <SectionLabel className="mb-1.5 px-3">
                {tx(t.friends.onlineCount, { n: online.length })}
              </SectionLabel>
              <div className="flex flex-col gap-0.5">
                {online.map((u) => (
                  <FriendRow key={u.id} user={u} onMessage={onMessage} />
                ))}
              </div>
              {offline.length > 0 && (
                <>
                  <SectionLabel className="mt-4 mb-1.5 px-3">
                    {tx(t.friends.offlineCount, { n: offline.length })}
                  </SectionLabel>
                  <div className="flex flex-col gap-0.5 opacity-60">
                    {offline.map((u) => (
                      <FriendRow key={u.id} user={u} onMessage={onMessage} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </Tabs.Panel>

        <Tabs.Panel id="pending" className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <SectionLabel className="mb-1.5 px-3">
            {tx(t.friends.people.pendingCount, { n: pending.length })}
          </SectionLabel>
          {pending.length === 0 ? (
            <EmptyState icon={MailCheck} title={t.friends.noRequests} description={t.friends.upToDate} />
          ) : (
            <div className="flex flex-col gap-0.5">
              {pending.map(({ requestId, user, direction }) => (
                <div
                  key={requestId || user.id}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-secondary"
                >
                  <AlfyAvatar name={user.displayName} avatarUrl={user.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.displayName}</p>
                    <p className="truncate text-xs text-muted">
                      {direction === 'incoming'
                        ? t.friends.people.requestReceived
                        : t.friends.people.requestSent}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {direction === 'incoming' && (
                      <Tooltip delay={300}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          aria-label={tx(t.friends.people.acceptRequestFrom, { name: user.displayName })}
                          className="rounded-full bg-surface-tertiary text-success"
                          onPress={() => onAccept?.(requestId)}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Tooltip.Content>
                          <p>{t.friends.accept}</p>
                        </Tooltip.Content>
                      </Tooltip>
                    )}
                    <Tooltip delay={300}>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        aria-label={
                          direction === 'incoming'
                            ? tx(t.friends.people.declineRequestFrom, { name: user.displayName })
                            : tx(t.friends.people.cancelRequestTo, { name: user.displayName })
                        }
                        className="rounded-full bg-surface-tertiary text-muted hover:text-danger"
                        onPress={() => onDecline?.(requestId)}
                      >
                        <X className="size-4" />
                      </Button>
                      <Tooltip.Content>
                        <p>{direction === 'incoming' ? t.friends.decline : t.common.cancel}</p>
                      </Tooltip.Content>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tabs.Panel>

        <Tabs.Panel id="blocked" className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <SectionLabel className="mb-1.5 px-3">
            {tx(t.friends.blockedCount, { n: blocked.length })}
          </SectionLabel>
          {blocked.length === 0 ? (
            <EmptyState icon={Ban} title={t.friends.noBlocked} description={t.friends.blockedListEmpty} />
          ) : (
            <div className="flex flex-col gap-0.5">
              {blocked.map((u) => (
                <div
                  key={u.id}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-secondary"
                >
                  <AlfyAvatar name={u.displayName} avatarUrl={u.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.displayName}</p>
                    <p className="truncate text-xs text-muted">@{u.username}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    onPress={() => {
                      onUnblock?.(u.id);
                      toast(t.friends.unblocked, { description: u.displayName });
                    }}
                  >
                    {t.friends.unblock}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Tabs.Panel>

        <Tabs.Panel id="add" className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-md">
            <h3 className="text-base font-bold">{t.friends.findFriends}</h3>
            <p className="mt-1 text-sm text-muted">{t.friends.people.addFriendDesc}</p>
            <form
              className="mt-4 flex items-start gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const pseudo = addName.trim();
                if (!pseudo || sending) return;
                setSending(true);
                try {
                  // `add` peut échouer (pseudo introuvable, déjà amis…) : le
                  // toast doit refléter ce qui s'est réellement passé, pas
                  // s'afficher en succès inconditionnel dès la soumission.
                  const ok = await onAddFriend?.(pseudo);
                  const username = pseudo.replace(/^@/, '');
                  if (ok === false) {
                    toast.danger(t.friends.people.requestFailedTitle, {
                      description: tx(t.friends.people.requestFailedDesc, { username }),
                    });
                  } else {
                    toast(t.friends.requestSent, { description: `@${username}` });
                    setAddName('');
                  }
                } finally {
                  setSending(false);
                }
              }}
            >
              {/* Sans libellé visible, React Aria exige un `aria-label` — sinon
                  le champ part sans nom accessible (avertissement au montage). */}
              <TextField
                value={addName}
                onChange={setAddName}
                aria-label={t.friends.usernamePlaceholder}
                className="flex-1"
              >
                <Input placeholder={t.friends.usernamePlaceholder} autoComplete="off" />
              </TextField>
              <Button type="submit" className="shrink-0" isDisabled={!addName.trim() || sending}>
                <UserPlus className="size-3.5" />
                {sending ? t.friends.sendingRequest : t.friends.sendRequest}
              </Button>
            </form>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
