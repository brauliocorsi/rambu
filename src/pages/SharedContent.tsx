import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Share2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "rambu:pending-share";

/**
 * PWA Share Target landing page (manifest action: /share).
 * Stores incoming text/url so the next chosen channel/DM can prefill input.
 */
export default function SharedContent() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [text, setText] = useState("");

  useEffect(() => {
    const title = params.get("title") ?? "";
    const txt = params.get("text") ?? "";
    const url = params.get("url") ?? "";
    const composed = [title, txt, url].filter(Boolean).join("\n").trim();
    setText(composed);
    if (composed) {
      try {
        sessionStorage.setItem(STORAGE_KEY, composed);
      } catch {
        /* noop */
      }
    }
  }, [params]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Conteúdo compartilhado</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Selecione um canal ou DM para enviar:
        </p>
        <pre className="text-xs whitespace-pre-wrap break-words bg-secondary/50 rounded-lg p-3 max-h-48 overflow-auto mb-4">
          {text || "(vazio)"}
        </pre>
        <Button className="w-full" onClick={() => navigate("/")}>
          Escolher destino <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function consumePendingShare(): string | null {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v) sessionStorage.removeItem(STORAGE_KEY);
    return v;
  } catch {
    return null;
  }
}