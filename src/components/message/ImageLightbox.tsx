import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ArrowLeft, ZoomIn, ZoomOut, RotateCw, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useCallback, useState, useRef } from "react";

interface ImageLightboxProps {
  url: string;
  name: string;
  open: boolean;
  onClose: () => void;
}

export function ImageLightbox({ url, name, open, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const reset = useCallback(() => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => setScale((s) => Math.min(s + 0.5, 6)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - 0.5, 1)), []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
      if (e.key === "0") reset();
    },
    [onClose, zoomIn, zoomOut, reset]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      reset();
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown, reset]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  const handleDoubleClick = () => {
    if (scale > 1) reset();
    else setScale(2.5);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };
  const handlePointerUp = () => {
    dragStart.current = null;
  };

  const handleDownload = async () => {
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col bg-black/90"
          onClick={onClose}
        >
          {/* Top bar */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between p-3 md:p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10 rounded-xl"
                onClick={onClose}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="text-white text-sm font-medium truncate max-w-[200px] md:max-w-none">
                {name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-10 w-10 rounded-xl" onClick={zoomOut} title="Diminuir zoom">
                <ZoomOut className="h-5 w-5" />
              </Button>
              <span className="text-white text-xs w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-10 w-10 rounded-xl" onClick={zoomIn} title="Aumentar zoom">
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-10 w-10 rounded-xl" onClick={() => setRotation((r) => r + 90)} title="Girar">
                <RotateCw className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-10 w-10 rounded-xl" onClick={reset} title="Tamanho original">
                <Maximize className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10 rounded-xl"
                onClick={handleDownload}
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10 rounded-xl"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>

          {/* Image */}
          <div
            className="flex-1 flex items-center justify-center p-4 overflow-hidden touch-none"
            onWheel={handleWheel}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              src={url}
              alt={name}
              onDoubleClick={handleDoubleClick}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
                cursor: scale > 1 ? (dragStart.current ? "grabbing" : "grab") : "zoom-in",
                transition: dragStart.current ? "none" : "transform 0.15s ease-out",
              }}
              className="max-w-full max-h-full object-contain rounded-lg select-none"
              draggable={false}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
