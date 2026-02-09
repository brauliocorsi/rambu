import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWorkspaceMembers } from "@/hooks/useDirectMessages";
import { useCreateDMGroup, DMGroup } from "@/hooks/useDMGroups";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";

interface NewGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectGroup: (group: DMGroup) => void;
}

export function NewGroupDialog({ open, onClose, onSelectGroup }: NewGroupDialogProps) {
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const { currentWorkspace } = useWorkspaceContext();
  const { data: members = [], isLoading } = useWorkspaceMembers(currentWorkspace?.id || null);
  const createGroup = useCreateDMGroup();

  const filteredMembers = members.filter((m) =>
    m.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleCreate = async () => {
    if (!currentWorkspace || selectedMembers.length < 1) return;

    const group = await createGroup.mutateAsync({
      workspaceId: currentWorkspace.id,
      memberIds: selectedMembers,
      name: groupName.trim() || undefined,
    });

    // Get member profiles for the group
    const memberProfiles = selectedMembers.map(id => {
      const member = members.find(m => m.id === id);
      return {
        id: `temp-${id}`,
        group_id: group.id,
        user_id: id,
        joined_at: new Date().toISOString(),
        profile: member,
      };
    });

    onSelectGroup({
      ...group,
      members: memberProfiles,
    });
    
    // Reset state
    setSelectedMembers([]);
    setGroupName("");
    setSearch("");
    onClose();
  };

  const getGroupPreviewName = () => {
    if (groupName.trim()) return groupName;
    const names = selectedMembers
      .map(id => members.find(m => m.id === id)?.display_name || "")
      .filter(Boolean)
      .slice(0, 3);
    if (names.length === 0) return "Novo Grupo";
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} e +${selectedMembers.length - 2}`;
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
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Novo Grupo</h2>
                    <p className="text-white/80 text-sm">Selecione os participantes</p>
                  </div>
                </div>
              </div>

              {/* Group Name Input */}
              <div className="p-4 border-b border-border">
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Nome do grupo (opcional)"
                  className="h-11 rounded-xl"
                />
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

              {/* Selected Members Preview */}
              {selectedMembers.length > 0 && (
                <div className="px-4 py-2 border-b border-border bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-2">
                    {selectedMembers.length} selecionado(s): {getGroupPreviewName()}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map(id => {
                      const member = members.find(m => m.id === id);
                      return (
                        <button
                          key={id}
                          onClick={() => toggleMember(id)}
                          className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                        >
                          <span>{member?.display_name || "Usuário"}</span>
                          <X className="h-3 w-3" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                  filteredMembers.map((member) => {
                    const isSelected = selectedMembers.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        onClick={() => toggleMember(member.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
                          isSelected ? "bg-primary/10" : "hover:bg-secondary"
                        )}
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
                        <div className="text-left flex-1">
                          <p className="font-medium">{member.display_name || "Usuário"}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.status === "online" ? "Online" : "Offline"}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Create Button */}
              <div className="p-4 border-t border-border">
                <Button
                  onClick={handleCreate}
                  disabled={selectedMembers.length < 1 || createGroup.isPending}
                  className="w-full rounded-xl gradient-primary text-white"
                >
                  {createGroup.isPending ? "Criando..." : `Criar Grupo (${selectedMembers.length + 1} membros)`}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
