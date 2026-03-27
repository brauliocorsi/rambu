import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Detect if running in Lovable preview
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

// Listen for SW updates (only in production)
if ('serviceWorker' in navigator && !isPreviewHost && !isInIframe) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('sw-update-available'));
        }
      });
    });
  });

  // Check for updates every 60 minutes
  setInterval(() => {
    navigator.serviceWorker.ready.then((reg) => reg.update());
  }, 60 * 60 * 1000);
}

createRoot(document.getElementById("root")!).render(<App />);
