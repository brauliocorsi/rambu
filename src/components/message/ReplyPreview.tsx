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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border-l-2 border-primary rounded-r-lg mb-2"
    >
      <Reply className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-primary font-medium">
          Respondendo a {displayName}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {formatMentionsForDisplay(message.content)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-lg shrink-0"
        onClick={onCancel}
      >
        <X className="h-3 w-3" />
      </Button>
    </motion.div>
  );
}
