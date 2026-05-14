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
    <div className="space-y-0.5">
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
            className={cn(
              "w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150 relative",
              "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:rounded-r-full before:transition-all",
              isSelected
                ? "bg-dm/10 before:h-6 before:bg-dm"
                : "hover:bg-secondary/70 active:bg-secondary before:h-0",
            )}
          >
            <div className="shrink-0 relative">
              <AvatarWithStatus
                status={status}
                lastSeen={lastSeen}
                indicatorSize="sm"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={dm.other_user?.avatar_url || undefined} />
                  <AvatarFallback className="gradient-primary text-white text-sm">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </AvatarWithStatus>
            </div>

            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className={cn(
                  "text-sm font-medium truncate",
                  unreadCount > 0 && "font-bold text-foreground",
                  isSelected && "text-dm"
                )}>
                  {displayName}
                </span>
                {timeAgo && (
                  <span className={cn(
                    "text-[11px] shrink-0",
                    unreadCount > 0 ? "text-primary font-medium" : "text-muted-foreground/70"
                  )}>
                    {timeAgo}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className={cn(
                  "text-xs truncate",
                  unreadCount > 0 ? "text-foreground/70" : "text-muted-foreground"
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
