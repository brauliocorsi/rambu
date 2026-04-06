import { useEffect, useState } from "react";
import { Bell, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { useIOSNotificationHelper } from "@/hooks/useIOSNotificationHelper";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function BrowserNotificationPrompt() {
  const { isSupported, permission, requestPermission, sendTestNotification } = useBrowserNotifications();
  const { isIOS, isPWA, canRequestPermission } = useIOSNotificationHelper();
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already granted/denied or dismissed
    if (permission !== "default" || dismissed) return;
    // On iOS without PWA, show install prompt instead
    if (isIOS && !isPWA) {
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => clearTimeout(timer);
    }
    // Normal: show permission prompt
    if (isSupported && canRequestPermission) {
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission, dismissed, isIOS, isPWA, canRequestPermission]);

  const handleEnable = async () => {
    if (isIOS && !isPWA) {
      navigate("/install");
      setShowPrompt(false);
      return;
    }

    if (!canRequestPermission) return;

    const granted = await requestPermission();
    if (granted) {
      sendTestNotification();
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
  };

  const isInstallPrompt = isIOS && !isPWA;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
        >
          <div className="bg-card border border-border rounded-2xl shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                {isInstallPrompt ? (
                  <Download className="h-5 w-5 text-primary" />
                ) : (
                  <Bell className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">
                  {isInstallPrompt ? "Instalar o Rambu" : "Ativar notificações"}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {isInstallPrompt
                    ? "Para receber notificações no iPhone, instale o Rambu na tela inicial."
                    : "Receba notificações quando alguém enviar uma mensagem, mesmo quando você estiver em outra aba."}
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="rounded-xl text-xs"
                    onClick={handleEnable}
                  >
                    {isInstallPrompt ? "Como instalar" : "Ativar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-xl text-xs"
                    onClick={handleDismiss}
                  >
                    Agora não
                  </Button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
