import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { compressFiles } from "./useImageCompression";

export interface UploadedFile {
  url: string;
  name: string;
  type: string;
}

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
];

export function useFileUpload() {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    if (!user) {
      toast.error("Você precisa estar logado para enviar arquivos");
      return null;
    }

    if (file.size > MAX_SIZE) {
      toast.error(`Arquivo "${file.name}" muito grande. Máximo: 10MB`);
      return null;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`Tipo de arquivo "${file.name}" não suportado`);
      return null;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("message-attachments")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("message-attachments")
        .getPublicUrl(data.path);

      return {
        url: publicUrl,
        name: file.name,
        type: file.type,
      };
    } catch (error: any) {
      toast.error(error.message || `Erro ao fazer upload de "${file.name}"`);
      return null;
    }
  };

  const uploadFiles = async (rawFiles: File[]): Promise<UploadedFile[]> => {
    if (!user) {
      toast.error("Você precisa estar logado para enviar arquivos");
      return [];
    }

    if (rawFiles.length > MAX_FILES) {
      toast.error(`Máximo de ${MAX_FILES} arquivos por vez`);
      return [];
    }

    // Compress images before uploading
    const files = await compressFiles(rawFiles);

    setIsUploading(true);
    setProgress(0);

    const results: UploadedFile[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await uploadFile(file);
      
      if (result) {
        results.push(result);
      }
      
      setProgress(Math.round(((i + 1) / totalFiles) * 100));
    }

    setIsUploading(false);
    setProgress(0);

    return results;
  };

  return { uploadFile, uploadFiles, isUploading, progress, maxFiles: MAX_FILES };
}
