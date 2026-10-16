'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Input, Label, TextField, toast } from '@heroui/react';
import { Copy, Link2, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';

import { api } from '@/lib/api';
import { LINK_HOST, LINK_URL } from '@/lib/domains';
import {
  DateText, EmptyState, PageHeader, RowAction, SectionCard, TableShell, TableSkeleton, Td, Th, Tr,
} from '@/components/alfy/admin/primitives';

interface ShortLink {
  slug: string;
  targetUrl: string;
  clicks: number;
  createdAt: string;
}

export default function AdminLinksPage() {
  const [links, setLinks]     = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [slug, setSlug]         = useState('');
  const [target, setTarget]     = useState('');
  const [editing, setEditing]   = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.getShortLinks();
    if (res.success && res.data) {
      setLinks(res.data);
      setError(null);
    } else {
      setError(res.error ?? 'Impossible de charger les liens.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setSlug(''); setTarget(''); setEditing(null); };

  const submit = async () => {
    if (!target.trim() || (!editing && !slug.trim())) return;
    setSaving(true);
    const res = editing
      ? await api.updateShortLink(editing, target.trim())
      : await api.createShortLink(slug.trim(), target.trim());
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? 'Le lien n’a pas pu être enregistré.');
      return;
    }
    toast(editing ? 'Lien mis à jour' : 'Lien créé', { description: `${LINK_HOST}/${editing ?? slug.trim().toLowerCase()}` });
    resetForm();
    load();
  };

  const remove = async (s: string) => {
    const res = await api.deleteShortLink(s);
    if (!res.success) {
      setError(res.error ?? 'Le lien n’a pas pu être supprimé.');
      return;
    }
    setLinks((prev) => prev.filter((l) => l.slug !== s));
  };

  const copy = (s: string) => {
    void navigator.clipboard.writeText(`${LINK_URL}/${s}`);
    toast('Lien copié', { description: `${LINK_HOST}/${s}` });
  };

  return (
    <>
      <PageHeader
        title="Liens courts"
        description={`Alias ${LINK_HOST}/… qui redirigent vers n’importe quelle page https.`}
      >
        <Button size="sm" variant="secondary" onPress={load} isPending={loading}>
          <RotateCcw className="size-3.5" aria-hidden />
          Actualiser
        </Button>
      </PageHeader>

      {error && (
        <Alert status="danger" className="mb-5">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <SectionCard
        title={editing ? `Modifier ${LINK_HOST}/${editing}` : 'Nouveau lien'}
        description="Les préfixes i, u, b, m, s et api sont réservés."
      >
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
        >
          {!editing && (
            <TextField value={slug} onChange={setSlug} isRequired className="sm:w-56">
              <Label>Slug</Label>
              <Input placeholder="rentree" />
            </TextField>
          )}
          <TextField value={target} onChange={setTarget} isRequired className="flex-1">
            <Label>URL cible</Label>
            <Input placeholder="https://alfychat.com/newsroom/rentree" />
          </TextField>
          <div className="flex gap-2">
            {editing && (
              <Button variant="secondary" onPress={resetForm}>Annuler</Button>
            )}
            <Button type="submit" isPending={saving}>
              <Plus className="size-4" aria-hidden />
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        flush
        title="Liens"
        description={`${links.length} lien${links.length > 1 ? 's' : ''}`}
      >
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : links.length === 0 ? (
          <EmptyState icon={Link2} title="Aucun lien court" />
        ) : (
          <TableShell
            minWidth={680}
            head={
              <>
                <Th>Lien</Th>
                <Th>Cible</Th>
                <Th align="right">Clics</Th>
                <Th>Créé le</Th>
                <Th align="right">Actions</Th>
              </>
            }
          >
            {links.map((l) => (
              <Tr key={l.slug}>
                <Td><span className="font-mono text-sm">{LINK_HOST}/{l.slug}</span></Td>
                <Td><span className="block max-w-xs truncate text-sm text-muted">{l.targetUrl}</span></Td>
                <Td align="right"><span className="text-sm tabular-nums">{l.clicks}</span></Td>
                <Td><DateText value={l.createdAt} /></Td>
                <Td align="right">
                  <div className="flex justify-end gap-1">
                    <RowAction icon={Copy} label="Copier" onPress={() => copy(l.slug)} />
                    <RowAction
                      icon={Pencil}
                      label="Modifier"
                      onPress={() => { setEditing(l.slug); setTarget(l.targetUrl); }}
                    />
                    <RowAction icon={Trash2} label="Supprimer" tone="danger" onPress={() => remove(l.slug)} />
                  </div>
                </Td>
              </Tr>
            ))}
          </TableShell>
        )}
      </SectionCard>
    </>
  );
}
