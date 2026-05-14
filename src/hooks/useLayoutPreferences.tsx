import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";

export type MessageDensity = "compact" | "normal" | "comfortable";
export type InputBarMode = "auto" | "desktop" | "compact";

interface LayoutPreferences {
  slackMode: boolean; // All messages aligned left with day separators
  density: MessageDensity; // Message spacing density
  inputBarMode: InputBarMode; // auto = responsivo, desktop = sempre completo, compact = sempre compacto
}

interface LayoutPreferencesContextType {
  preferences: LayoutPreferences;
  setSlackMode: (enabled: boolean) => void;
  setDensity: (density: MessageDensity) => void;
  setInputBarMode: (mode: InputBarMode) => void;
}

const defaultPreferences: LayoutPreferences = {
  slackMode: false,
  density: "normal",
  inputBarMode: "auto",
};

const LayoutPreferencesContext = createContext<LayoutPreferencesContextType | null>(null);

const STORAGE_KEY = "rambu-layout-preferences";

export function LayoutPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<LayoutPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Back-compat: migrate old desktopInputMode boolean to inputBarMode
        if (parsed && typeof parsed.desktopInputMode === "boolean" && !parsed.inputBarMode) {
          parsed.inputBarMode = parsed.desktopInputMode ? "desktop" : "auto";
        }
        return { ...defaultPreferences, ...parsed };
      }
    } catch (e) {
      console.error("Error loading layout preferences:", e);
    }
    return defaultPreferences;
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.error("Error saving layout preferences:", e);
    }
  }, [preferences]);

  const setSlackMode = useCallback((enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, slackMode: enabled }));
  }, []);

  const setDensity = useCallback((density: MessageDensity) => {
    setPreferences((prev) => ({ ...prev, density }));
  }, []);

  const setInputBarMode = useCallback((mode: InputBarMode) => {
    setPreferences((prev) => ({ ...prev, inputBarMode: mode }));
  }, []);

  return (
    <LayoutPreferencesContext.Provider value={{ preferences, setSlackMode, setDensity, setInputBarMode }}>
      {children}
    </LayoutPreferencesContext.Provider>
  );
}

export function useLayoutPreferences() {
  const context = useContext(LayoutPreferencesContext);
  if (!context) {
    throw new Error("useLayoutPreferences must be used within LayoutPreferencesProvider");
  }
  return context;
}
