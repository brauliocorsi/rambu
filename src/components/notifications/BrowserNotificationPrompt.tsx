import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { motion, AnimatePresence } from "framer-motion";

export function BrowserNotificationPrompt() {
  const { isSupported, permission, requestPermission } = useBrowserNotifications();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only show prompt if:
    // 1. Notifications are supported
    // 2. Permission is default (not yet asked)
    // 3. User hasn't dismissed this session
    // 4. Wait a bit before showing to not be intrusive
    if (isSupported && permission === "default" && !dismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission, dismissed]);

  const handleEnable = async () => {
    await requestPermission();
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
  };

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
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">Ativar notificações</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Receba notificações quando alguém enviar uma mensagem, mesmo quando você estiver em outra aba.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="rounded-xl text-xs"
                    onClick={handleEnable}
                  >
                    Ativar
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
