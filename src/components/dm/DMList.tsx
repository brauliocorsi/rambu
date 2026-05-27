import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import { AvatarWithStatus } from "@/components/user/OnlineIndicator";
import { DirectMessage } from "@/hooks/useDirectMessages";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DMListProps {
  dms: DirectMessage[];
  selectedDM: DirectMessage | null;
  onSelectDM: (dm: DirectMessage) => void;
  unreadCounts?: Record<string, number>;
}

export function DMList({ dms, selectedDM, onSelectDM, unreadCounts = {} }: DMListProps) {
  return (
    <div className="space-y-px">
      {dms.map((dm, i) => {
        const displayName = dm.other_user?.display_name || "Usuário";
        const status = dm.other_user?.status || null;
        const lastSeen = (dm.other_user as any)?.last_seen || null;
        const lastMessage = dm.last_message?.content || "Nenhuma mensagem";
        const timeAgo = dm.last_message
          ? formatDistanceToNow(new Date(dm.last_message.created_at), {
              addSuffix: true,
              locale: ptBR,
            })
          : "";
        const unreadCount = unreadCounts[dm.id] || 0;
        const isSelected = selectedDM?.id === dm.id;

        return (
          <motion.button
            key={dm.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelectDM(dm)}
            aria-current={isSelected ? "page" : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-2.5 py-2 rounded-md transition-colors duration-150 relative",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:rounded-r-full before:transition-all",
              isSelected
                ? "bg-[hsl(var(--sidebar-accent))] before:h-6 before:bg-primary"
                : "hover:bg-[hsl(var(--sidebar-accent))]/60 before:h-0",
            )}
          >
            <div className="shrink-0 relative">
              <AvatarWithStatus
                status={status}
                lastSeen={lastSeen}
                indicatorSize="sm"
              >
                <Avatar className="h-9 w-9 rounded-md">
                  <AvatarImage src={dm.other_user?.avatar_url || undefined} />
                  <AvatarFallback className="rounded-md bg-primary/15 text-primary text-[13px] font-semibold">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </AvatarWithStatus>
            </div>

            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className={cn(
                  "text-[13.5px] truncate text-[hsl(var(--sidebar-foreground))]",
                  unreadCount > 0 ? "font-semibold text-sidebar-accent-foreground" : "font-normal",
                  isSelected && "text-sidebar-accent-foreground"
                )}>
                  {displayName}
                </span>
                {timeAgo && (
                  <span className={cn(
                    "text-[10.5px] shrink-0 tabular-nums",
                    unreadCount > 0 ? "text-primary font-semibold" : "text-[hsl(var(--sidebar-foreground))]/55"
                  )}>
                    {timeAgo}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 mt-px">
                <p className={cn(
                  "text-[11.5px] truncate",
                  unreadCount > 0 ? "text-[hsl(var(--sidebar-foreground))]/85" : "text-[hsl(var(--sidebar-foreground))]/55"
                )}>
                  {lastMessage}
                </p>
                {unreadCount > 0 && (
                  <UnreadBadge count={unreadCount} size="sm" className="shrink-0" />
                )}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
