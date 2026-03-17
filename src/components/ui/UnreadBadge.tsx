import { cn } from "@/lib/utils";

interface UnreadBadgeProps {
  count: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  pulse?: boolean;
}

export function UnreadBadge({ count, size = "md", className, pulse = false }: UnreadBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > 99 ? "99+" : count.toString();

  const sizeClasses = {
    sm: "h-4 min-w-4 text-[10px] px-1",
    md: "h-5 min-w-5 text-xs px-1.5",
    lg: "h-6 min-w-6 text-sm px-2",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground font-bold animate-scale-in",
        sizeClasses[size],
        pulse && "animate-pulse",
        className
      )}
    >
      {displayCount}
    </span>
  );
}

/** Simple dot indicator for activity */
export function ActivityDot({ className }: { className?: string }) {
  return (
    <span className={cn("block h-2 w-2 rounded-full bg-primary", className)} />
  );
}
