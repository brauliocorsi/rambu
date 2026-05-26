import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScrollToBottomButtonProps {
  visible: boolean;
  onClick: () => void;
  unreadCount?: number;
}

export function ScrollToBottomButton({ visible, onClick, unreadCount = 0 }: ScrollToBottomButtonProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
        >
          <Button
            size="sm"
            className="rounded-full shadow-lg gap-1.5 px-3 h-8"
            onClick={onClick}
          >
            <ArrowDown className="h-3.5 w-3.5" />
            {unreadCount > 0 ? (
              <span className="text-xs">{unreadCount} novas</span>
            ) : (
              <span className="text-xs">Últimas mensagens</span>
            )}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
