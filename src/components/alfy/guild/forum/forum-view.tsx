'use client';

/**
 * Salon forum : liste de sujets (recherche, tri, épinglés / verrouillés), création,
 * page d'un sujet avec ses réponses. Droits appliqués par le service servers :
 * l'auteur modifie son sujet ; MANAGE_MESSAGES épingle, verrouille et supprime.
 * Pas d'évènement temps réel pour les forums : la vue se rafraîchit toutes les 20 s.
 */

import {
  Button,
  Chip,
  Input,
  Label,
  Modal,
  ScrollShadow,
  SearchField,
  Skeleton,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  toast,
} from '@heroui/react';
import { ArrowLeft, Lock, LockOpen, MessageSquare, MessagesSquare, Pencil, Pin, PinOff, Plus, SendHorizontal, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { api, resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/locale-provider';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { AlfyMarkdown } from '@/components/alfy/chat/markdown';
import { EmptyState } from '@/components/alfy/primitives/empty-state';
import { useMyPerms } from '@/components/alfy/guild/hooks';

/* ── Données ─────────────────────────────────────────────────────────── */

interface Author {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  locked: boolean;
  replies: number;
  createdAt: string;
  activityAt: string;
  edited: boolean;
  author: Author;
}

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
}

type Raw = Record<string, unknown>;
const s = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const truthy = (v: unknown) => v === true || v === 1 || v === '1';

function tagsOf(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(s).filter(Boolean);
  if (typeof v === 'string' && v.startsWith('[')) {
    try {
      return (JSON.parse(v) as unknown[]).map(s).filter(Boolean);
    } catch {
      return [];
    }
  }
  return [];
}

function authorOf(r: Raw): Author {
  const id = s(r.author_id ?? r.authorId);
  const avatar = s(r.author_avatar_url);
  return { id, name: s(r.author_display_name) || s(r.author_username) || '?', avatarUrl: avatar ? resolveMediaUrl(avatar) : undefined };
}

function toPost(r: Raw): Post {
  const createdAt = s(r.created_at ?? r.createdAt);
  const updatedAt = s(r.updated_at);
  return {
    id: s(r.id),
    title: s(r.title),
    content: s(r.content),
    tags: tagsOf(r.tags),
    pinned: truthy(r.is_pinned),
    locked: truthy(r.is_locked),
    replies: Number(r.reply_count) || 0,
    createdAt,
    activityAt: s(r.last_reply_at) || createdAt,
    // updated_at bouge aussi avec les réponses : on ne marque « modifié » que sans réponse plus récente.
    edited: !!updatedAt && updatedAt !== createdAt && updatedAt !== s(r.last_reply_at) && Date.parse(updatedAt) - Date.parse(createdAt) > 2000,
    author: authorOf(r),
  };
}

const toReply = (r: Raw): Reply => ({ id: s(r.id), content: s(r.content), createdAt: s(r.created_at), author: authorOf(r) });

function useRelative(locale: string) {
  return useCallback(
    (iso: string) => {
      const t = Date.parse(iso);
      if (Number.isNaN(t)) return '';
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      const sec = Math.round((t - Date.now()) / 1000);
      const steps: [Intl.RelativeTimeFormatUnit, number][] = [['second', 60], ['minute', 60], ['hour', 24], ['day', 7], ['week', 4.35], ['month', 12], ['year', Infinity]];
      let v = sec;
      for (const [unit, size] of steps) {
        if (Math.abs(v) < size) return rtf.format(Math.round(v), unit);
        v /= size;
      }
      return '';
    },
    [locale],
  );
}

const REFRESH_MS = 20_000;

/* ── Vue principale ──────────────────────────────────────────────────── */

export function ForumChannelView({ serverId, channelId }: { serverId: string; channelId: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  // Référence stable : PostPage s'en sert dans ses dépendances de chargement.
  const back = useCallback(() => setOpenId(null), []);
  return openId ? (
    <PostPage serverId={serverId} channelId={channelId} postId={openId} onBack={back} />
  ) : (
    <PostList serverId={serverId} channelId={channelId} onOpen={setOpenId} />
  );
}

function PostList({ serverId, channelId, onOpen }: { serverId: string; channelId: string; onOpen: (id: string) => void }) {
  const { t, tx, intlLocale } = useTranslation();
  const f = t.guild.forum;
  const rel = useRelative(intlLocale);
  const perms = useMyPerms(serverId, channelId);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'active' | 'new'>('active');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const res = await api.getForumPosts(serverId, channelId, { limit: 100 });
    if (res.success && Array.isArray(res.data)) {
      setPosts(res.data.map(toPost));
      setFailed(false);
    } else setFailed(true);
  }, [serverId, channelId]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => document.visibilityState === 'visible' && void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (posts ?? []).filter((p) => !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.tags.some((tag) => tag.toLowerCase().includes(q)));
    const key = (p: Post) => Date.parse(sort === 'active' ? p.activityAt : p.createdAt) || 0;
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || key(b) - key(a));
  }, [posts, query, sort]);

  return (
    <ScrollShadow className="alfy-thin-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField aria-label={f.search} value={query} onChange={setQuery} className="min-w-48 flex-1">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={f.search} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ToggleButtonGroup
            aria-label={f.sortActive}
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[sort]}
            onSelectionChange={(k) => setSort(([...k][0] as 'active' | 'new') ?? 'active')}
            size="sm"
          >
            <ToggleButton id="active">{f.sortActive}</ToggleButton>
            <ToggleButton id="new">
              <ToggleButtonGroup.Separator />
              {f.sortNew}
            </ToggleButton>
          </ToggleButtonGroup>
          {perms.can('SEND') && (
            <Button size="sm" onPress={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden /> {f.newPost}
            </Button>
          )}
        </div>

        {posts === null && !failed ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : failed && !posts ? (
          <EmptyState icon={MessagesSquare} title={f.loadFailed} description="" />
        ) : shown.length === 0 ? (
          <EmptyState icon={MessagesSquare} title={query ? f.noResults : f.empty} description={query ? '' : f.emptyDesc} />
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((p, i) => (
              <li key={p.id} className="alfy-enter" style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}>
                <button
                  type="button"
                  onClick={() => onOpen(p.id)}
                  className="group/post flex w-full cursor-pointer flex-col gap-2 rounded-xl bg-surface-secondary px-4 py-3.5 text-left outline-none transition-colors duration-(--dur-1) hover:bg-surface-tertiary focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <span className="flex items-start gap-2">
                    {p.pinned && <Pin className="mt-0.5 size-4 shrink-0 text-accent" aria-label={f.pinned} />}
                    {p.locked && <Lock className="mt-0.5 size-4 shrink-0 text-muted" aria-label={f.locked} />}
                    <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground">{p.title}</span>
                  </span>
                  <span className="line-clamp-2 text-sm leading-relaxed text-muted">{p.content}</span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
                    <span className="flex items-center gap-1.5">
                      <AlfyAvatar name={p.author.name} avatarUrl={p.author.avatarUrl} size="sm" className="size-5" />
                      <span className="text-foreground/80">{p.author.name}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="size-3.5" aria-hidden />
                      {p.replies === 0 ? f.noReply : p.replies === 1 ? f.replyOne : tx(f.replyMany, { n: String(p.replies) })}
                    </span>
                    <span>{tx(f.activity, { when: rel(p.activityAt) })}</span>
                    {p.tags.map((tag) => (
                      <Chip key={tag} size="sm" variant="soft">{tag}</Chip>
                    ))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <NewPostModal
        isOpen={creating}
        onOpenChange={setCreating}
        serverId={serverId}
        channelId={channelId}
        onCreated={(id) => {
          void load();
          onOpen(id);
        }}
      />
    </ScrollShadow>
  );
}

const parseTags = (raw: string) =>
  [...new Set(raw.split(',').map((x) => x.trim().slice(0, 24)).filter(Boolean))].slice(0, 5);

function NewPostModal({
  isOpen,
  onOpenChange,
  serverId,
  channelId,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  serverId: string;
  channelId: string;
  onCreated: (id: string) => void;
}) {
  const { t } = useTranslation();
  const f = t.guild.forum;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || !content.trim() || busy) return;
    setBusy(true);
    const res = await api.createForumPost(serverId, channelId, { title: title.trim(), content: content.trim(), tags: parseTags(tags) });
    setBusy(false);
    if (!res.success || !res.data) {
      toast.danger(f.failed, { description: res.error ?? '' });
      return;
    }
    setTitle('');
    setContent('');
    setTags('');
    onOpenChange(false);
    onCreated(s(res.data.id));
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[560px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{f.newPost}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-4">
            <TextField value={title} onChange={setTitle} maxLength={200} isRequired className="flex flex-col gap-1.5">
              <Label>{f.titleLabel}</Label>
              <Input autoFocus />
            </TextField>
            <TextField value={content} onChange={setContent} maxLength={10000} isRequired className="flex flex-col gap-1.5">
              <Label>{f.contentLabel}</Label>
              <TextArea rows={7} />
            </TextField>
            <TextField value={tags} onChange={setTags} className="flex flex-col gap-1.5">
              <Label>{f.tagsLabel}</Label>
              <Input placeholder="aide, idée, bug" />
              <span className="text-xs text-muted">{f.tagsHint}</span>
            </TextField>
          </Modal.Body>
          <Modal.Footer>
            <Button slot="close" variant="tertiary">{f.cancel}</Button>
            <Button onPress={submit} isPending={busy} isDisabled={!title.trim() || !content.trim()}>{f.publish}</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

/* ── Page d'un sujet ─────────────────────────────────────────────────── */

function PostPage({ serverId, channelId, postId, onBack }: { serverId: string; channelId: string; postId: string; onBack: () => void }) {
  const { t, intlLocale } = useTranslation();
  const f = t.guild.forum;
  const rel = useRelative(intlLocale);
  const { user } = useAuth();
  const perms = useMyPerms(serverId, channelId);
  const moderator = perms.can('MANAGE_MESSAGES');
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([api.getForumPost(serverId, channelId, postId), api.getForumReplies(serverId, channelId, postId)]);
    if (p.success && p.data) setPost(toPost(p.data));
    else if (p.status === 404) onBack();
    if (r.success && Array.isArray(r.data)) setReplies(r.data.map(toReply));
  }, [serverId, channelId, postId, onBack]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => document.visibilityState === 'visible' && void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const isAuthor = !!post && post.author.id === user?.id;
  const canReply = perms.can('SEND') && (!post?.locked || moderator);

  const patch = async (data: Parameters<typeof api.updateForumPost>[3]) => {
    const res = await api.updateForumPost(serverId, channelId, postId, data);
    if (!res.success) {
      toast.danger(f.failed, { description: res.error ?? '' });
      return false;
    }
    await load();
    return true;
  };

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    const res = await api.createForumReply(serverId, channelId, postId, content);
    setSending(false);
    if (!res.success || !res.data) {
      toast.danger(f.failed, { description: res.error ?? '' });
      return;
    }
    setDraft('');
    setReplies((list) => [...(list ?? []), toReply(res.data as Raw)]);
    setPost((p) => (p ? { ...p, replies: p.replies + 1 } : p));
  };

  const removeReply = async (id: string) => {
    const res = await api.deleteForumReply(serverId, channelId, postId, id);
    if (!res.success) return toast.danger(f.failed, { description: res.error ?? '' });
    setReplies((list) => (list ?? []).filter((r) => r.id !== id));
    setPost((p) => (p ? { ...p, replies: Math.max(0, p.replies - 1) } : p));
  };

  const removePost = async () => {
    const res = await api.deleteForumPost(serverId, channelId, postId);
    if (!res.success) return toast.danger(f.failed, { description: res.error ?? '' });
    setConfirmDelete(false);
    onBack();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollShadow className="alfy-thin-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
          <Button variant="ghost" size="sm" className="self-start" onPress={onBack}>
            <ArrowLeft className="size-4" aria-hidden /> {f.back}
          </Button>

          {!post ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-7 w-2/3 rounded-md" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
          ) : (
            <article className="alfy-enter flex flex-col gap-4 rounded-2xl bg-surface-secondary p-5">
              {editing ? (
                <div className="flex flex-col gap-3">
                  <TextField aria-label={f.titleLabel} value={editTitle} onChange={setEditTitle} maxLength={200}>
                    <Input />
                  </TextField>
                  <TextField aria-label={f.contentLabel} value={editContent} onChange={setEditContent} maxLength={10000}>
                    <TextArea rows={7} />
                  </TextField>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="tertiary" onPress={() => setEditing(false)}>{f.cancel}</Button>
                    <Button
                      size="sm"
                      isDisabled={!editTitle.trim() || !editContent.trim()}
                      onPress={async () => (await patch({ title: editTitle.trim(), content: editContent.trim() })) && setEditing(false)}
                    >
                      {f.save}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <header className="flex items-start gap-3">
                    <h2 className="min-w-0 flex-1 text-xl leading-snug font-bold text-foreground">
                      {post.pinned && <Pin className="mr-1.5 inline size-4 align-[-2px] text-accent" aria-label={f.pinned} />}
                      {post.locked && <Lock className="mr-1.5 inline size-4 align-[-2px] text-muted" aria-label={f.locked} />}
                      {post.title}
                    </h2>
                  </header>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <AlfyAvatar name={post.author.name} avatarUrl={post.author.avatarUrl} size="sm" className="size-6" />
                    <span className="font-medium text-foreground/85">{post.author.name}</span>
                    <span>· {rel(post.createdAt)}</span>
                    {post.edited && <span>· {f.edited}</span>}
                  </div>
                  <div className="text-[15px] leading-relaxed text-foreground/90">
                    <AlfyMarkdown content={post.content} isModerator={moderator} />
                  </div>
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => <Chip key={tag} size="sm" variant="soft">{tag}</Chip>)}
                    </div>
                  )}
                  {(isAuthor || moderator) && (
                    <div className="flex flex-wrap gap-1.5">
                      {isAuthor && (
                        <Button size="sm" variant="ghost" onPress={() => { setEditTitle(post.title); setEditContent(post.content); setEditing(true); }}>
                          <Pencil className="size-3.5" aria-hidden /> {f.edit}
                        </Button>
                      )}
                      {moderator && (
                        <>
                          <Button size="sm" variant="ghost" onPress={() => patch({ isPinned: !post.pinned })}>
                            {post.pinned ? <PinOff className="size-3.5" aria-hidden /> : <Pin className="size-3.5" aria-hidden />}
                            {post.pinned ? f.unpin : f.pin}
                          </Button>
                          <Button size="sm" variant="ghost" onPress={() => patch({ isLocked: !post.locked })}>
                            {post.locked ? <LockOpen className="size-3.5" aria-hidden /> : <Lock className="size-3.5" aria-hidden />}
                            {post.locked ? f.unlock : f.lock}
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="text-danger" onPress={() => setConfirmDelete(true)}>
                        <Trash2 className="size-3.5" aria-hidden /> {f.delete}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </article>
          )}

          {post && (
            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-bold tracking-[0.02em] text-muted uppercase">
                {f.repliesTitle} — {post.replies}
              </h3>
              {replies === null ? (
                <Skeleton className="h-16 rounded-xl" />
              ) : (
                <ul className="flex flex-col gap-1">
                  {replies.map((r) => (
                    <li key={r.id} className="group/reply alfy-enter flex gap-3 rounded-xl px-3 py-2.5 transition-colors duration-(--dur-1) hover:bg-foreground/4">
                      <AlfyAvatar name={r.author.name} avatarUrl={r.author.avatarUrl} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-baseline gap-2 text-sm">
                          <span className="font-semibold text-foreground">{r.author.name}</span>
                          <span className="text-xs text-muted">{rel(r.createdAt)}</span>
                        </p>
                        <div className="text-[15px] leading-relaxed text-foreground/90">
                          <AlfyMarkdown content={r.content} isModerator={moderator} />
                        </div>
                      </div>
                      {(r.author.id === user?.id || moderator) && (
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          aria-label={f.deleteReply}
                          className="opacity-0 transition-opacity group-hover/reply:opacity-100 focus-visible:opacity-100"
                          onPress={() => removeReply(r.id)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </ScrollShadow>

      {post && (
        <div className="shrink-0 px-4 pb-5 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            {canReply ? (
              <div className="flex items-end gap-2 rounded-xl bg-surface-secondary p-2">
                <TextField aria-label={f.replyPlaceholder} value={draft} onChange={setDraft} className="flex-1">
                  <TextArea
                    rows={1}
                    placeholder={f.replyPlaceholder}
                    className="max-h-40 min-h-10 resize-none bg-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                  />
                </TextField>
                <Button isIconOnly aria-label={f.send} onPress={send} isPending={sending} isDisabled={!draft.trim()}>
                  <SendHorizontal className="size-4" aria-hidden />
                </Button>
              </div>
            ) : (
              <p className={cn('rounded-xl bg-surface-secondary px-4 py-3 text-center text-sm text-muted')}>
                {post.locked ? f.lockedNote : f.noSendNote}
              </p>
            )}
          </div>
        </div>
      )}

      <Modal.Backdrop isOpen={confirmDelete} onOpenChange={setConfirmDelete}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.Header>
              <Modal.Heading>{f.deletePost}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">{f.deletePostDesc}</p>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">{f.cancel}</Button>
              <Button variant="danger" onPress={removePost}>{f.delete}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
