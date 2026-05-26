import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useConversationMessages } from "@/hooks/useConversationMessages";
import { ConversationView } from "@/components/conversation/ConversationView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConversationRef, ConversationType } from "@/types/conversation";

/**
 * Dev-only preview da camada unificada de conversa.
 * Acesso: /dev/conversation-preview (apenas em `import.meta.env.DEV`).
 * Em build de produção a rota redireciona para `/`.
 *
 * NÃO migra nenhum call-site real. Monta `ConversationView` com uma
 * `ConversationRef` arbitrária + painel de diagnóstico mostrando
 * estado de fetch / paginação / realtime ativo. As subscriptions
 * desta página são adicionais (próprias da preview).
 */
export default function ConversationPreviewDev() {
  if (!import.meta.env.DEV) {
    return <Navigate to="/" replace />;
  }

  const [type, setType] = useState<ConversationType>("channel");
  const [id, setId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mounted, setMounted] = useState<ConversationRef | null>(null);

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-muted/40 p-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Tipo</Label>
          <div className="flex gap-1">
            {(["channel", "dm", "group"] as ConversationType[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={type === t ? "default" : "outline"}
                onClick={() => setType(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
          <Label className="text-xs" htmlFor="conv-id">
            ID ({type === "channel" ? "channelId" : type === "dm" ? "dmId" : "groupId"})
          </Label>
          <Input
            id="conv-id"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="UUID da conversa"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <Label className="text-xs" htmlFor="conv-name">
            displayName (opcional)
          </Label>
          <Input
            id="conv-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="ex.: geral"
          />
        </div>
        <Button
          onClick={() =>
            setMounted(
              id
                ? {
                    type,
                    id,
                    displayName: displayName || undefined,
                  }
                : null,
            )
          }
          disabled={!id}
        >
          Montar
        </Button>
        {mounted && (
          <Button variant="outline" onClick={() => setMounted(null)}>
            Desmontar
          </Button>
        )}
      </header>

      <div className="flex-1 min-h-0 flex">
        <aside className="w-72 shrink-0 border-r border-border bg-muted/20 p-3 overflow-y-auto text-xs space-y-2">
          <div className="font-semibold text-sm">Diagnóstico</div>
          {mounted ? (
            <DiagnosticsPanel conversation={mounted} />
          ) : (
            <p className="text-muted-foreground">
              Preencha um ID válido e clique em <strong>Montar</strong>.
            </p>
          )}
          <div className="pt-3 border-t border-border space-y-1">
            <div className="font-semibold">Avisos</div>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li>Esta página cria sua própria subscription. Pode duplicar com o app principal se você estiver na mesma conversa em outra aba.</li>
              <li>Componer envia mensagens reais — use com cuidado.</li>
              <li>Rota disponível apenas em <code>import.meta.env.DEV</code>.</li>
            </ul>
          </div>
        </aside>

        <main className="flex-1 min-w-0 min-h-0 flex flex-col">
          {mounted ? (
            <ConversationView
              key={`${mounted.type}:${mounted.id}`}
              conversation={mounted}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Nada montado.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function DiagnosticsPanel({ conversation }: { conversation: ConversationRef }) {
  const result = useConversationMessages(conversation);
  const { messages, isLoading, isFetchingMore, hasMore } = result;
  const error = (result as { error?: unknown }).error ?? null;

  const last = messages[messages.length - 1];
  const first = messages[0];
  const errMsg = useMemo(() => {
    if (!error) return null;
    return error instanceof Error ? error.message : String(error);
  }, [error]);

  return (
    <div className="space-y-1 font-mono">
      <Row k="type" v={conversation.type} />
      <Row k="id" v={conversation.id} />
      <Row k="displayName" v={conversation.displayName ?? "—"} />
      <Row k="isLoading" v={String(isLoading)} />
      <Row k="isFetchingMore" v={String(isFetchingMore)} />
      <Row k="hasMore" v={String(hasMore)} />
      <Row k="messages" v={String(messages.length)} />
      <Row k="firstId" v={first?.id ?? "—"} />
      <Row k="lastId" v={last?.id ?? "—"} />
      <Row
        k="lastCreatedAt"
        v={last?.createdAt ? new Date(last.createdAt).toLocaleString() : "—"}
      />
      <Row k="realtime" v="ativa (via ConversationMessageList)" />
      {errMsg && (
        <div className="mt-2 text-destructive whitespace-pre-wrap break-words">
          erro: {errMsg}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0">{k}:</span>
      <span className="break-all">{v}</span>
    </div>
  );
}