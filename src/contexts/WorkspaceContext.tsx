import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Workspace, useWorkspaces } from "@/hooks/useWorkspaces";
import { useWorkspaceFavorites } from "@/hooks/useWorkspaceFavorites";

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  workspaces: Workspace[];
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  currentWorkspace: null,
  setCurrentWorkspace: () => {},
  workspaces: [],
  isLoading: true,
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data: workspaces = [], isLoading: workspacesLoading } = useWorkspaces();
  const { favorites, isLoading: favoritesLoading } = useWorkspaceFavorites();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  const isLoading = workspacesLoading || favoritesLoading;

  // Auto-select favorite workspace or first workspace if none selected
  useEffect(() => {
    if (hasAutoSelected || isLoading || workspaces.length === 0) return;

    // Find favorite workspace
    const favoriteWorkspace = workspaces.find(w => favorites.includes(w.id));
    
    if (favoriteWorkspace) {
      setCurrentWorkspace(favoriteWorkspace);
    } else if (!currentWorkspace) {
      // Fallback to first workspace if no favorite
      setCurrentWorkspace(workspaces[0]);
    }
    
    setHasAutoSelected(true);
  }, [workspaces, favorites, isLoading, hasAutoSelected, currentWorkspace]);

  // Reset auto-selection flag when workspaces change significantly
  useEffect(() => {
    if (currentWorkspace && !workspaces.find(w => w.id === currentWorkspace.id)) {
      // Current workspace was removed, reset selection
      setHasAutoSelected(false);
      setCurrentWorkspace(null);
    }
  }, [workspaces, currentWorkspace]);

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        setCurrentWorkspace,
        workspaces,
        isLoading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspaceContext = () => useContext(WorkspaceContext);
