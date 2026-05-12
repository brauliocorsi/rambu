import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ArrowLeft, ZoomIn, ZoomOut, RotateCw, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useCallback, useState, useRef } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const OVERPAN = 60; // px allowed beyond the natural bounds before clamping

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

  // Active pointers (id -> last position) for multi-touch gestures
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  // Pan baseline (single pointer)
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  // Pinch baseline (two pointers)
  const pinchStart = useRef<{
    distance: number;
    scale: number;
    centerX: number;
    centerY: number;
    ox: number;
    oy: number;
  } | null>(null);
  // Double-tap detection
  const lastTapAt = useRef<number>(0);
  const [isInteracting, setIsInteracting] = useState(false);

  const clampOffset = useCallback(
    (x: number, y: number, s: number) => {
      const container = containerRef.current;
      const img = imgRef.current;
      if (!container || !img) return { x, y };
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      // Rendered (unscaled) image size
      const iw = img.clientWidth;
      const ih = img.clientHeight;
      // Effective scaled size
      const sw = iw * s;
      const sh = ih * s;
      // Max distance the center can travel before an edge crosses container edge
      const maxX = Math.max(0, (sw - cw) / 2) + OVERPAN;
      const maxY = Math.max(0, (sh - ch) / 2) + OVERPAN;
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
      };
    },
    [],
  );

  const reset = useCallback(() => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => setScale((s) => Math.min(s + 0.5, MAX_SCALE)), []);
  const zoomOut = useCallback(() =>
    setScale((s) => {
      const next = Math.max(s - 0.5, MIN_SCALE);
      if (next === MIN_SCALE) setOffset({ x: 0, y: 0 });
      return next;
    }),
  []);

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
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  const handleDoubleClick = () => {
    if (scale > 1) reset();
    else setScale(2.5);
  };

  const distanceBetween = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setIsInteracting(true);

    if (pointers.current.size === 2) {
      const [p1, p2] = Array.from(pointers.current.values());
      pinchStart.current = {
        distance: distanceBetween(p1, p2),
        scale,
        centerX: (p1.x + p2.x) / 2,
        centerY: (p1.y + p2.y) / 2,
        ox: offset.x,
        oy: offset.y,
      };
      panStart.current = null;
    } else if (pointers.current.size === 1) {
      // Double-tap detection (touch only)
      if (e.pointerType === "touch") {
        const now = Date.now();
        if (now - lastTapAt.current < 300) {
          handleDoubleClick();
          lastTapAt.current = 0;
        } else {
          lastTapAt.current = now;
        }
      }
      if (scale > 1) {
        panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Pinch (two pointers)
    if (pointers.current.size >= 2 && pinchStart.current) {
      const [p1, p2] = Array.from(pointers.current.values());
      const newDistance = distanceBetween(p1, p2);
      const ratio = newDistance / pinchStart.current.distance;
      const newScale = Math.min(
        Math.max(pinchStart.current.scale * ratio, MIN_SCALE),
        MAX_SCALE,
      );
      const newCenterX = (p1.x + p2.x) / 2;
      const newCenterY = (p1.y + p2.y) / 2;
      // Pan along with the pinch center movement so the image follows fingers
      const dx = newCenterX - pinchStart.current.centerX;
      const dy = newCenterY - pinchStart.current.centerY;

      setScale(newScale);
      setOffset(clampOffset(pinchStart.current.ox + dx, pinchStart.current.oy + dy, newScale));
      return;
    }

    // Pan (single pointer, only when zoomed in)
    if (panStart.current && scale > 1) {
      setOffset(
        clampOffset(
          panStart.current.ox + (e.clientX - panStart.current.x),
          panStart.current.oy + (e.clientY - panStart.current.y),
          scale,
        ),
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);

    if (pointers.current.size < 2) {
      pinchStart.current = null;
      // If one finger remains, restart pan baseline from it
      if (pointers.current.size === 1 && scale > 1) {
        const [remaining] = Array.from(pointers.current.values());
        panStart.current = { x: remaining.x, y: remaining.y, ox: offset.x, oy: offset.y };
      }
    }
    if (pointers.current.size === 0) {
      panStart.current = null;
      setIsInteracting(false);
      // Snap back if zoomed out below 1 (safety)
      if (scale <= MIN_SCALE) setOffset({ x: 0, y: 0 });
      else setOffset((o) => clampOffset(o.x, o.y, scale));
    }
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
            className="flex items-center justify-between gap-2 p-3 md:p-4 bg-black/70 backdrop-blur-sm safe-top"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-11 w-11 rounded-xl shrink-0"
                onClick={onClose}
                title="Voltar"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <span className="text-white text-sm font-medium truncate">
                {name}
              </span>
            </div>

            {/* Desktop full toolbar */}
            <div className="hidden md:flex items-center gap-2">
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
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-10 w-10 rounded-xl" onClick={handleDownload} title="Baixar">
                <Download className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-10 w-10 rounded-xl" onClick={onClose} title="Fechar">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Mobile: only close (X) on the right; rest goes to bottom bar */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white hover:bg-white/20 h-11 w-11 rounded-xl shrink-0"
              onClick={onClose}
              title="Fechar"
              aria-label="Fechar"
            >
              <X className="h-6 w-6" />
            </Button>
          </motion.div>

          {/* Image */}
          <div
            ref={containerRef}
            className="relative flex-1 flex items-center justify-center p-4 overflow-hidden touch-none select-none"
            onWheel={handleWheel}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ touchAction: "none" }}
          >
            {/* Floating close button — sempre visível em mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden absolute top-3 right-3 z-20 text-white bg-black/60 hover:bg-black/80 backdrop-blur-md h-12 w-12 rounded-full shadow-lg ring-1 ring-white/20"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Fechar"
              aria-label="Fechar"
            >
              <X className="h-6 w-6" />
            </Button>
            <motion.img
              ref={imgRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              src={url}
              alt={name}
              onDoubleClick={handleDoubleClick}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
                cursor: scale > 1 ? (panStart.current ? "grabbing" : "grab") : "zoom-in",
                transition: isInteracting ? "none" : "transform 0.18s ease-out",
                touchAction: "none",
                willChange: "transform",
              }}
              className="max-w-full max-h-full object-contain rounded-lg select-none pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Mobile bottom action bar */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="md:hidden flex items-center justify-around gap-1 p-2 bg-black/70 backdrop-blur-sm safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-11 w-11 rounded-xl" onClick={zoomOut} title="Diminuir zoom" aria-label="Diminuir zoom">
              <ZoomOut className="h-5 w-5" />
            </Button>
            <span className="text-white text-xs w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-11 w-11 rounded-xl" onClick={zoomIn} title="Aumentar zoom" aria-label="Aumentar zoom">
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-11 w-11 rounded-xl" onClick={() => setRotation((r) => r + 90)} title="Girar" aria-label="Girar">
              <RotateCw className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-11 w-11 rounded-xl" onClick={reset} title="Tamanho original" aria-label="Tamanho original">
              <Maximize className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-11 w-11 rounded-xl" onClick={handleDownload} title="Baixar" aria-label="Baixar">
              <Download className="h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
