import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, X, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "./AudioPlayer";
import { ImageLightbox } from "./ImageLightbox";
import { VideoPlayer } from "./VideoPlayer";

interface FilePreviewProps {
  url: string;
  name: string;
  type: string;
  onRemove?: () => void;
  compact?: boolean;
}

export function FilePreview({ url, name, type, onRemove, compact = false }: FilePreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isImage = type.startsWith("image/");
  const isAudio = type.startsWith("audio/");
  const isVideo = type.startsWith("video/");
  const isPDF = type === "application/pdf";

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };
  
  if (isAudio) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <AudioPlayer url={url} compact={compact} />
        
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

  if (isVideo) {
    return (
      <div className="relative">
        <VideoPlayer url={url} name={name} type={type} compact={compact} />
        {onRemove && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute -top-1 -right-1 h-5 w-5 bg-destructive hover:bg-destructive/90 text-white rounded-full z-10"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  if (isImage) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "relative group rounded-xl overflow-hidden cursor-pointer border-2 border-border",
            compact ? "max-w-[200px]" : "max-w-[300px]"
          )}
          onClick={() => !onRemove && setLightboxOpen(true)}
        >
          <img
            src={url}
            alt={name}
            className="w-full h-auto rounded-xl object-cover"
            style={{ maxHeight: compact ? "150px" : "250px" }}
            loading="lazy"
          />
          
          {/* Overlay with actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {!onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                title="Visualizar"
              >
                <Eye className="h-4 w-4 text-white" />
              </button>
            )}
            <button
              onClick={handleDownload}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Baixar"
            >
              <Download className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* File name badge - always visible for compact (upload preview) */}
          {compact && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-[10px] text-white truncate font-medium">
                ✓ {name}
              </p>
            </div>
          )}

          {onRemove && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </motion.div>

        {!onRemove && (
          <ImageLightbox
            url={url}
            name={name}
            open={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </>
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

      <button
        onClick={handleDownload}
        className="p-1.5 hover:bg-background rounded-lg transition-colors shrink-0"
        title="Baixar"
      >
        <Download className="h-4 w-4 text-muted-foreground" />
      </button>

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
