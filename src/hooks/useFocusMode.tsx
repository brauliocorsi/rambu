import { useEffect, useState, useCallback } from "react";

const KEY = "rambu:focus-mode";

export function useFocusMode() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(KEY) === "1";
  });

  useEffect(() => {
    if (enabled) {
      localStorage.setItem(KEY, "1");
      document.documentElement.classList.add("focus-mode");
    } else {
      localStorage.removeItem(KEY);
      document.documentElement.classList.remove("focus-mode");
    }
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  return { focusMode: enabled, setFocusMode: setEnabled, toggleFocusMode: toggle };
}