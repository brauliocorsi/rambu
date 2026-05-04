import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Maximize2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VideoPlayerProps {
  url: string;
  name: string;
  type: string;
  compact?: boolean;
  onExpand?: () => void;
}

export function VideoPlayer({ url, name, type, compact = false, onExpand }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

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

  if (error) {
    return (
      <div className="p-3 bg-secondary rounded-xl text-sm">
        <p className="font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground mb-2">Não foi possível reproduzir este vídeo.</p>
        <Button size="sm" variant="outline" onClick={handleDownload}>
          <Download className="h-3 w-3 mr-1" /> Baixar
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative group rounded-xl overflow-hidden bg-black border-2 border-border",
        compact ? "max-w-[240px]" : "max-w-[420px]"
      )}
    >
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        preload="metadata"
        onError={() => setError(true)}
        className="w-full h-auto rounded-xl"
        style={{ maxHeight: compact ? "180px" : "320px" }}
      >
        <source src={url} type={type} />
      </video>

      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onExpand && (
          <button
            onClick={(e) => { e.stopPropagation(); onExpand(); }}
            className="p-1.5 bg-black/60 rounded-lg hover:bg-black/80 transition-colors"
            title="Tela cheia"
          >
            <Maximize2 className="h-3.5 w-3.5 text-white" />
          </button>
        )}
        <button
          onClick={handleDownload}
          className="p-1.5 bg-black/60 rounded-lg hover:bg-black/80 transition-colors"
          title="Baixar"
        >
          <Download className="h-3.5 w-3.5 text-white" />
        </button>
      </div>
    </motion.div>
  );
}