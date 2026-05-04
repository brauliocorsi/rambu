import { useCallback } from "react";
import { useFileUpload, UploadedFile } from "./useFileUpload";
import { toast } from "sonner";

interface UseFilePasteDropOptions {
  attachedFiles: UploadedFile[];
  onFilesAdded: (files: UploadedFile[]) => void;
}

export function useFilePasteDrop({ attachedFiles, onFilesAdded }: UseFilePasteDropOptions) {
  const { uploadFiles, isUploading, progress, maxFiles, currentFileIndex, totalFiles, currentFileName } = useFileUpload();

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const totalFiles = attachedFiles.length + files.length;
    if (totalFiles > maxFiles) {
      toast.error(`Máximo de ${maxFiles} arquivos por vez`);
      return;
    }

    const uploaded = await uploadFiles(files);
    if (uploaded.length > 0) {
      onFilesAdded(uploaded);
    }
  }, [attachedFiles, maxFiles, uploadFiles, onFilesAdded]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      processFiles(files);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  return { handlePaste, handleDragOver, handleDrop, isUploading, progress, maxFiles, currentFileIndex, totalFiles, currentFileName };
}
