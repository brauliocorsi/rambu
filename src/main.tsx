import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Listen for SW updates and notify user
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available - dispatch custom event
          window.dispatchEvent(new CustomEvent('sw-update-available'));
        }
      });
    });
  });

  // Also check for updates periodically (every 60 minutes)
  setInterval(() => {
    navigator.serviceWorker.ready.then((reg) => reg.update());
  }, 60 * 60 * 1000);
}

createRoot(document.getElementById("root")!).render(<App />);
