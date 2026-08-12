/**
 * Jeu d'emoji complet (Unicode 15, ~1870 emoji) — chargé à la demande depuis
 * @emoji-mart/data (dataset JSON pur, sans UI) pour ne pas alourdir le bundle
 * initial : seul l'ouverture du picker déclenche le téléchargement.
 */

/** Stable category id — the UI translates this to a localized label via `t.chatui.emojiPicker.categories`. */
export type EmojiCategoryId = 'people' | 'nature' | 'foods' | 'activity' | 'places' | 'objects' | 'symbols' | 'flags';

export interface EmojiSection {
  category: EmojiCategoryId;
  emojis: string[];
}

interface EmojiMartSkin {
  native: string;
}
interface EmojiMartEmoji {
  skins: EmojiMartSkin[];
}
interface EmojiMartCategory {
  id: string;
  emojis: string[];
}
interface EmojiMartData {
  categories: EmojiMartCategory[];
  emojis: Record<string, EmojiMartEmoji>;
}

let cached: EmojiSection[] | null = null;
let pending: Promise<EmojiSection[]> | null = null;

export function loadEmojiSet(): Promise<EmojiSection[]> {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;
  pending = import('@emoji-mart/data/sets/15/native.json').then((mod) => {
    const data = (mod.default ?? mod) as unknown as EmojiMartData;
    const sections = data.categories.map((cat) => ({
      category: cat.id as EmojiCategoryId,
      emojis: cat.emojis
        .map((id) => data.emojis[id]?.skins?.[0]?.native)
        .filter((e): e is string => Boolean(e)),
    }));
    cached = sections;
    return sections;
  });
  return pending;
}

// ── Emoji récemment utilisés (localStorage, par navigateur) ────────────────
const RECENT_KEY = 'alfychat:recent-emojis';
const RECENT_MAX = 32;

export function getRecentEmojis(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function recordRecentEmoji(emoji: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getRecentEmojis().filter((e) => e !== emoji);
    const next = [emoji, ...current].slice(0, RECENT_MAX);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Stockage indisponible (navigation privée…) — pas bloquant.
  }
}
