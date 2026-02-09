import { motion } from "framer-motion";
import { FileText, X, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilePreviewProps {
  url: string;
  name: string;
  type: string;
  onRemove?: () => void;
  compact?: boolean;
}

export function FilePreview({ url, name, type, onRemove, compact = false }: FilePreviewProps) {
  const isImage = type.startsWith("image/");
  const isPDF = type === "application/pdf";
  
  if (isImage) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "relative group rounded-xl overflow-hidden",
          compact ? "max-w-[200px]" : "max-w-[300px]"
        )}
      >
        <img
          src={url}
          alt={name}
          className="w-full h-auto rounded-xl object-cover"
          style={{ maxHeight: compact ? "150px" : "250px" }}
        />
        
        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-white" />
          </a>
          <a
            href={url}
            download={name}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <Download className="h-4 w-4 text-white" />
          </a>
        </div>

        {onRemove && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/70 text-white rounded-full"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </motion.div>
    );
  }

  // Non-image file (PDF, doc, txt)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex items-center gap-3 p-3 bg-secondary rounded-xl max-w-[250px]"
    >
      <div className={cn(
        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
        isPDF ? "bg-red-500/20" : "bg-primary/20"
      )}>
        <FileText className={cn("h-5 w-5", isPDF ? "text-red-500" : "text-primary")} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{name}</p>
        <p className="text-xs text-muted-foreground">
          {isPDF ? "PDF" : type.split("/").pop()?.toUpperCase()}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 hover:bg-background rounded-lg transition-colors"
        >
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </a>
        <a
          href={url}
          download={name}
          className="p-1.5 hover:bg-background rounded-lg transition-colors"
        >
          <Download className="h-4 w-4 text-muted-foreground" />
        </a>
      </div>

      {onRemove && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute -top-1 -right-1 h-5 w-5 bg-destructive hover:bg-destructive/90 text-white rounded-full"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </motion.div>
  );
}
