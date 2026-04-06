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
const VIEW_MODE_KEY = "rambu-view-mode";
const VIEW_MODE_MANUAL_KEY = "rambu-view-mode-manual";

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

function getStoredManualMode(): ViewMode | null {
  try {
    if (sessionStorage.getItem(VIEW_MODE_MANUAL_KEY) !== "true") return null;
    const savedMode = sessionStorage.getItem(VIEW_MODE_KEY);
    return savedMode === "mobile" || savedMode === "desktop" ? savedMode : null;
  } catch {
    return null;
  }
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    return getStoredManualMode() ?? detectDeviceMode();
  });

  const [isManual, setIsManual] = useState(() => {
    return getStoredManualMode() !== null;
  });

  useEffect(() => {
    try {
      localStorage.removeItem(VIEW_MODE_KEY);
      localStorage.removeItem(VIEW_MODE_MANUAL_KEY);
    } catch {
      // Ignore storage cleanup issues
    }
  }, []);

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

    try {
      sessionStorage.setItem(VIEW_MODE_KEY, mode);
      sessionStorage.setItem(VIEW_MODE_MANUAL_KEY, "true");
    } catch {
      // Ignore storage errors
    }
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
