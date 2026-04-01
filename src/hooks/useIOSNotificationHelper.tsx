import { useState, useEffect } from "react";

export function useIOSNotificationHelper() {
  const [isIOS, setIsIOS] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    // Detect PWA (standalone mode)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsPWA(standalone);

    // Check Service Worker readiness
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then(() => setIsServiceWorkerReady(true))
        .catch(() => setIsServiceWorkerReady(false));
    }
  }, []);

  // On iOS, notifications only work inside installed PWA
  const canRequestPermission = isIOS ? isPWA : "Notification" in window;

  return {
    isIOS,
    isPWA,
    isServiceWorkerReady,
    canRequestPermission: !!canRequestPermission,
  };
}
