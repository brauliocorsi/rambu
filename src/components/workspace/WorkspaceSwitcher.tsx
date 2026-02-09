import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus, Check, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher() {
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspaceContext();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (!currentWorkspace && workspaces.length === 0) {
    return (
      <>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="w-full justify-start gap-3 h-14 rounded-xl gradient-primary text-white"
        >
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
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
          className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 rounded-xl">
              <AvatarImage src={currentWorkspace?.icon_url || undefined} />
              <AvatarFallback className="rounded-xl gradient-primary text-white font-bold">
                {currentWorkspace?.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="font-semibold text-sm">{currentWorkspace?.name}</p>
              <p className="text-xs text-muted-foreground">
                {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <ChevronDown
            className={cn("h-5 w-5 text-muted-foreground transition-transform", isOpen && "rotate-180")}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl shadow-lg border border-border overflow-hidden z-50"
            >
              <div className="max-h-64 overflow-y-auto">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => {
                      setCurrentWorkspace(workspace);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 hover:bg-secondary transition-colors",
                      currentWorkspace?.id === workspace.id && "bg-primary/10"
                    )}
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={workspace.icon_url || undefined} />
                      <AvatarFallback className="rounded-lg gradient-primary text-white text-sm">
                        {workspace.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm flex-1 text-left">{workspace.name}</span>
                    {currentWorkspace?.id === workspace.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              <div className="border-t border-border p-2">
                <button
                  onClick={() => {
                    setShowCreateDialog(true);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-primary">Novo Workspace</span>
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
