'use client';

/**
 * Menu contextuel global (clic droit / appui long / touche Menu).
 *
 * HeroUI v3 n'a pas de ContextMenu : on réutilise son `Dropdown`, ancré sur un
 * déclencheur invisible placé à l'endroit du clic. Un seul menu existe dans
 * l'application ; chaque élément décrit le sien sous forme de données
 * (`MenuSection[]`), ce qui garde les mêmes rendus, raccourcis et
 * comportements partout — salons, catégories, serveurs, membres.
 */

import { Description, Dropdown, Header, Kbd, Label, Separator } from '@heroui/react';
import { Check, type LucideIcon } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/locale-provider';

export interface MenuAction {
  kind?: 'item';
  id: string;
  label: string;
  icon?: LucideIcon;
  description?: string;
  danger?: boolean;
  /** Mise en avant (« Inviter des gens » en accent, comme Discord). */
  accent?: boolean;
  disabled?: boolean;
  shortcut?: string;
  onAction: () => void;
}

export interface MenuCheck {
  kind: 'check';
  id: string;
  label: string;
  icon?: LucideIcon;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
}

export interface MenuSubmenu {
  kind: 'submenu';
  id: string;
  label: string;
  icon?: LucideIcon;
  description?: string;
  disabled?: boolean;
  sections: MenuSection[];
}

export type MenuEntry = MenuAction | MenuCheck | MenuSubmenu;

export interface MenuSection {
  id: string;
  title?: string;
  items: (MenuEntry | false | null | undefined)[];
}

type Point = { x: number; y: number };

interface ContextMenuApi {
  /** Ouvre le menu au point de l'évènement (ou au centre de la cible au clavier). */
  open: (event: ReactMouseEvent | MouseEvent | Point, sections: MenuSection[]) => void;
  close: () => void;
}

const ContextMenuContext = createContext<ContextMenuApi | null>(null);

export function useContextMenu(): ContextMenuApi {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) throw new Error('useContextMenu must be used within ContextMenuProvider');
  return ctx;
}

/**
 * Raccourci : `{...bindContextMenu(() => sections)}` sur un élément ajoute le
 * clic droit ET l'appui long tactile (500 ms), comme l'app mobile Discord.
 */
export function useBindContextMenu() {
  const menu = useContextMenu();
  return useCallback(
    (build: () => MenuSection[]) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let start: Point | null = null;
      const clear = () => {
        if (timer) clearTimeout(timer);
        timer = null;
      };
      return {
        onContextMenu: (e: ReactMouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          menu.open(e, build());
        },
        onTouchStart: (e: React.TouchEvent) => {
          const t = e.touches[0];
          start = { x: t.clientX, y: t.clientY };
          clear();
          timer = setTimeout(() => {
            if (start) menu.open(start, build());
            navigator.vibrate?.(10);
          }, 500);
        },
        onTouchMove: (e: React.TouchEvent) => {
          const t = e.touches[0];
          if (start && Math.hypot(t.clientX - start.x, t.clientY - start.y) > 8) clear();
        },
        onTouchEnd: clear,
        onTouchCancel: clear,
      };
    },
    [menu],
  );
}

function pointOf(event: ReactMouseEvent | MouseEvent | Point): Point {
  if ('clientX' in event) {
    // Touche Menu / Maj+F10 : pas de coordonnées, on vise la cible.
    if (event.clientX === 0 && event.clientY === 0 && event.target instanceof Element) {
      const r = event.target.getBoundingClientRect();
      return { x: r.left + Math.min(24, r.width / 2), y: r.top + r.height / 2 };
    }
    return { x: event.clientX, y: event.clientY };
  }
  return event;
}

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [isOpen, setOpen] = useState(false);
  /* Un second clic droit pendant que le menu est ouvert : on le referme puis
     on le rouvre à la nouvelle position au frame suivant (sinon le popover
     garderait son ancrage d'origine). */
  const reopen = useRef<number | null>(null);

  const open = useCallback((event: ReactMouseEvent | MouseEvent | Point, next: MenuSection[]) => {
    const p = pointOf(event);
    const visible = next.map((s) => ({ ...s, items: s.items.filter(Boolean) })).filter((s) => s.items.length);
    if (visible.length === 0) return;
    if (reopen.current) cancelAnimationFrame(reopen.current);
    setOpen(false);
    reopen.current = requestAnimationFrame(() => {
      setPoint(p);
      setSections(visible);
      setOpen(true);
      reopen.current = null;
    });
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const onScroll = () => setOpen(false);
    window.addEventListener('resize', onScroll);
    return () => window.removeEventListener('resize', onScroll);
  }, [isOpen]);

  const api = useMemo(() => ({ open, close }), [open, close]);

  return (
    <ContextMenuContext.Provider value={api}>
      {children}
      <Dropdown isOpen={isOpen} onOpenChange={setOpen}>
        <Dropdown.Trigger
          aria-hidden
          excludeFromTabOrder
          className="pointer-events-none fixed size-px opacity-0"
          style={{ left: point.x, top: point.y }}
        >
          <span />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom start" offset={2} className="min-w-56 max-w-72">
          <MenuBody sections={sections} />
        </Dropdown.Popover>
      </Dropdown>
    </ContextMenuContext.Provider>
  );
}

