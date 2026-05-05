import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TwoFactorSetup({ open, onClose }: Props) {
  const [step, setStep] = useState<"intro" | "qr" | "verify">("intro");
  const [qr, setQr] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const startEnroll = async () => {
    setLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const existing = factors?.totp?.[0];
      if (existing) {
        await supabase.auth.mfa.unenroll({ factorId: existing.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStep("qr");
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar 2FA");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    try {
      const { data: chal, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: chal.id,
        code,
      });
      if (error) throw error;
      toast.success("2FA ativado com sucesso! 🔐");
      onClose();
      setStep("intro");
      setCode("");
    } catch (err: any) {
      toast.error(err.message || "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    setLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const f of factors?.totp ?? []) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      toast.success("2FA desativado");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Autenticação em dois fatores
          </DialogTitle>
          <DialogDescription>
            Adicione uma camada extra de proteção à sua conta usando um app TOTP (Google Authenticator, Authy, 1Password).
          </DialogDescription>
        </DialogHeader>

        {step === "intro" && (
          <div className="space-y-3">
            <Button onClick={startEnroll} disabled={loading} className="w-full rounded-xl">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Configurar 2FA"}
            </Button>
            <Button onClick={disable} variant="outline" disabled={loading} className="w-full rounded-xl">
              <ShieldOff className="h-4 w-4 mr-2" /> Desativar 2FA
            </Button>
          </div>
        )}

        {step === "qr" && (
          <div className="space-y-3 text-center">
            <p className="text-sm">Escaneie o QR code no seu app autenticador:</p>
            <img src={qr} alt="QR Code 2FA" className="mx-auto bg-white p-2 rounded-xl" />
            <p className="text-xs text-muted-foreground break-all">Ou digite o código: <code className="font-mono">{secret}</code></p>
            <Button onClick={() => setStep("verify")} className="w-full rounded-xl">Continuar</Button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-3">
            <p className="text-sm">Digite o código de 6 dígitos do seu app:</p>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="rounded-xl text-center text-2xl tracking-widest"
              maxLength={6}
            />
            <Button onClick={verify} disabled={loading || code.length !== 6} className="w-full rounded-xl">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar e ativar"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}