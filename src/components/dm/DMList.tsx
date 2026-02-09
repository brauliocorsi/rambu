import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DirectMessage } from "@/hooks/useDirectMessages";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DMListProps {
  dms: DirectMessage[];
  selectedDM: DirectMessage | null;
  onSelectDM: (dm: DirectMessage) => void;
}

export function DMList({ dms, selectedDM, onSelectDM }: DMListProps) {
  return (
    <div className="space-y-1">
      {dms.map((dm, i) => {
        const displayName = dm.other_user?.display_name || "Usuário";
        const isOnline = dm.other_user?.status === "online";
        const lastMessage = dm.last_message?.content || "Nenhuma mensagem";
        const timeAgo = dm.last_message
          ? formatDistanceToNow(new Date(dm.last_message.created_at), {
              addSuffix: true,
              locale: ptBR,
            })
          : "";

        return (
          <motion.button
            key={dm.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelectDM(dm)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
              selectedDM?.id === dm.id ? "bg-primary/10" : "hover:bg-secondary"
            )}
          >
            <div className="relative shrink-0">
              <Avatar className="h-12 w-12">
                <AvatarImage src={dm.other_user?.avatar_url || undefined} />
                <AvatarFallback className="gradient-primary text-white">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card",
                  isOnline ? "bg-online" : "bg-offline"
                )}
              />
            </div>

            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold truncate">{displayName}</span>
                {timeAgo && (
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{lastMessage}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