function ItemContent({ entry }: { entry: MenuEntry }) {
  const Icon = entry.icon;
  return (
    <>
      {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
      <div className="flex min-w-0 flex-1 flex-col">
        <Label className="truncate">{entry.label}</Label>
        {entry.description && <Description className="truncate">{entry.description}</Description>}
      </div>
    </>
  );
}

/**
 * Les sections et les entrées partagent l'espace de clés de la collection
 * React Aria : une section « invite » contenant l'entrée « invite » faisait
 * planter le menu. Les clés de section sont donc préfixées, et les sections
 * vides (droits insuffisants) ne sont pas rendues.
 */
function MenuBody({ sections }: { sections: MenuSection[] }) {
  const { t } = useTranslation();
  const visible = sections
    .map((s) => ({ ...s, items: s.items.filter(Boolean) as MenuEntry[] }))
    .filter((s) => s.items.length > 0);
  return (
    <Dropdown.Menu aria-label={t.guild.menu.aria}>
      {visible.flatMap((section, si) => {
        const nodes: ReactNode[] = [];
        if (si > 0) nodes.push(<Separator key={`§sep:${section.id}:${si}`} />);
        nodes.push(
          <Dropdown.Section key={`§sec:${section.id}`} id={`§sec:${section.id}`}>
            {section.title ? <Header>{section.title}</Header> : null}
            {section.items.map((entry) => renderEntry(entry))}
          </Dropdown.Section>,
        );
        return nodes;
      })}
    </Dropdown.Menu>
  );
}

function renderEntry(entry: MenuEntry): ReactNode {
  if (entry.kind === 'submenu') {
    return (
      <Dropdown.SubmenuTrigger key={entry.id}>
        <Dropdown.Item id={entry.id} textValue={entry.label} isDisabled={entry.disabled}>
          <ItemContent entry={entry} />
          <Dropdown.SubmenuIndicator />
        </Dropdown.Item>
        <Dropdown.Popover className="min-w-52 max-w-72">
          <MenuBody sections={entry.sections} />
        </Dropdown.Popover>
      </Dropdown.SubmenuTrigger>
    );
  }
  if (entry.kind === 'check') {
    return (
      <Dropdown.Item
        key={entry.id}
        id={entry.id}
        textValue={entry.label}
        isDisabled={entry.disabled}
        onAction={() => entry.onToggle(!entry.checked)}
      >
        <ItemContent entry={entry} />
        <span
          aria-hidden
          className={cn(
            'ms-auto flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors duration-(--dur-1)',
            entry.checked ? 'border-accent bg-accent text-accent-foreground' : 'border-border',
          )}
        >
          {entry.checked && <Check className="size-3" strokeWidth={3} />}
        </span>
      </Dropdown.Item>
    );
  }
  return (
    <Dropdown.Item
      key={entry.id}
      id={entry.id}
      textValue={entry.label}
      variant={entry.danger ? 'danger' : undefined}
      isDisabled={entry.disabled}
      onAction={entry.onAction}
      className={entry.accent ? 'text-accent' : undefined}
    >
      <ItemContent entry={entry} />
      {entry.shortcut && (
        <Kbd className="ms-auto" slot="keyboard" variant="light">
          <Kbd.Content>{entry.shortcut}</Kbd.Content>
        </Kbd>
      )}
    </Dropdown.Item>
  );
}

/** Rend un menu déroulant classique (bouton) à partir des mêmes données. */
export function MenuSections({ sections }: { sections: MenuSection[] }) {
  return <MenuBody sections={sections} />;
}
