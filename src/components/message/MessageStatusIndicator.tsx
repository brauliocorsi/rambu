import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type MessageStatus = "pending" | "uploading" | "failed" | "sent";

interface Props {
  status: MessageStatus | undefined | null;
  onRetry?: () => void;
  className?: string;
}

/**
 * Discreet single-line indicator under a message bubble.
 * Renders nothing when status is "sent" or absent (default behavior preserved).
 */
export function MessageStatusIndicator({ status, onRetry, className }: Props) {
  if (!status || status === "sent") return null;

  if (status === "pending") {
    return (
      <p className={cn("text-[10px] text-muted-foreground/80 mt-0.5 flex items-center gap-1", className)}>
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        Enviando…
      </p>
    );
  }

  if (status === "uploading") {
    return (
      <p className={cn("text-[10px] text-muted-foreground/80 mt-0.5 flex items-center gap-1", className)}>
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        Carregando anexo…
      </p>
    );
  }

  // failed
  return (
    <p className={cn("text-[10px] text-destructive mt-0.5 flex items-center gap-1.5", className)}>
      <AlertCircle className="h-2.5 w-2.5" />
      <span>Falha ao enviar</span>
      {onRetry && (
        <>
          <span className="text-muted-foreground">·</span>
          <button
            type="button"
            onClick={onRetry}
            className="underline underline-offset-2 hover:text-destructive/80 focus:outline-none"
          >
            Tentar novamente
          </button>
        </>
      )}
    </p>
  );
}