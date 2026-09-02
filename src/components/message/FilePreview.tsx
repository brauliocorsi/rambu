import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  X,
  Download,
  Eye,
  AlertCircle,
  ExternalLink,
  FileSpreadsheet,
  FileArchive,
  File as FileIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "./AudioPlayer";
import { ImageLightbox } from "./ImageLightbox";
import { VideoPlayer } from "./VideoPlayer";
import { getMediaKind, safeOpenExternal, type MediaKind } from "@/lib/mediaKind";

interface FilePreviewProps {
  url: string;
  name: string;
  type: string;
  onRemove?: () => void;
  compact?: boolean;
}

export function FilePreview({ url: rawUrl, name, type, onRemove, compact = false }: FilePreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgState, setImgState] = useState<"loading" | "loaded" | "error">("loading");
  const url = useSignedUrl(rawUrl);
  const kind: MediaKind = getMediaKind(type, name, rawUrl);


  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("fetch failed");
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
      safeOpenExternal(url);
    }
  };

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    safeOpenExternal(url);
  };

  // Sem URL → estado de erro genérico
  if (!url) {
    return (
      <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl max-w-[250px] text-sm">
        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
        <span className="text-muted-foreground truncate">Anexo indisponível</span>
      </div>
    );
  }

  if (kind === "audio") {
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

  if (kind === "video") {
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

  if (kind === "image") {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "relative group rounded-xl overflow-hidden cursor-pointer border-2 border-border",
            compact ? "max-w-[200px]" : "max-w-[300px]"
          )}
          onClick={() => !onRemove && imgState !== "error" && setLightboxOpen(true)}
          onTouchStart={(e) => e.stopPropagation()}
          role={!onRemove ? "button" : undefined}
          aria-label={!onRemove ? `Abrir imagem ${name}` : undefined}
        >
          {imgState === "error" ? (
            <div className="flex flex-col items-center justify-center gap-2 p-4 bg-secondary text-center" style={{ minHeight: compact ? 120 : 180 }}>
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-xs text-muted-foreground">Não foi possível carregar a imagem</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleOpenExternal} aria-label="Abrir em nova aba">
                  <ExternalLink className="h-3 w-3 mr-1" /> Abrir
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownload} aria-label="Baixar arquivo">
                  <Download className="h-3 w-3 mr-1" /> Baixar
                </Button>
              </div>
            </div>
          ) : (
            <>
              {imgState === "loading" && (
                <div
                  className="absolute inset-0 animate-pulse bg-muted"
                  aria-hidden="true"
                />
              )}
              <img
                src={url}
                alt={name}
                className="w-full h-auto rounded-xl object-cover"
                style={{ maxHeight: compact ? "150px" : "250px" }}
                loading="lazy"
                onLoad={() => setImgState("loaded")}
                onError={() => setImgState("error")}
              />
            </>
          )}
          
          {/* Overlay with actions */}
          {imgState !== "error" && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
            {!onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors pointer-events-auto"
                title="Visualizar"
                aria-label="Visualizar imagem"
              >
                <Eye className="h-4 w-4 text-white" />
              </button>
            )}
            <button
              onClick={handleDownload}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors pointer-events-auto"
              title="Baixar"
              aria-label="Baixar imagem"
            >
              <Download className="h-4 w-4 text-white" />
            </button>
          </div>
          )}

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
              aria-label="Remover anexo"
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

  // PDF / document / unknown — card uniforme
  const isPDF = kind === "pdf";
  const isDoc = kind === "document";
  const ext = (name.split(".").pop() || "").toLowerCase();
  const Icon = isPDF
    ? FileText
    : ext === "csv" || ["xls", "xlsx", "ods"].includes(ext)
      ? FileSpreadsheet
      : ["zip", "rar", "7z", "tar", "gz"].includes(ext)
        ? FileArchive
        : isDoc
          ? FileText
          : FileIcon;
  const label = isPDF ? "PDF" : ext.toUpperCase() || (type.split("/").pop() || "Arquivo").toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex items-center gap-3 p-3 bg-secondary rounded-xl max-w-[280px]"
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className={cn(
        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
        isPDF ? "bg-red-500/20" : "bg-primary/20"
      )}>
        <Icon className={cn("h-5 w-5", isPDF ? "text-red-500" : "text-primary")} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>

      <button
        onClick={handleOpenExternal}
        className="p-1.5 hover:bg-background rounded-lg transition-colors shrink-0"
        title="Abrir em nova aba"
        aria-label={`Abrir ${name} em nova aba`}
      >
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      </button>
      <button
        onClick={handleDownload}
        className="p-1.5 hover:bg-background rounded-lg transition-colors shrink-0"
        title="Baixar"
        aria-label={`Baixar ${name}`}
      >
        <Download className="h-4 w-4 text-muted-foreground" />
      </button>

      {onRemove && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute -top-1 -right-1 h-5 w-5 bg-destructive hover:bg-destructive/90 text-white rounded-full"
          onClick={onRemove}
          aria-label="Remover anexo"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </motion.div>
  );
}
