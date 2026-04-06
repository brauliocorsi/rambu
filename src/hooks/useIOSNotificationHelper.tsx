import { useState, useEffect } from "react";

export function useIOSNotificationHelper() {
  const [isIOS, setIsIOS] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);

  useEffect(() => {
    const displayModeQuery = window.matchMedia("(display-mode: standalone)");

    const syncPlatformState = () => {
      const ua = navigator.userAgent;
      const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const standalone = displayModeQuery.matches || (navigator as any).standalone === true;

      setIsIOS(ios);
      setIsPWA(standalone);
    };

    syncPlatformState();

    // Check Service Worker readiness
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then(() => setIsServiceWorkerReady(true))
        .catch(() => setIsServiceWorkerReady(false));
    }

    displayModeQuery.addEventListener("change", syncPlatformState);
    document.addEventListener("visibilitychange", syncPlatformState);

    return () => {
      displayModeQuery.removeEventListener("change", syncPlatformState);
      document.removeEventListener("visibilitychange", syncPlatformState);
    };
  }, []);

  // On iOS, notifications only work inside installed PWA
  const canRequestPermission = "Notification" in window && (isIOS ? isPWA && isServiceWorkerReady : true);

  return {
    isIOS,
    isPWA,
    isServiceWorkerReady,
    canRequestPermission: !!canRequestPermission,
  };
}
