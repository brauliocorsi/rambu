import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  tone?: "default" | "channel" | "dm" | "group";
  size?: "sm" | "md" | "lg";
}

const toneClasses: Record<NonNullable<EmptyStateProps["tone"]>, string> = {
  default: "bg-primary/8 text-primary",
  channel: "bg-channel/10 text-channel",
  dm: "bg-dm/10 text-dm",
  group: "bg-group/10 text-group",
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  tone = "default",
  size = "md",
}: EmptyStateProps) {
  const iconSize = size === "sm" ? "h-12 w-12" : size === "lg" ? "h-20 w-20" : "h-16 w-16";
  const iconInner = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-9 w-9" : "h-7 w-7";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-10 animate-fade-in",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "rounded-2xl flex items-center justify-center mb-4 shadow-xs-token ring-1 ring-border/50",
            iconSize,
            toneClasses[tone],
          )}
        >
          <Icon className={cn(iconInner)} strokeWidth={1.75} />
        </div>
      )}
      <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}