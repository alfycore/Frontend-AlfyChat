'use client';

import { Button, Card, Chip, SearchField, TagGroup, Tag, toast } from '@heroui/react';
import { Check, Compass, Server, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import { SERVERS, userById } from '@/components/alfy/mock/data';
import { TrustBadges } from '@/components/alfy/primitives/trust-badges';

const CATEGORIES = ['Toutes', 'Communauté', 'Développement', 'Auto-hébergement', 'Jeux'];

const initials = (name: string) =>
  name.split(/\s+/).filter((p) => /\w/.test(p)).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export function DiscoverView() {
  const [query, setQuery] = useState('');
  const [joined, setJoined] = useState<Set<string>>(new Set());

  const publicServers = useMemo(
    () => SERVERS.filter((s) => s.isPublic && s.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="alfy-enter mb-6">
          <div className="flex items-center gap-2">
            <Compass className="size-6 text-accent" aria-hidden />
            <h1 className="text-xl font-bold">Découvrir des serveurs</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            Rejoignez des communautés publiques hébergées en France ou par leurs membres.
          </p>
        </header>

        <div className="mb-4 flex flex-col gap-3">
          <SearchField value={query} onChange={setQuery} aria-label="Rechercher un serveur">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Rechercher une communauté…" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <TagGroup aria-label="Catégories" selectionMode="single" defaultSelectedKeys={['Toutes']}>
            <TagGroup.List className="gap-1">
              {CATEGORIES.map((c) => (
                <Tag key={c} id={c} textValue={c} className="text-xs">
                  {c}
                </Tag>
              ))}
            </TagGroup.List>
          </TagGroup>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {publicServers.map((s) => {
            const online = s.members.filter((m) => {
              const u = userById(m.userId);
              return u.status !== 'offline' && u.status !== 'invisible';
            }).length;
            const isJoined = joined.has(s.id);
            return (
              <Card key={s.id} className="overflow-hidden">
                <div
                  className="h-16"
                  style={{ backgroundColor: s.selfHosted ? 'var(--alfy-node)' : 'var(--accent)', opacity: 0.85 }}
                />
                <Card.Header className="-mt-6">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-surface text-sm font-bold ring-4 ring-surface">
                    {initials(s.name)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Card.Title className="text-sm">{s.name}</Card.Title>
                    {s.selfHosted && (
                      <Chip size="sm" color="success" variant="soft">
                        <Server className="size-2.5" aria-hidden />
                        <Chip.Label className="text-[10px]">auto-hébergé</Chip.Label>
                      </Chip>
                    )}
                  </div>
                  <Card.Description className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-success" /> {online} en ligne
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3" /> {s.members.length} membres
                    </span>
                  </Card.Description>
                </Card.Header>
                <Card.Footer className="justify-end">
                  <Button
                    size="sm"
                    variant={isJoined ? 'secondary' : 'primary'}
                    isDisabled={isJoined}
                    onPress={() => {
                      setJoined((j) => new Set(j).add(s.id));
                      toast('Serveur rejoint', { description: s.name });
                    }}
                  >
                    {isJoined ? (
                      <>
                        <Check className="size-3.5" /> Rejoint
                      </>
                    ) : (
                      'Rejoindre'
                    )}
                  </Button>
                </Card.Footer>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <TrustBadges compact />
        </div>
      </div>
    </div>
  );
}
