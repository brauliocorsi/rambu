import { Pin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { usePinnedMessages, useTogglePin, type PinScope } from "@/hooks/usePinnedMessages";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageContent } from "./MessageContent";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: PinScope;
  onJump?: (messageId: string) => void;
}

export function PinnedMessagesPanel({ open, onOpenChange, scope, onJump }: Props) {
  const { data, isLoading } = usePinnedMessages(open ? scope : null);
  const unpin = useTogglePin(scope);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Pin className="h-4 w-4" /> Mensagens fixadas
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-4 space-y-2">
          {isLoading && <Skeleton className="h-20 w-full" />}
          {!isLoading && (!data || data.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma mensagem fixada ainda.
            </p>
          )}
          {data?.map((m: any) => (
            <div
              key={m.id}
              className="rounded-lg border border-border p-3 bg-secondary/30 space-y-1.5 group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium text-primary">
                  {m.profile?.display_name ?? "Usuário"}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(m.pinned_at), "dd MMM HH:mm", { locale: ptBR })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => unpin.mutate({ messageId: m.id, currentlyPinned: true })}
                    title="Desafixar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <button
                type="button"
                className="text-left w-full"
                onClick={() => {
                  onJump?.(m.id);
                  onOpenChange(false);
                }}
              >
                <MessageContent content={m.content} className="text-sm" />
              </button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}