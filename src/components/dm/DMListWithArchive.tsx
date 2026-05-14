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
      const unreadA = unreadCounts[a.id] || 0;
      const unreadB = unreadCounts[b.id] || 0;
      if (unreadA > 0 && unreadB === 0) return -1;
      if (unreadB > 0 && unreadA === 0) return 1;
      const timeA = a.last_message?.created_at || a.created_at || "";
      const timeB = b.last_message?.created_at || b.created_at || "";
      return timeB.localeCompare(timeA);
    });
  const archivedDMs = dms.filter((dm) => archivedIds.includes(dm.id));

  const renderDMItem = (dm: DirectMessage, isArchived: boolean) => {
    const displayName = dm.other_user?.display_name || "Usuário";
    const status = dm.other_user?.status || null;
    const lastSeen = dm.other_user?.last_seen || null;
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
      <motion.div
        key={dm.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative"
      >
        <button
          onClick={() => onSelectDM(dm)}
          className={cn(
            "w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150 relative",
            "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:rounded-r-full before:transition-all",
            isSelected
              ? "bg-dm/10 before:h-6 before:bg-dm"
              : "hover:bg-secondary/70 active:bg-secondary before:h-0",
          )}
        >
          {/* Avatar */}
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

          {/* Content */}
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
        </button>

        {/* Context menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            {isArchived ? (
              <DropdownMenuItem onClick={() => unarchiveDM.mutate({ dmId: dm.id })}>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Restaurar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => archiveDM.mutate({ dmId: dm.id })}>
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
    <div className="space-y-2">
      {/* Active DMs */}
      <div className="space-y-0.5">
        {activeDMs.map((dm) => renderDMItem(dm, false))}

        {activeDMs.length === 0 && (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhuma conversa ativa</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Inicie uma nova conversa</p>
          </div>
        )}
      </div>

      {/* Archived DMs */}
      {archivedDMs.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50"
          >
            {showArchived ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            <Archive className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">
              Arquivadas ({archivedDMs.length})
            </span>
          </button>

          <AnimatePresence>
            {showArchived && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-0.5 mt-1"
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
