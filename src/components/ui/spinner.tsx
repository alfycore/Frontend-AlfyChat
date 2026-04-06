import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"

const sizeMap = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const;

function Spinner({
  className,
  size,
  color,
  ...props
}: React.ComponentProps<"svg"> & {
  size?: "sm" | "md" | "lg";
  color?: "accent" | "current" | string;
}) {
  return (
    <HugeiconsIcon
      icon={Loading03Icon}
      {...props}
      strokeWidth={2}
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-spin",
        sizeMap[size ?? "sm"],
        color === "current" && "text-current",
        color === "accent" && "text-[var(--accent)]",
        className,
      )}
    />
  )
}

export { Spinner }
