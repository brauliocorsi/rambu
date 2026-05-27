import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus, Check, Settings, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useWorkspaceFavorites } from "@/hooks/useWorkspaceFavorites";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher() {
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspaceContext();
  const { favorites, toggleFavorite, isFavorite } = useWorkspaceFavorites();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Sort workspaces: favorites first, then alphabetically
  const sortedWorkspaces = [...workspaces].sort((a, b) => {
    const aFav = isFavorite(a.id);
    const bFav = isFavorite(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return a.name.localeCompare(b.name);
  });

  if (!currentWorkspace && workspaces.length === 0) {
    return (
      <>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="w-full justify-start gap-3 h-14 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <div className="h-8 w-8 rounded-md bg-primary-foreground/15 flex items-center justify-center">
            <Plus className="h-5 w-5" />
          </div>
          <span className="font-medium">Criar primeiro workspace</span>
        </Button>
        <CreateWorkspaceDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
      </>
    );
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[hsl(var(--sidebar-accent))]/70 hover:bg-[hsl(var(--sidebar-accent))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 rounded-md ring-1 ring-primary/50">
              <AvatarImage src={currentWorkspace?.icon_url || undefined} />
              <AvatarFallback className="rounded-md bg-primary text-primary-foreground font-semibold tracking-tight">
                {currentWorkspace?.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1">
                <p className="font-semibold text-[14px] tracking-tight truncate text-sidebar-accent-foreground">
                  {currentWorkspace?.name}
                </p>
                {currentWorkspace && isFavorite(currentWorkspace.id) && (
                  <Star className="h-3 w-3 text-[hsl(var(--rambu-warning))] fill-[hsl(var(--rambu-warning))]" />
                )}
              </div>
              <p className="text-[11px] text-[hsl(var(--sidebar-foreground))]/60">
                {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <ChevronDown
            className={cn("h-4 w-4 text-[hsl(var(--sidebar-foreground))]/70 transition-transform shrink-0", isOpen && "rotate-180")}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-popover text-popover-foreground rounded-lg shadow-lg-token border border-border overflow-hidden z-50"
            >
              <div className="max-h-64 overflow-y-auto">
                {sortedWorkspaces.map((workspace) => {
                  const workspaceIsFavorite = isFavorite(workspace.id);
                  return (
                    <div
                      key={workspace.id}
                      className={cn(
                        "flex items-center gap-2 hover:bg-accent transition-colors",
                        currentWorkspace?.id === workspace.id && "bg-primary/10"
                      )}
                    >
                      <button
                        onClick={() => {
                          setCurrentWorkspace(workspace);
                          setIsOpen(false);
                        }}
                        className="flex-1 flex items-center gap-3 p-2.5 min-w-0"
                      >
                        <Avatar className="h-8 w-8 rounded-md">
                          <AvatarImage src={workspace.icon_url || undefined} />
                          <AvatarFallback className="rounded-md bg-primary text-primary-foreground text-[12px] font-semibold">
                            {workspace.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-[13.5px] flex-1 text-left truncate">{workspace.name}</span>
                        {currentWorkspace?.id === workspace.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(workspace.id);
                        }}
                        className="p-1.5 mr-2 rounded-md hover:bg-accent transition-colors"
                        aria-label={workspaceIsFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                        title={workspaceIsFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      >
                        <Star 
                          className={cn(
                            "h-4 w-4",
                            workspaceIsFavorite 
                              ? "text-[hsl(var(--rambu-warning))] fill-[hsl(var(--rambu-warning))]" 
                              : "text-muted-foreground"
                          )} 
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border p-2">
                <button
                  onClick={() => {
                    setShowCreateDialog(true);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-accent transition-colors"
                >
                  <div className="h-8 w-8 rounded-md bg-primary/12 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[13.5px] font-medium text-primary">Novo Workspace</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CreateWorkspaceDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
    </>
  );
}
