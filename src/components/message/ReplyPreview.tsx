import { X, Reply } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Message } from "@/hooks/useMessages";
import { formatMentionsForDisplay } from "@/hooks/useMentions";

interface ReplyPreviewProps {
  message: Message;
  onCancel: () => void;
}

export function ReplyPreview({ message, onCancel }: ReplyPreviewProps) {
  const displayName = message.profile?.display_name || "Usuário";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className="flex items-center gap-2.5 pl-3 pr-2 py-2 bg-secondary/60 border-l-[3px] border-primary rounded-r-xl rounded-l-sm mb-2 shadow-xs-token"
    >
      <Reply className="h-3.5 w-3.5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-primary font-semibold tracking-tight">
          Respondendo a {displayName}
        </p>
        <p className="text-[13px] text-muted-foreground truncate leading-snug">
          {formatMentionsForDisplay(message.content)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-lg shrink-0 hover:bg-background/60 active:scale-95 transition-transform"
        onClick={onCancel}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  );
}
