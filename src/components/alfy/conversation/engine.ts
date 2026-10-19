'use client';

/**
 * Moteur des MP et groupes : chargement, envoi, édition, suppression,
 * réactions — tout passe par le chiffrement de bout en bout et le coffre.
 *
 * Ouverture d'un fil :
 *   1. le coffre local affiche aussitôt les derniers messages déjà lus
 *      (aucune requête, aucun déchiffrement) ;
 *   2. la page réseau arrive, seuls les messages nouveaux ou modifiés sont
 *      déchiffrés, puis rangés dans le coffre ;
 *   3. ce que le serveur ne renvoie plus dans l'intervalle couvert est
 *      supprimé (suppression faite ailleurs).
 *
 * Envoi : le texte est chiffré AVANT de quitter le navigateur (copies `ecdh:`
 * en MP, enveloppe `e2e1:` en groupe). Le message s'affiche tout de suite, en
 * attente ; l'accusé `message:sent` le confirme par son `clientNonce`.
 */

import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { invalidateDmBootstrap, loadDmBootstrap } from '@/lib/dm-bootstrap';
import { userProfileCache } from '@/lib/user-profile-cache';
import { signalService } from '@/lib/signal-service';
import { setPreviewText } from '@/lib/dm-preview-store';
import {
  E2eeSendError,
  cipherSig,
  encryptFor,
  rememberOwnMessage,
  resolveMessages,
  type ConversationTarget,
  type Decoded,
  type RawMessage,
} from '@/lib/e2ee/codec';
import { getPublicKey, keyChangeOf, seedPublicKey } from '@/lib/e2ee/public-keys';
import { vault, type VaultMessage } from '@/lib/e2ee/vault';
import { conversationStore } from '@/components/alfy/conversation/store';
import {
  dmConversationId,
  isLocalId,
  type ChatMessage,
  type ConversationRef,
  type GroupMeta,
  type Reaction,
} from '@/components/alfy/conversation/types';

const PAGE = 50;
const SEND_TIMEOUT_MS = 15_000;
const FRESH_MS = 60_000;

/* ── Utilisateur courant ───────────────────────────────────────────────────── */

let me = '';
export function setEngineUser(id: string) {
  if (id === me) return;
  me = id;
  if (id) void vault.open(id);
}
export const engineUser = () => me;

/* ── Conversions ───────────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Raw = RawMessage & Record<string, any>;

function groupReactions(raw: unknown): Reaction[] {
  if (!Array.isArray(raw)) return [];
  const map = new Map<string, Set<string>>();
  for (const r of raw as { emoji?: string; userId?: string; userIds?: string[] }[]) {
    if (!r?.emoji) continue;
    const set = map.get(r.emoji) ?? new Set<string>();
    if (Array.isArray(r.userIds)) r.userIds.forEach((u) => set.add(u));
    else if (r.userId) set.add(r.userId);
    map.set(r.emoji, set);
  }
  return [...map].map(([emoji, users]) => ({ emoji, userIds: [...users] }));
}

function toChat(raw: Raw, decoded: Decoded, conversationId: string): ChatMessage {
  return {
    id: raw.id,
    conversationId,
    authorId: raw.senderId ?? raw.authorId ?? '',
    content: decoded.content,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    editedAt: raw.isEdited ? raw.updatedAt : undefined,
    replyToId: raw.replyToId ?? undefined,
    reactions: groupReactions(raw.reactions),
    crypto: decoded.crypto,
    lockReason: decoded.reason,
    status: 'sent',
  };
}

const fromVault = (v: VaultMessage): ChatMessage => ({
  id: v.id,
  conversationId: v.conversationId,
  authorId: v.authorId,
  content: v.content,
  createdAt: v.createdAt,
  editedAt: v.editedAt,
  replyToId: v.replyToId,
  reactions: [],
  crypto: 'e2ee',
  status: 'sent',
});

function seedSenders(raws: Raw[]) {
  userProfileCache.seedProfiles(
    raws
      .filter((m) => m.sender?.id)
      .map((m) => ({
        id: m.sender.id as string,
        username: (m.sender.username as string) || '',
        displayName: m.sender.displayName as string | undefined,
        avatarUrl: m.sender.avatarUrl as string | undefined,
      })),
  );
}

/** Déchiffre et convertit un lot de messages bruts d'une même conversation. */
export async function decodeRaw(raws: Raw[], conversationId: string): Promise<ChatMessage[]> {
  const decoded = await resolveMessages(raws, { me, conversationId, allowRatchet: true });
  return raws.map((r) => toChat(r, decoded.get(r.id) ?? { content: '', crypto: 'locked', reason: 'unreadable' }, conversationId));
}

