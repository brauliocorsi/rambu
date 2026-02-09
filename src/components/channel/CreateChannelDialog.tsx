import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Hash, Lock, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCreateChannel } from "@/hooks/useChannels";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceMembers } from "@/hooks/useWorkspaces";

interface CreateChannelDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateChannelDialog({ open, onClose }: CreateChannelDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const { currentWorkspace } = useWorkspaceContext();
  const { user } = useAuth();
  const { data: members = [] } = useWorkspaceMembers(currentWorkspace?.id || null);
  const createChannel = useCreateChannel();

  // Check if user can create channels
  const isOwner = currentWorkspace?.created_by === user?.id;
  const userMembership = members.find(m => m.user_id === user?.id);
  const isAdmin = userMembership?.role === 'admin';
  const canCreateChannels = isOwner || isAdmin || (currentWorkspace?.allow_member_channels ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentWorkspace || !canCreateChannels) return;

    await createChannel.mutateAsync({ 
      workspaceId: currentWorkspace.id,
      name: name.trim(), 
      description: description.trim(),
      isPrivate 
    });
    setName("");
    setDescription("");
    setIsPrivate(false);
    onClose();
  };

  const formattedName = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div className="bg-card rounded-3xl shadow-xl overflow-hidden">
              {/* Header */}
              <div className="gradient-primary p-6 text-white relative">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    {isPrivate ? <Lock className="h-6 w-6" /> : <Hash className="h-6 w-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Novo Canal</h2>
                    <p className="text-white/80 text-sm">
                      {isPrivate ? "Canal privado" : "Canal público"} em {currentWorkspace?.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form or No Permission Message */}
              {canCreateChannels ? (
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="channel-name">Nome do Canal</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        #
                      </span>
                      <Input
                        id="channel-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="geral"
                        className="h-12 rounded-xl pl-8"
                        required
                      />
                    </div>
                    {name && (
                      <p className="text-xs text-muted-foreground">
                        Será criado como: <span className="font-mono">#{formattedName}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="channel-description">Descrição (opcional)</Label>
                    <Textarea
                      id="channel-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Do que se trata este canal?"
                      className="rounded-xl resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-secondary">
                    <div className="flex items-center gap-3">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Canal Privado</p>
                        <p className="text-xs text-muted-foreground">Apenas convidados podem ver</p>
                      </div>
                    </div>
                    <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
                  </div>

                  <Button
                    type="submit"
                    disabled={!name.trim() || createChannel.isPending}
                    className="w-full h-12 rounded-xl gradient-primary text-white font-medium"
                  >
                    {createChannel.isPending ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-5 w-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Criar Canal
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <div className="p-6">
                  <div className="flex flex-col items-center text-center gap-4 py-8">
                    <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Sem permissão</h3>
                      <p className="text-muted-foreground text-sm">
                        Apenas administradores podem criar canais neste workspace.
                        Entre em contato com um administrador se precisar de um novo canal.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="rounded-xl"
                    >
                      Entendi
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
