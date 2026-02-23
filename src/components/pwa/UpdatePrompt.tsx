import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const UpdatePrompt = () => {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    const handler = () => setShowUpdate(true);
    window.addEventListener("sw-update-available", handler);
    return () => window.removeEventListener("sw-update-available", handler);
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {showUpdate && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] w-[90vw] max-w-md"
        >
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-lg">
            <RefreshCw className="h-5 w-5 shrink-0 text-primary" />
            <p className="flex-1 text-sm text-foreground">
              Nova versão disponível!
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUpdate(false)}
              >
                Depois
              </Button>
              <Button size="sm" onClick={handleReload}>
                Atualizar
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdatePrompt;