/* ── Groupes ───────────────────────────────────────────────────────────────── */

const groupInflight = new Map<string, Promise<GroupMeta | null>>();

/** Métadonnées d'un groupe (membres = destinataires du chiffrement). */
export function loadGroup(groupId: string, force = false): Promise<GroupMeta | null> {
  const known = conversationStore.get().groups[groupId];
  if (known && !force && Date.now() - known.loadedAt < 5 * 60_000) return Promise.resolve(known);
  const running = groupInflight.get(groupId);
  if (running) return running;
  const p = api
    .getConversation(groupId)
    .then((res) => {
      if (!res.success || !res.data) return known ?? null;
      const d = res.data as Record<string, unknown>;
      const participants = ((d.participants as Record<string, unknown>[]) ?? []).filter(Boolean);
      const roles: Record<string, string> = {};
      const memberIds: string[] = [];
      for (const p of participants) {
        const id = (p.userId ?? p.id) as string | undefined;
        if (!id) continue;
        memberIds.push(id);
        if (p.role) roles[id] = String(p.role);
      }
      userProfileCache.seedProfiles(
        participants
          .filter((p) => p.userId ?? p.id)
          .map((p) => ({
            id: (p.userId ?? p.id) as string,
            username: (p.username as string) || '',
            displayName: (p.displayName ?? p.display_name) as string | undefined,
            avatarUrl: (p.avatarUrl ?? p.avatar_url) as string | undefined,
          })),
      );
      const meta: GroupMeta = {
        id: groupId,
        name: (d.name as string) || '',
        avatarUrl: (d.avatarUrl ?? d.avatar_url) as string | undefined,
        ownerId: (d.ownerId ?? d.owner_id) as string | undefined,
        isOpen: d.isOpen !== false && d.is_open !== false,
        memberIds,
        roles,
        loadedAt: Date.now(),
      };
      conversationStore.setGroup(meta);
      return meta;
    })
    .catch(() => known ?? null)
    .finally(() => groupInflight.delete(groupId));
  groupInflight.set(groupId, p);
  return p;
}

/* ── Chargement d'un fil ───────────────────────────────────────────────────── */

const threadInflight = new Map<string, Promise<void>>();

export function refOf(conversationId: string): ConversationRef | null {
  if (conversationId.startsWith('dm_')) {
    const m = /^dm_([0-9a-f-]{36})_([0-9a-f-]{36})$/i.exec(conversationId);
    if (!m || !me) return null;
    const peerId = m[1] === me ? m[2] : m[1];
    return { kind: 'dm', conversationId, peerId };
  }
  return { kind: 'group', conversationId };
}

export const dmRef = (peerId: string): ConversationRef => ({ kind: 'dm', conversationId: dmConversationId(me, peerId), peerId });

async function fetchPage(ref: ConversationRef, before?: string): Promise<Raw[]> {
  const res =
    ref.kind === 'dm'
      ? await api.getMessages(undefined, ref.peerId, PAGE, before)
      : await api.getMessages(ref.conversationId, undefined, PAGE, before);
  if (!res.success) throw new Error(res.error || 'MESSAGES_UNAVAILABLE');
  return ((res.data as Raw[]) ?? []).filter((m) => m?.id);
}

