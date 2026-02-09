import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";

interface LayoutPreferences {
  slackMode: boolean; // All messages aligned left with day separators
}

interface LayoutPreferencesContextType {
  preferences: LayoutPreferences;
  setSlackMode: (enabled: boolean) => void;
}

const defaultPreferences: LayoutPreferences = {
  slackMode: false,
};

const LayoutPreferencesContext = createContext<LayoutPreferencesContextType | null>(null);

const STORAGE_KEY = "rambu-layout-preferences";

export function LayoutPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<LayoutPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultPreferences, ...JSON.parse(stored) };
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

  return (
    <LayoutPreferencesContext.Provider value={{ preferences, setSlackMode }}>
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
