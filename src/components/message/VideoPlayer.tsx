import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Maximize2, Download, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useVideoThumbnail } from "@/hooks/useVideoThumbnail";

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
  const [started, setStarted] = useState(false);
  const thumbnail = useVideoThumbnail(started ? null : url);

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
      {!started ? (
        // Lightweight placeholder: only loads the actual video on user click,
        // so a channel with many videos doesn't trigger N parallel network requests.
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setStarted(true);
            // Wait next tick for <video> to mount, then start playback
            setTimeout(() => videoRef.current?.play().catch(() => {}), 50);
          }}
          className="relative w-full block group/play"
          style={{ aspectRatio: "16 / 9", maxHeight: compact ? "180px" : "320px" }}
          aria-label={`Reproduzir vídeo ${name}`}
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={name}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/play:bg-black/30 transition-colors">
            <div className="h-14 w-14 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg ring-2 ring-white/30">
              <Play className="h-6 w-6 text-black ml-0.5" fill="currentColor" />
            </div>
          </div>
        </button>
      ) : (
        <video
          ref={videoRef}
          src={url}
          controls
          playsInline
          preload="metadata"
          poster={thumbnail || undefined}
          onError={() => setError(true)}
          className="w-full h-auto rounded-xl"
          style={{ maxHeight: compact ? "180px" : "320px" }}
        >
          <source src={url} type={type} />
        </video>
      )}

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