/** Ouvre (ou resynchronise) un fil. Sans effet si déjà frais. */
export function openThread(ref: ConversationRef, force = false): Promise<void> {
  const id = ref.conversationId;
  const current = conversationStore.thread(id);
  if (!force && current.status === 'ready' && !current.fromVault && Date.now() - (current.syncedAt ?? 0) < FRESH_MS) {
    return Promise.resolve();
  }
  const running = threadInflight.get(id);
  if (running) return running;

  const p = (async () => {
    if (me) await vault.open(me);
    if (current.status === 'idle' || current.status === 'error') {
      conversationStore.patchThread(id, { status: 'loading', error: undefined });
      const cached = await vault.recent(id, PAGE);
      if (cached.length && conversationStore.thread(id).messages.length === 0) {
        conversationStore.mergeMessages(id, cached.map(fromVault), { status: 'ready', fromVault: true, hasMore: true });
      }
    }
    if (ref.kind === 'group') void loadGroup(id);

    let raws: Raw[] | null = null;
    if (ref.kind === 'dm') {
      // L'amorçage du fil porte déjà la première page et la clé du contact.
      const boot = await loadDmBootstrap(ref.peerId).catch(() => null);
      const bundle = boot?.keyBundle as { ecdhKey?: string } | undefined;
      if (bundle?.ecdhKey) seedPublicKey(ref.peerId, bundle.ecdhKey);
      if (!force && boot?.messages?.length) raws = boot.messages as unknown as Raw[];
    }
    raws ??= await fetchPage(ref);
    seedSenders(raws);
    const page = await decodeRaw(raws, id);

    // Supprimés ailleurs : présents ici (coffre), absents de l'intervalle renvoyé.
    const pageIds = new Set(page.map((m) => m.id));
    const oldest = page.reduce<string | null>((o, m) => (!o || m.createdAt < o ? m.createdAt : o), null);
    const complete = raws.length < PAGE;
    const gone = conversationStore
      .thread(id)
      .messages.filter((m) => m.status === 'sent' && !pageIds.has(m.id) && (complete || (oldest !== null && m.createdAt >= oldest)))
      .map((m) => m.id);
    if (gone.length) {
      conversationStore.removeMessages(id, gone);
      void vault.remove(gone);
    }
    conversationStore.mergeMessages(id, page, {
      status: 'ready',
      fromVault: false,
      hasMore: !complete,
      syncedAt: Date.now(),
      error: undefined,
    });
    void vault.prune(id);
  })()
    .catch((err: unknown) => {
      const t = conversationStore.thread(id);
      // Hors ligne avec un coffre rempli : on garde l'affichage, signalé.
      conversationStore.patchThread(id, {
        status: t.messages.length ? 'ready' : 'error',
        error: err instanceof Error ? err.message : 'MESSAGES_UNAVAILABLE',
      });
    })
    .finally(() => threadInflight.delete(id));
  threadInflight.set(id, p);
  return p;
}

/** Messages plus anciens : réseau d'abord, puis coffre (messages purgés côté serveur). */
export async function loadOlder(ref: ConversationRef): Promise<void> {
  const id = ref.conversationId;
  const t = conversationStore.thread(id);
  if (t.loadingOlder || !t.hasMore) return;
  const oldest = t.messages.find((m) => m.status === 'sent')?.createdAt;
  if (!oldest) return;
  conversationStore.patchThread(id, { loadingOlder: true });
  try {
    const raws = await fetchPage(ref, oldest).catch(() => [] as Raw[]);
    if (raws.length > 0) {
      seedSenders(raws);
      conversationStore.mergeMessages(id, await decodeRaw(raws, id), { hasMore: raws.length >= PAGE });
      return;
    }
    const archived = await vault.recent(id, PAGE, oldest);
    conversationStore.mergeMessages(id, archived.map(fromVault), { hasMore: archived.length >= PAGE });
  } finally {
    conversationStore.patchThread(id, { loadingOlder: false });
  }
}

/* ── Envoi ─────────────────────────────────────────────────────────────────── */

interface Pending {
  ref: ConversationRef;
  text: string;
  replyToId?: string;
  timer: ReturnType<typeof setTimeout>;
}
const pending = new Map<string, Pending>();
/** Ids confirmés par `message:sent` : leur écho `message:new` est ignoré. */
const confirmedIds = new Set<string>();

const newNonce = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2) + Date.now().toString(36));

