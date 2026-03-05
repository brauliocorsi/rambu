import { useState } from "react";
import { Users, X, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { WorkspaceMember } from "@/hooks/useWorkspaceMembers";

interface Props {
  members: WorkspaceMember[];
  selectedAssignees: string[];
  toggleAssignee: (userId: string) => void;
  label?: string;
}

export function MemberSelector({ members, selectedAssignees, toggleAssignee, label = "Auto-atribuição (opcional)" }: Props) {
  const [search, setSearch] = useState("");

  const filtered = members.filter((m) => {
    if (!search.trim()) return true;
    const name = (m.profile?.display_name || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div>
      <Label className="flex items-center gap-1.5 mb-2">
        <Users className="h-3.5 w-3.5" />
        {label}
      </Label>
      {selectedAssignees.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedAssignees.map((userId) => {
            const member = members.find((m) => m.user_id === userId);
            return (
              <Badge key={userId} variant="secondary" className="flex items-center gap-1 pr-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={member?.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {(member?.profile?.display_name || "U").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">{member?.profile?.display_name || "Usuário"}</span>
                <button onClick={() => toggleAssignee(userId)} className="ml-0.5 rounded-full hover:bg-muted p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
      <div className="border rounded-lg">
        <div className="relative px-2 py-1.5 border-b border-border">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar membro..."
            className="h-7 text-sm pl-7 border-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <ScrollArea className="max-h-64">
          <div className="p-1">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhum membro encontrado</p>
            )}
            {filtered.map((m) => (
              <label key={m.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/50 cursor-pointer">
                <Checkbox
                  checked={selectedAssignees.includes(m.user_id)}
                  onCheckedChange={() => toggleAssignee(m.user_id)}
                />
                <Avatar className="h-5 w-5">
                  <AvatarImage src={m.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {(m.profile?.display_name || "U").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{m.profile?.display_name || "Usuário"}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
