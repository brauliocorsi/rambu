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
    <div className="space-y-1">
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

        return (
          <motion.button
            key={dm.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelectDM(dm)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
              selectedDM?.id === dm.id ? "bg-primary/10" : "hover:bg-secondary",
              unreadCount > 0 && "font-semibold"
            )}
          >
            <div className="shrink-0">
              <AvatarWithStatus
                status={status}
                lastSeen={lastSeen}
                indicatorSize="sm"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={dm.other_user?.avatar_url || undefined} />
                  <AvatarFallback className="gradient-primary text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </AvatarWithStatus>
            </div>

            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold truncate">{displayName}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {unreadCount > 0 && <UnreadBadge count={unreadCount} size="sm" />}
                  {timeAgo && (
                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground truncate">{lastMessage}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
