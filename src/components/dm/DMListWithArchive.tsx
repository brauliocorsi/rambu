import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Archive, ArchiveRestore, ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import { AvatarWithStatus } from "@/components/user/OnlineIndicator";
import { DirectMessage } from "@/hooks/useDirectMessages";
import { useArchivedDMIds, useArchiveDM, useUnarchiveDM } from "@/hooks/useArchivedDMs";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DMListWithArchiveProps {
  dms: DirectMessage[];
  selectedDM: DirectMessage | null;
  onSelectDM: (dm: DirectMessage) => void;
  workspaceId: string;
  unreadCounts?: Record<string, number>;
}

export function DMListWithArchive({
  dms,
  selectedDM,
  onSelectDM,
  workspaceId,
  unreadCounts = {},
}: DMListWithArchiveProps) {
  const [showArchived, setShowArchived] = useState(false);
  const { data: archivedIds = [] } = useArchivedDMIds(workspaceId);
  const archiveDM = useArchiveDM();
  const unarchiveDM = useUnarchiveDM();

  const activeDMs = dms
    .filter((dm) => !archivedIds.includes(dm.id))
    .sort((a, b) => {
      // Prioritize DMs with unread messages
      const unreadA = unreadCounts[a.id] || 0;
      const unreadB = unreadCounts[b.id] || 0;
      if (unreadA > 0 && unreadB === 0) return -1;
      if (unreadB > 0 && unreadA === 0) return 1;
      // Then sort by most recent message
      const timeA = a.last_message?.created_at || a.created_at || "";
      const timeB = b.last_message?.created_at || b.created_at || "";
      return timeB.localeCompare(timeA);
    });
  const archivedDMs = dms.filter((dm) => archivedIds.includes(dm.id));

  const renderDMItem = (dm: DirectMessage, isArchived: boolean) => {
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
      <motion.div
        key={dm.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="group relative"
      >
        <button
          onClick={() => onSelectDM(dm)}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
            selectedDM?.id === dm.id ? "bg-primary/10" : "hover:bg-secondary",
            unreadCount > 0 && "font-semibold"
          )}
        >
          <div className="shrink-0 relative">
            {unreadCount > 0 && <UnreadBadge count={unreadCount} size="sm" className="absolute -top-1 -right-1 z-10" />}
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
                {timeAgo && (
                  <span className="text-xs text-muted-foreground">{timeAgo}</span>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground truncate">{lastMessage}</p>
          </div>
        </button>

        {/* Archive/Unarchive button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isArchived ? (
              <DropdownMenuItem
                onClick={() => unarchiveDM.mutate({ dmId: dm.id })}
              >
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Restaurar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => archiveDM.mutate({ dmId: dm.id })}
              >
                <Archive className="h-4 w-4 mr-2" />
                Arquivar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Active DMs */}
      <div className="space-y-1">
        {activeDMs.map((dm) => renderDMItem(dm, false))}
        
        {activeDMs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma conversa ativa
          </p>
        )}
      </div>

      {/* Archived DMs */}
      {archivedDMs.length > 0 && (
        <div className="space-y-1">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="w-full flex items-center gap-2 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showArchived ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Archive className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Arquivadas ({archivedDMs.length})
            </span>
          </button>

          <AnimatePresence>
            {showArchived && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-1 ml-4"
              >
                {archivedDMs.map((dm) => renderDMItem(dm, true))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
