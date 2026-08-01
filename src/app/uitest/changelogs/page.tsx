import { Chip } from '@heroui/react';

const ENTRIES = [
  {
    version: '0.2.0',
    date: '17 juillet 2026',
    tag: 'Redesign',
    tagColor: 'accent' as const,
    items: ['Nouvelle interface « alfy » complète en HeroUI v3', 'Profils façon carte avec bannière et rôles éditables', 'Sélecteur emoji + GIF repensé'],
  },
  {
    version: '0.1.9',
    date: '3 juillet 2026',
    tag: 'Sécurité',
    tagColor: 'success' as const,
    items: ['Vérification des clés Signal par numéro de sécurité', 'Sessions actives révocables individuellement'],
  },
  {
    version: '0.1.8',
    date: '20 juin 2026',
    tag: 'Fonctionnalités',
    tagColor: 'default' as const,
    items: ['Salons vocaux SFU avec indicateurs de qualité', 'Auto-hébergement : vérification de domaine'],
  },
];

export default function UitestChangelogsPage() {
  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-heading text-2xl font-bold">Nouveautés</h1>
        <p className="mt-1 text-sm text-muted">Ce qui a changé récemment sur AlfyChat.</p>

        <div className="mt-8 flex flex-col gap-8 border-l border-separator pl-6">
          {ENTRIES.map((e) => (
            <div key={e.version} className="relative">
              <span className="absolute top-1 -left-[31px] size-3 rounded-full bg-accent ring-4 ring-background" aria-hidden />
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">v{e.version}</h2>
                <Chip size="sm" color={e.tagColor} variant="soft">{e.tag}</Chip>
                <span className="text-xs text-muted">{e.date}</span>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/85">
                {e.items.map((it) => <li key={it}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
