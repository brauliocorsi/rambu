import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type ViewMode = "mobile" | "desktop";

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isMobile: boolean;
  isDesktop: boolean;
  toggleViewMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextType>({
  viewMode: "mobile",
  setViewMode: () => {},
  isMobile: true,
  isDesktop: false,
  toggleViewMode: () => {},
});

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("chatflow-view-mode");
    return (saved as ViewMode) || "mobile";
  });

  useEffect(() => {
    localStorage.setItem("chatflow-view-mode", viewMode);
  }, [viewMode]);

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "mobile" ? "desktop" : "mobile"));
  };

  return (
    <ViewModeContext.Provider
      value={{
        viewMode,
        setViewMode,
        isMobile: viewMode === "mobile",
        isDesktop: viewMode === "desktop",
        toggleViewMode,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export const useViewMode = () => useContext(ViewModeContext);
