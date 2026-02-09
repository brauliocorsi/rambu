import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWorkspaceMembers, useCreateOrGetDM, DirectMessage } from "@/hooks/useDirectMessages";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";

interface NewDMDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectDM: (dm: DirectMessage) => void;
}

export function NewDMDialog({ open, onClose, onSelectDM }: NewDMDialogProps) {
  const [search, setSearch] = useState("");
  const { currentWorkspace } = useWorkspaceContext();
  const { data: members = [], isLoading } = useWorkspaceMembers(currentWorkspace?.id || null);
  const createOrGetDM = useCreateOrGetDM();

  const filteredMembers = members.filter((m) =>
    m.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectMember = async (memberId: string) => {
    if (!currentWorkspace) return;

    const dm = await createOrGetDM.mutateAsync({
      workspaceId: currentWorkspace.id,
      otherUserId: memberId,
    });

    // Get other user profile for the DM object
    const member = members.find((m) => m.id === memberId);
    const dmWithProfile: DirectMessage = {
      ...dm,
      other_user: member,
    };

    onSelectDM(dmWithProfile);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

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
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Nova Mensagem</h2>
                    <p className="text-white/80 text-sm">Escolha alguém para conversar</p>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar membros..."
                    className="pl-10 h-11 rounded-xl"
                  />
                </div>
              </div>

              {/* Members list */}
              <div className="max-h-64 overflow-y-auto p-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full"
                    />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum membro encontrado</p>
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSelectMember(member.id)}
                      disabled={createOrGetDM.isPending}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="gradient-primary text-white">
                            {(member.display_name || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${
                            member.status === "online" ? "bg-online" : "bg-offline"
                          }`}
                        />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{member.display_name || "Usuário"}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.status === "online" ? "Online" : "Offline"}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
