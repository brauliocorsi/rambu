import { useLinkPreview, extractFirstUrl } from "@/hooks/useLinkPreview";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkPreviewCardProps {
  content: string;
  className?: string;
}

export function LinkPreviewCard({ content, className }: LinkPreviewCardProps) {
  const url = extractFirstUrl(content);
  const { data, isLoading } = useLinkPreview(url);

  if (!url) return null;
  if (isLoading || !data || (!data.title && !data.description && !data.image_url)) {
    return null;
  }

  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-2 flex max-w-md gap-3 rounded-xl border border-border bg-secondary/40 p-3 hover:bg-secondary/70 transition-colors overflow-hidden",
        className,
      )}
    >
      {data.image_url && (
        <img
          src={data.image_url}
          alt=""
          loading="lazy"
          className="h-20 w-20 shrink-0 rounded-lg object-cover bg-muted"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          <span className="truncate">{data.site_name || host}</span>
        </div>
        {data.title && (
          <div className="mt-0.5 text-sm font-semibold line-clamp-2">{data.title}</div>
        )}
        {data.description && (
          <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {data.description}
          </div>
        )}
      </div>
    </a>
  );
}