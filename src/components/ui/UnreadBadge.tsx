import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface UnreadBadgeProps {
  count: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UnreadBadge({ count, size = "md", className }: UnreadBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > 99 ? "99+" : count.toString();

  const sizeClasses = {
    sm: "h-4 min-w-4 text-[10px] px-1",
    md: "h-5 min-w-5 text-xs px-1.5",
    lg: "h-6 min-w-6 text-sm px-2",
  };

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground font-bold",
        sizeClasses[size],
        className
      )}
    >
      {displayCount}
    </motion.span>
  );
}
