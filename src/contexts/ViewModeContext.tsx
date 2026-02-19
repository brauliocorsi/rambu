import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type ViewMode = "mobile" | "desktop";

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isMobile: boolean;
  isDesktop: boolean;
  toggleViewMode: () => void;
}

const MOBILE_BREAKPOINT = 768;

const ViewModeContext = createContext<ViewModeContextType>({
  viewMode: "mobile",
  setViewMode: () => {},
  isMobile: true,
  isDesktop: false,
  toggleViewMode: () => {},
});

function detectDeviceMode(): ViewMode {
  return window.innerWidth < MOBILE_BREAKPOINT ? "mobile" : "desktop";
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    // If user manually selected a mode, use it
    const manualOverride = localStorage.getItem("rambu-view-mode-manual");
    if (manualOverride === "true") {
      const saved = localStorage.getItem("rambu-view-mode");
      if (saved === "mobile" || saved === "desktop") return saved;
    }
    // Otherwise auto-detect
    return detectDeviceMode();
  });

  const [isManual, setIsManual] = useState(() => {
    return localStorage.getItem("rambu-view-mode-manual") === "true";
  });

  // Auto-detect on resize only if not manually overridden
  useEffect(() => {
    if (isManual) return;

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setViewModeState(detectDeviceMode());
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [isManual]);

  // Manual mode setter - marks as manually overridden
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    setIsManual(true);
    localStorage.setItem("rambu-view-mode", mode);
    localStorage.setItem("rambu-view-mode-manual", "true");
  };

  const toggleViewMode = () => {
    const newMode = viewMode === "mobile" ? "desktop" : "mobile";
    setViewMode(newMode);
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
