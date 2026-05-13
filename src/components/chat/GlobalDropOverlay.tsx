import { useEffect, useState, useRef } from "react";
import { Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function GlobalDropOverlay({ enabled }: { enabled: boolean }) {
  const [dragging, setDragging] = useState(false);
  const counter = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types || []).includes("Files");

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      counter.current += 1;
      setDragging(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
    };
    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      counter.current = Math.max(0, counter.current - 1);
      if (counter.current === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      counter.current = 0;
      setDragging(false);
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        window.dispatchEvent(
          new CustomEvent<File[]>("rambu:drop-files", { detail: files })
        );
      }
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [enabled]);

  return (
    <AnimatePresence>
      {dragging && enabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-primary/15 backdrop-blur-[2px]" />
          <div className="relative m-6 px-8 py-10 rounded-3xl border-2 border-dashed border-primary bg-background/95 shadow-2xl flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <p className="text-lg font-semibold">Solte para enviar</p>
            <p className="text-sm text-muted-foreground">Imagens, vídeos, áudios e documentos · até 5 por vez</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