async function targetOf(ref: ConversationRef): Promise<ConversationTarget> {
  if (ref.kind === 'dm') return { kind: 'dm', conversationId: ref.conversationId, me, peerId: ref.peerId };
  const meta = await loadGroup(ref.conversationId);
  return { kind: 'group', conversationId: ref.conversationId, me, memberIds: meta?.memberIds ?? [me] };
}

function sendErrorText(err: unknown): string {
  if (err instanceof E2eeSendError) {
    if (err.reason === 'peer-no-key') return 'PEER_NO_KEY';
    if (err.reason === 'no-local-key') return 'NO_LOCAL_KEY';
    return 'NO_RECIPIENT';
  }
  return err instanceof Error ? err.message : 'SEND_FAILED';
}

function markFailed(nonce: string, error: string) {
  const entry = pending.get(nonce);
  if (entry) clearTimeout(entry.timer);
  pending.delete(nonce);
  const found = conversationStore.findByNonce(nonce);
  if (found) conversationStore.patchMessage(found.conversationId, found.message.id, { status: 'failed', error });
}

/** Envoie un message chiffré. Renvoie le nombre de membres qui ne pourront pas le lire (groupe). */
export async function sendMessage(ref: ConversationRef, text: string, replyToId?: string): Promise<number> {
  const content = text.trim();
  if (!content || !me) return 0;
  const nonce = newNonce();
  conversationStore.mergeMessages(ref.conversationId, [
    {
      id: `local:${nonce}`,
      conversationId: ref.conversationId,
      authorId: me,
      content,
      createdAt: new Date().toISOString(),
      replyToId,
      reactions: [],
      crypto: 'e2ee',
      status: 'sending',
      nonce,
    },
  ]);
  const timer = setTimeout(() => markFailed(nonce, 'TIMEOUT'), SEND_TIMEOUT_MS);
  pending.set(nonce, { ref, text: content, replyToId, timer });

  try {
    const enc = await encryptFor(await targetOf(ref), content);
    socketService.sendMessage({
      ...(ref.kind === 'dm' ? { recipientId: ref.peerId } : { conversationId: ref.conversationId }),
      content: enc.content,
      senderContent: enc.senderContent,
      e2eeType: enc.e2eeType,
      replyToId,
      clientNonce: nonce,
    });
    if (ref.kind === 'dm') invalidateDmBootstrap(ref.peerId);
    return enc.skipped.length;
  } catch (err) {
    markFailed(nonce, sendErrorText(err));
    return 0;
  }
}

/** Accusé de la passerelle (`message:sent`). */
export function onMessageSent(data: { message?: Raw; clientNonce?: string }) {
  const raw = data?.message;
  if (!raw?.id) return;
  const conversationId = (raw.conversationId as string) ?? '';
  let nonce = data.clientNonce;
  // Passerelle d'avant `clientNonce` : le plus ancien envoi en attente de ce fil.
  if (!nonce || !pending.has(nonce)) {
    nonce = [...pending.entries()].find(([, p]) => p.ref.conversationId === conversationId)?.[0];
  }
  if (!nonce) return;
  const entry = pending.get(nonce);
  if (!entry) return;
  clearTimeout(entry.timer);
  pending.delete(nonce);
  confirmedIds.add(raw.id);
  const local = conversationStore.findByNonce(nonce)?.message;
  conversationStore.confirmLocal(entry.ref.conversationId, nonce, {
    id: raw.id,
    conversationId: entry.ref.conversationId,
    authorId: me,
    content: entry.text,
    createdAt: (raw.createdAt as string) ?? local?.createdAt ?? new Date().toISOString(),
    replyToId: entry.replyToId,
    reactions: local?.reactions ?? [],
    crypto: 'e2ee',
    status: 'sent',
  });
  void rememberOwnMessage(raw, entry.ref.conversationId, entry.text);
  // L'écho `message:new` est ignoré : l'aperçu de la liste vient d'ici.
  setPreviewText(raw.id, entry.text);
}

