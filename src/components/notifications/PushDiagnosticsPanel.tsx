import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { CheckCircle2, XCircle, AlertTriangle, Send, RefreshCw, BellOff, Bell, Smartphone } from "lucide-react";
import { toast } from "sonner";

function Row({ label, ok, value }: { label: string; ok?: boolean | null; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {ok === true && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
        {ok === false && <XCircle className="h-3.5 w-3.5 text-destructive" />}
        <span className="font-mono text-foreground">{value}</span>
      </div>
    </div>
  );
}

export function PushDiagnosticsPanel() {
  const { diag, loading, subscribe, unsubscribe, sendTestPush, refresh } = usePushSubscription();
  const [busy, setBusy] = useState(false);

  const handleActivate = async () => {
    setBusy(true);
    const r = await subscribe();
    setBusy(false);
    if (r.ok) toast.success("Push ativado neste dispositivo");
    else toast.error(`Não foi possível ativar: ${r.reason}`);
  };

  const handleDeactivate = async () => {
    setBusy(true);
    const ok = await unsubscribe();
    setBusy(false);
    if (ok) toast.success("Push desativado neste dispositivo");
    else toast.error("Falha ao desativar");
  };

  const handleTest = async () => {
    setBusy(true);
    const r = await sendTestPush();
    setBusy(false);
    if (r.ok) toast.success("Notificação de teste enviada");
    else toast.error(`Falha: ${r.detail}`);
  };

  return (
    <Card className="p-4 rounded-2xl space-y-3 border-dashed">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Diagnóstico de Push</h4>
        </div>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={refresh}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {diag.blockerReason && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">{diag.blockerReason}</p>
        </div>
      )}

      <div className="divide-y divide-border/50">
        <Row label="Service Worker suportado" ok={diag.serviceWorkerSupported} value={diag.serviceWorkerSupported ? "sim" : "não"} />
        <Row label="PushManager suportado" ok={diag.pushManagerSupported} value={diag.pushManagerSupported ? "sim" : "não"} />
        <Row label="Notification API" ok={diag.notificationSupported} value={diag.notificationSupported ? "sim" : "não"} />
        <Row label="Permissão" ok={diag.permission === "granted"} value={String(diag.permission)} />
        <Row label="SW ativo" ok={diag.swActive} value={diag.swActive ? "sim" : "não"} />
        <Row label="Subscription" ok={diag.hasSubscription} value={diag.hasSubscription ? "registrada" : "ausente"} />
        <Row label="Plataforma" value={diag.platform} />
        <Row label="iOS" value={diag.isIOS ? "sim" : "não"} />
        <Row label="Standalone (PWA)" ok={diag.isIOS ? diag.isStandalone : undefined} value={diag.isStandalone ? "sim" : "não"} />
      </div>

      {diag.endpoint && (
        <div className="text-[10px] text-muted-foreground break-all font-mono bg-muted/40 rounded-lg p-2">
          {diag.endpoint.slice(0, 80)}…
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {!diag.hasSubscription && (
          <Button size="sm" className="rounded-xl flex-1" disabled={!diag.canActivate || busy || loading} onClick={handleActivate}>
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            Ativar push neste dispositivo
          </Button>
        )}
        {diag.hasSubscription && (
          <>
            <Button size="sm" variant="outline" className="rounded-xl flex-1" onClick={handleTest} disabled={busy}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Enviar notificação de teste
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={handleDeactivate} disabled={busy}>
              <BellOff className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {diag.hasSubscription && (
        <Badge variant="secondary" className="text-[10px]">
          Push ativo — você receberá notificações com o app fechado
        </Badge>
      )}
    </Card>
  );
}