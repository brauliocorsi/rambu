import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { signStorageUrl, useSignedUrl } from "@/lib/storageUrl";
import { safeOpenExternal } from "@/lib/mediaKind";
import { ImageLightbox } from "@/components/message/ImageLightbox";
import { VideoPlayer } from "@/components/message/VideoPlayer";
import { Image as ImageIcon, Video, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MediaGalleryDialogProps {
  channelId: string | null;
  channelName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = "images" | "videos" | "files";

interface MediaItem {
  id: string;
  url: string;
  name: string;
  type: string;
  createdAt: string;
}

export function MediaGalleryDialog({ channelId, channelName, open, onOpenChange }: MediaGalleryDialogProps) {
  const [tab, setTab] = useState<Tab>("images");
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["channel-media", channelId],
    queryFn: async (): Promise<MediaItem[]> => {
      if (!channelId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("id, file_url, file_name, file_type, created_at")
        .eq("channel_id", channelId)
        .not("file_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || [])
        .filter((m) => m.file_url)
        .map((m) => ({
          id: m.id,
          url: m.file_url as string,
          name: m.file_name || "arquivo",
          type: m.file_type || "",
          createdAt: m.created_at,
        }));
    },
    enabled: open && !!channelId,
    staleTime: 30000,
  });

  const grouped = useMemo(() => {
    const images: MediaItem[] = [];
    const videos: MediaItem[] = [];
    const files: MediaItem[] = [];
    for (const m of items) {
      if (m.type.startsWith("image/")) images.push(m);
      else if (m.type.startsWith("video/")) videos.push(m);
      else files.push(m);
    }
    return { images, videos, files };
  }, [items]);

  const current =
    tab === "images" ? grouped.images : tab === "videos" ? grouped.videos : grouped.files;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Mídia compartilhada{channelName ? ` em #${channelName}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-1 border-b border-border -mx-6 px-6">
            {([
              { id: "images" as Tab, label: "Imagens", icon: ImageIcon, count: grouped.images.length },
              { id: "videos" as Tab, label: "Vídeos", icon: Video, count: grouped.videos.length },
              { id: "files" as Tab, label: "Arquivos", icon: FileText, count: grouped.files.length },
            ]).map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  tab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                <span className="text-xs text-muted-foreground">({count})</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto -mx-6 px-6 pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : current.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Nenhum item nesta categoria.
              </div>
            ) : tab === "images" ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {current.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setLightbox(m)}
                    className="relative aspect-square rounded-lg overflow-hidden bg-secondary hover:opacity-90 transition-opacity"
                  >
                    <GalleryImage
                      url={m.url}
                      name={m.name}
                    />
                  </button>
                ))}
              </div>
            ) : tab === "videos" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {current.map((m) => (
                  <div key={m.id} className="space-y-1">
                    <VideoPlayer url={m.url} name={m.name} type={m.type} />
                    <p className="text-xs text-muted-foreground truncate">
                      {format(new Date(m.createdAt), "PPp", { locale: ptBR })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="space-y-1">
                {current.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => signStorageUrl(m.url).then(safeOpenExternal)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate text-sm">{m.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(m.createdAt), "dd/MM/yy", { locale: ptBR })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {lightbox && (
        <ImageLightbox
          url={lightbox.url}
          name={lightbox.name}
          open={!!lightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

function GalleryImage({ url, name }: { url: string; name: string }) {
  const signed = useSignedUrl(url);
  if (!signed) return <div className="w-full h-full animate-pulse bg-muted" aria-hidden="true" />;
  return (
    <img
      src={signed}
      alt={name}
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover"
    />
  );
}