/** Erreur d'envoi sans corrélation (limite de débit, blocage…) : le plus ancien envoi échoue. */
export function onSendError(error: string) {
  const oldest = conversationStore.oldestSending();
  if (oldest?.message.nonce) markFailed(oldest.message.nonce, error);
}

/** Échec d'écriture en base après accusé. */
export function onSendFailed(messageId: string) {
  const conv = conversationStore.conversationOf(messageId);
  if (conv) conversationStore.patchMessage(conv, messageId, { status: 'failed', error: 'SAVE_FAILED' });
}

export const wasConfirmedHere = (id: string) => confirmedIds.has(id);
export const hasPendingIn = (conversationId: string) => [...pending.values()].some((p) => p.ref.conversationId === conversationId);

export async function retryMessage(conversationId: string, messageId: string) {
  const t = conversationStore.thread(conversationId);
  const m = t.messages.find((x) => x.id === messageId);
  const ref = refOf(conversationId);
  if (!m || !ref) return;
  conversationStore.removeMessages(conversationId, [messageId]);
  await sendMessage(ref, m.content, m.replyToId);
}

export function discardMessage(conversationId: string, messageId: string) {
  conversationStore.removeMessages(conversationId, [messageId]);
}

/* ── Édition, suppression, réactions ───────────────────────────────────────── */

export async function editMessage(ref: ConversationRef, messageId: string, text: string): Promise<boolean> {
  const content = text.trim();
  const id = ref.conversationId;
  const before = conversationStore.thread(id).messages.find((m) => m.id === messageId);
  if (!before || !content || content === before.content || isLocalId(messageId)) return false;
  conversationStore.patchMessage(id, messageId, { content, editedAt: new Date().toISOString() });
  try {
    const enc = await encryptFor(await targetOf(ref), content);
    socketService.editMessage(messageId, enc.content, id, { senderContent: enc.senderContent, e2eeType: enc.e2eeType });
    // Le texte est connu : le coffre le garde sous l'empreinte du NOUVEAU ciphertext.
    await vault.putMany([
      {
        id: messageId,
        conversationId: id,
        authorId: before.authorId,
        content,
        createdAt: before.createdAt,
        editedAt: new Date().toISOString(),
        replyToId: before.replyToId,
        sig: await cipherSig({ content: enc.content, senderContent: enc.senderContent, e2eeType: enc.e2eeType }),
      },
    ]);
    if (ref.kind === 'dm') invalidateDmBootstrap(ref.peerId);
    return true;
  } catch {
    conversationStore.patchMessage(id, messageId, { content: before.content, editedAt: before.editedAt });
    return false;
  }
}

export function deleteMessage(ref: ConversationRef, messageId: string) {
  const id = ref.conversationId;
  conversationStore.removeMessages(id, [messageId]);
  void vault.remove([messageId]);
  if (isLocalId(messageId)) return;
  socketService.deleteMessage(messageId, id);
  if (ref.kind === 'dm') invalidateDmBootstrap(ref.peerId);
}

export function applyReaction(conversationId: string, messageId: string, userId: string, emoji: string, on: boolean) {
  const m = conversationStore.thread(conversationId).messages.find((x) => x.id === messageId);
  if (!m) return;
  const reactions = m.reactions.map((r) => ({ ...r, userIds: [...r.userIds] }));
  let r = reactions.find((x) => x.emoji === emoji);
  if (on) {
    if (!r) reactions.push((r = { emoji, userIds: [] }));
    if (!r.userIds.includes(userId)) r.userIds.push(userId);
  } else if (r) {
    r.userIds = r.userIds.filter((u) => u !== userId);
  }
  conversationStore.patchMessage(conversationId, messageId, { reactions: reactions.filter((x) => x.userIds.length > 0) });
}

export function toggleReaction(conversationId: string, messageId: string, emoji: string) {
  if (isLocalId(messageId) || !me) return;
  const m = conversationStore.thread(conversationId).messages.find((x) => x.id === messageId);
  const mine = Boolean(m?.reactions.find((r) => r.emoji === emoji)?.userIds.includes(me));
  applyReaction(conversationId, messageId, me, emoji, !mine);
  if (mine) socketService.removeReaction(messageId, emoji, conversationId);
  else socketService.addReaction(messageId, emoji, conversationId);
}

