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

const MAX_FILES = 10;
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/heic",
  "image/heif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/3gpp",
  "video/ogg",
];

const ALLOWED_EXTENSIONS = [
  "jpg","jpeg","png","gif","webp","heic","heif","svg",
  "pdf","txt","doc","docx","xls","xlsx",
  "mp3","wav","ogg","m4a","aac","weba",
  "mp4","mov","webm","mkv","avi","3gp","ogv",
];

export function useFileUpload() {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [currentFileName, setCurrentFileName] = useState<string>("");

  const uploadFile = async (
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<UploadedFile | null> => {
    if (!user) {
      toast.error("Você precisa estar logado para enviar arquivos");
      return null;
    }

    if (file.size > MAX_SIZE) {
      toast.error(`Arquivo "${file.name}" muito grande. Máximo: 100MB`);
      return null;
    }

    // Some mobile browsers (Android/iOS câmera) entregam file.type vazio
    // ou genérico — usamos a extensão como fallback antes de bloquear.
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const typeOk = file.type ? ALLOWED_TYPES.includes(file.type) : false;
    const extOk = ext ? ALLOWED_EXTENSIONS.includes(ext) : false;
    if (!typeOk && !extOk) {
      toast.error(`Tipo de arquivo "${file.name}" não suportado`);
      return null;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const path = await uploadWithProgress(fileName, file, onProgress);
      const { data: { publicUrl } } = supabase.storage
        .from("message-attachments")
        .getPublicUrl(path);

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
    setTotalFiles(files.length);
    setCurrentFileIndex(0);
    setCurrentFileName("");

    const results: UploadedFile[] = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFileIndex(i + 1);
      setCurrentFileName(file.name);
      setProgress(0);

      const result = await uploadFile(file, (pct) => {
        // Smooth aggregate: combine completed files + current
        const overall = Math.round(((i + pct / 100) / total) * 100);
        setProgress(overall);
      });

      if (result) {
        results.push(result);
      }

      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setIsUploading(false);
    setProgress(0);
    setTotalFiles(0);
    setCurrentFileIndex(0);
    setCurrentFileName("");

    return results;
  };

  return {
    uploadFile,
    uploadFiles,
    isUploading,
    progress,
    currentFileIndex,
    totalFiles,
    currentFileName,
    maxFiles: MAX_FILES,
  };
}

/** Upload to Supabase Storage via XHR to get real upload progress. */
async function uploadWithProgress(
  path: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken =
    sessionData.session?.access_token ||
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${SUPABASE_URL}/storage/v1/object/message-attachments/${path}`;
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "3600");
    if (file.type) xhr.setRequestHeader("content-type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res.Key?.replace(/^message-attachments\//, "") || path);
        } catch {
          resolve(path);
        }
      } else {
        let msg = "Falha no upload";
        try {
          const res = JSON.parse(xhr.responseText);
          msg = res.message || res.error || msg;
        } catch {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Erro de rede no upload"));
    xhr.send(file);
  });
}
