import { AnimatePresence, motion } from "framer-motion";
import { WifiOff, Loader2 } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

export function ConnectionBanner() {
  const state = useOnlineStatus();
  if (state === "online") return null;

  const isOffline = state === "offline";
  return (
    <AnimatePresence>
      <motion.div
        key={state}
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "fixed left-1/2 top-2 z-[100] -translate-x-1/2 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur",
          isOffline
            ? "bg-destructive/90 text-destructive-foreground"
            : "bg-amber-500/90 text-white",
        )}
        role="status"
        aria-live="polite"
      >
        {isOffline ? (
          <>
            <WifiOff className="h-3.5 w-3.5" />
            <span>Sem conexão — mensagens serão enviadas ao reconectar</span>
          </>
        ) : (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Reconectando…</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}