import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useInviteByCode, useJoinWorkspace } from "@/hooks/useWorkspaceInvites";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { AuthForm } from "@/components/auth/AuthForm";
import {
  Link,
  Users,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";

export default function JoinWorkspace() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: invite, isLoading, error } = useInviteByCode(code || null);
  const joinWorkspace = useJoinWorkspace();
  const [joined, setJoined] = useState(false);

  const handleJoin = () => {
    if (!code) return;
    joinWorkspace.mutate(code, {
      onSuccess: () => {
        setJoined(true);
        setTimeout(() => navigate("/"), 2000);
      },
    });
  };

  if (authLoading || isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 rounded-2xl mb-4">
          <div className="text-center mb-4">
            <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center mx-auto mb-3">
              <Link className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold">Convite para Workspace</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Faça login ou crie uma conta para aceitar o convite
            </p>
          </div>
        </Card>
        <AuthForm onSuccess={() => {}} />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 rounded-2xl text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Convite Inválido</h2>
            <p className="text-muted-foreground mb-6">
              Este link de convite é inválido ou expirou.
            </p>
            <Button className="rounded-xl" onClick={() => navigate("/")}>
              Ir para Home
            </Button>
          </motion.div>
        </Card>
      </div>
    );
  }

  const workspace = invite.workspaces as { id: string; name: string; description: string | null; icon_url: string | null } | null;

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 rounded-2xl text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="h-16 w-16 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-[hsl(var(--success))]" />
            </div>
            <h2 className="text-xl font-bold mb-2">Você entrou!</h2>
            <p className="text-muted-foreground">
              Bem-vindo ao {workspace?.name}
            </p>
          </motion.div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 rounded-2xl">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center"
        >
          <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-white" />
          </div>

          <h2 className="text-xl font-bold mb-1">Você foi convidado</h2>
          <p className="text-muted-foreground mb-6">
            para entrar no workspace
          </p>

          {workspace && (
            <div className="p-4 bg-secondary/50 rounded-xl mb-6">
              <div className="flex items-center justify-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={workspace.icon_url || undefined} />
                  <AvatarFallback className="gradient-primary text-white text-lg">
                    {workspace.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="font-semibold">{workspace.name}</p>
                  {workspace.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {workspace.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => navigate("/")}
            >
              <X className="h-4 w-4 mr-2" />
              Recusar
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onClick={handleJoin}
              disabled={joinWorkspace.isPending}
            >
              {joinWorkspace.isPending ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Aceitar
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </Card>
    </div>
  );
}
