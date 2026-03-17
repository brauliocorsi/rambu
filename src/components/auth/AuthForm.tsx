import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthFormProps {
  onSuccess: () => void;
}

type AuthView = "login" | "signup" | "forgot-password";

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [view, setView] = useState<AuthView>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        toast.success("Bem-vindo de volta! 👋");
        onSuccess();
      } else if (view === "signup") {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              display_name: formData.displayName,
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Conta criada com sucesso! 🎉");
      } else if (view === "forgot-password") {
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Email de recuperação enviado!");
        setView("login");
      }
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow animate-scale-in">
            <span className="text-3xl">💬</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold gradient-text">Rambu</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {view === "login" && "Entre na sua conta"}
              {view === "signup" && "Crie sua conta"}
              {view === "forgot-password" && "Recupere sua senha"}
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {view === "signup" && (
              <div className="space-y-1.5 animate-fade-in">
                <Label htmlFor="displayName" className="text-xs">Nome de exibição</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Seu nome"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="pl-9 h-10 rounded-xl text-sm"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-9 h-10 rounded-xl text-sm"
                  required
                />
              </div>
            </div>

            {view !== "forgot-password" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs">Senha</Label>
                  {view === "login" && (
                    <button
                      type="button"
                      onClick={() => setView("forgot-password")}
                      className="text-xs text-primary hover:underline"
                    >
                      Esqueceu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-9 pr-9 h-10 rounded-xl text-sm"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-xl gradient-primary text-primary-foreground font-medium text-sm active:scale-[0.98] transition-transform"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {view === "login" && "Entrar"}
                  {view === "signup" && "Criar conta"}
                  {view === "forgot-password" && "Enviar email"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Navigation */}
        <div className="text-center mt-4">
          {view === "forgot-password" ? (
            <button
              type="button"
              onClick={() => setView("login")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mx-auto"
            >
              <ArrowLeft className="h-3 w-3" />
              Voltar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setView(view === "login" ? "signup" : "login")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {view === "login" ? (
                <>Não tem conta? <span className="font-medium text-primary">Criar</span></>
              ) : (
                <>Já tem conta? <span className="font-medium text-primary">Entrar</span></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
