"use client";

import { useState } from "react";
import { SearchField } from "@heroui/react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const CATEGORIES: { id: string; label: string; icon: string; emojis: string[] }[] = [
  {
    id: "smileys", label: "Smileys", icon: "😀",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","😶","😐","😑","😬","🙄","😯","😴","🤤","😪","😵","🤯","🤠","🥳","😎","🤓","🧐"],
  },
  {
    id: "gestures", label: "Gestes", icon: "👍",
    emojis: ["👍","👎","👌","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖","👋","🤝","🙏","💪","🦾","👏","🙌","👐","🤲","🫶","❤️","🔥","✨","⭐","🎉","🎊","💯","✅","❌"],
  },
  {
    id: "animals", label: "Animaux", icon: "🐶",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🐝","🦋","🐢","🐙","🦄","🐳","🐬","🐠"],
  },
  {
    id: "food", label: "Nourriture", icon: "🍔",
    emojis: ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🥑","🍔","🍟","🍕","🌭","🥪","🌮","🍜","🍣","🍱","🍩","🍪","🎂","🍰","☕","🍺","🍷"],
  },
  {
    id: "objects", label: "Objets", icon: "💻",
    emojis: ["💻","🖥️","⌨️","🖱️","📱","💡","🔋","🔌","🎮","🕹️","📷","🎧","🎤","🎸","🚀","✈️","🚗","⚽","🏀","🎯","🏆","🎁","📚","✏️","📌","🔒","💎","💰","⏰","🌍"],
  },
];

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState(CATEGORIES[0].id);

  const allEmojis = CATEGORIES.flatMap((c) => c.emojis);
  const active = CATEGORIES.find((c) => c.id === cat)!;
  const list = query ? allEmojis : active.emojis;

  return (
    <div className="flex h-80 w-72 flex-col overflow-hidden rounded-2xl bg-overlay shadow-xl shadow-black/30 ring-1 ring-sep">
      {/* Search */}
      <div className="p-2.5 pb-1.5">
        <SearchField aria-label="Rechercher un emoji" value={query} onChange={setQuery}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input autoFocus placeholder="Rechercher…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-2">
        {!query && (
          <p className="px-1 pb-1 pt-1 text-[10px] font-medium uppercase tracking-wider text-muted/50">
            {active.label}
          </p>
        )}
        <div className="grid grid-cols-8 gap-0.5">
          {list.map((e, i) => (
            <button
              key={`${e}-${i}`}
              onClick={() => onSelect(e)}
              className="flex aspect-square items-center justify-center rounded-lg text-lg transition-transform hover:scale-110 hover:bg-surface-2 active:scale-95"
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center justify-around px-2 py-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => { setCat(c.id); setQuery(""); }}
            className={`flex size-8 items-center justify-center rounded-lg text-base transition-all active:scale-90 ${
              cat === c.id && !query ? "opacity-100" : "opacity-40 hover:opacity-80"
            }`}
            aria-label={c.label}
          >
            {c.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
