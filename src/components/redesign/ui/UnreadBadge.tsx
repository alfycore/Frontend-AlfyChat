interface UnreadBadgeProps {
  count: number;
  mention?: boolean;
}

export function UnreadBadge({ count, mention = false }: UnreadBadgeProps) {
  if (count === 0) return null;
  return (
    <span
      className={`flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-accent-fg ${
        mention ? "bg-accent" : "bg-danger"
      }`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
