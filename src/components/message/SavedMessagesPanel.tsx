import { Bookmark } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSavedMessages, useToggleSavedMessage } from "@/hooks/useSavedMessages";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageContent } from "./MessageContent";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Resolved = {
  saveId: string;
  origin: "channel" | "dm" | "group";
  originId: string;
  authorName: string | null;
  content: string;
  created_at: string;
  saved_at: string;
};

export function SavedMessagesPanel({ open, onOpenChange }: Props) {
  const { data: saved, isLoading } = useSavedMessages();
  const toggle = useToggleSavedMessage();
  const [resolved, setResolved] = useState<Resolved[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!open || !saved || saved.length === 0) {
      setResolved([]);
      return;
    }
    let cancel = false;
    (async () => {
      setLoadingDetails(true);
      const out: Resolved[] = [];
      for (const s of saved) {
        let row: any = null;
        let origin: Resolved["origin"] = "channel";
        let originId = "";
        if (s.message_id) {
          const { data } = await supabase
            .from("messages")
            .select("id, content, created_at, channel_id, profile:profiles!messages_user_id_fkey(display_name)")
            .eq("id", s.message_id)
            .maybeSingle();
          row = data;
          origin = "channel";
          originId = data?.channel_id ?? "";
        } else if (s.dm_message_id) {
          const { data } = await supabase
            .from("dm_messages")
            .select("id, content, created_at, dm_id")
            .eq("id", s.dm_message_id)
            .maybeSingle();
          row = data;
          origin = "dm";
          originId = data?.dm_id ?? "";
        } else if (s.group_message_id) {
          const { data } = await supabase
            .from("dm_group_messages")
            .select("id, content, created_at, group_id")
            .eq("id", s.group_message_id)
            .maybeSingle();
          row = data;
          origin = "group";
          originId = data?.group_id ?? "";
        }
        if (row) {
          out.push({
            saveId: s.id,
            origin,
            originId,
            authorName: row.profile?.display_name ?? null,
            content: row.content,
            created_at: row.created_at,
            saved_at: s.saved_at,
          });
        }
      }
      if (!cancel) setResolved(out);
      setLoadingDetails(false);
    })();
    return () => {
      cancel = true;
    };
  }, [open, saved]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bookmark className="h-4 w-4" /> Mensagens salvas
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-4 space-y-2">
          {(isLoading || loadingDetails) && <Skeleton className="h-20 w-full" />}
          {!isLoading && !loadingDetails && resolved.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma mensagem salva. Use o ícone <Bookmark className="inline h-3.5 w-3.5" /> nas mensagens.
            </p>
          )}
          {resolved.map((r) => (
            <div key={r.saveId} className="rounded-lg border border-border p-3 bg-secondary/30 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium text-primary">{r.authorName ?? "Usuário"}</div>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(r.created_at), "dd MMM HH:mm", { locale: ptBR })}
                </span>
              </div>
              <MessageContent content={r.content} className="text-sm" />
              <div className="flex justify-end pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    if (r.origin === "channel") {
                      // we don't store the underlying message id separately; saved entry was matched by id
                      // direct delete via supabase
                      void supabase.from("saved_messages").delete().eq("id", r.saveId).then(() => {
                        setResolved((prev) => prev.filter((p) => p.saveId !== r.saveId));
                      });
                    } else {
                      void supabase.from("saved_messages").delete().eq("id", r.saveId).then(() => {
                        setResolved((prev) => prev.filter((p) => p.saveId !== r.saveId));
                      });
                    }
                  }}
                >
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}