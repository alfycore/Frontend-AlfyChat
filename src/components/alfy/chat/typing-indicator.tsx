export function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const label =
    names.length === 1
      ? `${names[0]} écrit`
      : names.length === 2
        ? `${names[0]} et ${names[1]} écrivent`
        : 'Plusieurs personnes écrivent';
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
      {label}…
    </div>
  );
}