/* ── Récupération d'historique (anciens messages Double Ratchet) ───────────── */

/** Demande à l'autre participant de rechiffrer pour nous ce qu'il sait encore lire. */
export function requestHistory(ref: ConversationRef) {
  if (ref.kind !== 'dm') return;
  socketService.requestE2EEHistory(ref.peerId, ref.conversationId);
}

/** Réponse reçue : on ne garde que ce qui est bien chiffré pour notre clé. */
export async function onHistoryResponse(data: { conversationId?: string; messages?: { id: string; content: string; senderId: string; createdAt: string }[] }) {
  const id = data?.conversationId;
  if (!id || !Array.isArray(data.messages) || !me) return;
  const thread = conversationStore.thread(id);
  const locked = new Map(thread.messages.filter((m) => m.crypto === 'locked').map((m) => [m.id, m]));
  const recovered: VaultMessage[] = [];
  for (const m of data.messages) {
    const target = locked.get(m.id);
    // Seulement des messages qu'on connaît déjà, verrouillés, du bon auteur.
    if (!target || target.authorId !== m.senderId || typeof m.content !== 'string' || !m.content.startsWith('ecdh:')) continue;
    try {
      const text = await signalService.decryptECDH(m.content);
      conversationStore.patchMessage(id, m.id, { content: text, crypto: 'e2ee', lockReason: undefined });
      recovered.push({ id: m.id, conversationId: id, authorId: target.authorId, content: text, createdAt: target.createdAt, sig: 'recovered' });
    } catch {
      /* pas pour nous */
    }
  }
  if (recovered.length) await vault.putMany(recovered);
}

/**
 * L'autre participant nous demande l'historique. On ne rechiffre QUE vers la
 * clé déjà connue de lui : si le serveur en présente une autre (changement de
 * clé non vérifié), on refuse — sinon un serveur malveillant obtiendrait tout
 * l'historique en clair en substituant sa propre clé.
 */
export async function onHistoryRequest(data: { requesterId?: string; conversationId?: string }) {
  const conversationId = data?.conversationId;
  if (!me || typeof conversationId !== 'string') return;
  const ref = refOf(conversationId);
  if (!ref || ref.kind !== 'dm' || data.requesterId !== ref.peerId) return;
  if (keyChangeOf(ref.peerId)) return;
  const peerKey = await getPublicKey(ref.peerId);
  const trusted = vault.ready ? await vault.trustGet(ref.peerId) : null;
  if (!peerKey || !trusted || trusted.ecdhKey !== peerKey) return;

  const raws: Raw[] = [];
  let before: string | undefined;
  for (let i = 0; i < 10; i++) {
    const batch = await fetchPage(ref, before).catch(() => [] as Raw[]);
    raws.push(...batch);
    if (batch.length < PAGE) break;
    before = batch.reduce<string>((o, m) => (!o || (m.createdAt ?? '') < o ? (m.createdAt ?? o) : o), '');
  }
  if (raws.length === 0) return;
  // Le coffre fournit aussi les messages anciens qu'on avait déjà lus une fois.
  const decoded = await resolveMessages(raws, { me, conversationId, allowRatchet: false });
  const out: { id: string; content: string; senderId: string; createdAt: string }[] = [];
  for (const r of raws) {
    const d = decoded.get(r.id);
    if (d?.crypto !== 'e2ee') continue;
    out.push({ id: r.id, content: await signalService.encryptECDH(d.content, peerKey), senderId: r.senderId ?? r.authorId ?? '', createdAt: r.createdAt ?? '' });
  }
  if (out.length) socketService.sendE2EEHistoryResponse(ref.peerId, conversationId, out);
}

/* ── Session ───────────────────────────────────────────────────────────────── */

/** Déconnexion : vider le moteur et le coffre de ce compte. */
export async function resetEngine() {
  for (const p of pending.values()) clearTimeout(p.timer);
  pending.clear();
  confirmedIds.clear();
  conversationStore.reset();
  me = '';
  await vault.wipe();
}
