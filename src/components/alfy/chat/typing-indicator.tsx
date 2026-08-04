'use client';

import { useTranslation } from '@/components/locale-provider';

export function TypingIndicator({ names }: { names: string[] }) {
  const { t, tx } = useTranslation();
  if (names.length === 0) return null;
  const label =
    names.length === 1
      ? tx(t.chat.typing, { names: names[0] })
      : names.length === 2
        ? tx(t.chat.typingTwo, { name1: names[0], name2: names[1] })
        : tx(t.chat.typingMultiple, { n: names.length });
  return (
    <div className="flex h-6 items-center gap-2 px-4 text-xs text-muted" role="status" aria-live="polite">
      <span className="flex items-center gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="alfy-typing-dot size-1 rounded-full bg-muted"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
      {label}
    </div>
  );
}
