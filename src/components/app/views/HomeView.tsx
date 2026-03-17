import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import { CreateChannelDialog } from "@/components/channel/CreateChannelDialog";
import { CreateWorkspaceDialog } from "@/components/workspace/CreateWorkspaceDialog";
import { InviteLinkDialog } from "@/components/workspace/InviteLinkDialog";
import { NewDMDialog } from "@/components/dm/NewDMDialog";
import { 
  MessageSquare, 
  Hash, 
  Users, 
  Briefcase,
} from "lucide-react";

interface HomeViewProps {
  onNavigateToDMs: () => void;
  onSelectDM: (dm: any) => void;
}

export function HomeView({ onNavigateToDMs, onSelectDM }: HomeViewProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Usuário";

  return (
    <div className="p-4 space-y-5">
      <div className="animate-fade-in">
        <h2 className="text-xl font-semibold">
          Olá, <span className="gradient-text">{displayName}</span> 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">O que você quer fazer?</p>
      </div>

      <WorkspaceSwitcher />

      {currentWorkspace && (
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { icon: Hash, label: "Criar Canal", action: () => setShowCreateChannel(true), variant: "gradient" as const },
            { icon: MessageSquare, label: "Nova Mensagem", action: () => setShowNewDM(true), variant: "primary" as const },
            { icon: Users, label: "Convidar", action: () => setShowInviteLink(true), variant: "outline" as const },
            { icon: Briefcase, label: "Novo Workspace", action: () => setShowCreateWorkspace(true), variant: "outline" as const },
          ].map((item, i) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`p-3.5 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-[0.97] animate-fade-in ${
                item.variant === "gradient" 
                  ? "gradient-primary text-primary-foreground" 
                  : item.variant === "primary"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card hover:bg-secondary"
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {!currentWorkspace && (
        <button
          onClick={() => setShowCreateWorkspace(true)}
          className="w-full gradient-primary p-4 rounded-xl flex flex-col items-center gap-2 text-primary-foreground active:scale-[0.98] transition-transform animate-fade-in"
        >
          <Briefcase className="h-5 w-5" />
          <span className="text-sm font-medium">Criar Primeiro Workspace</span>
        </button>
      )}

      <CreateChannelDialog open={showCreateChannel} onClose={() => setShowCreateChannel(false)} />
      <CreateWorkspaceDialog open={showCreateWorkspace} onClose={() => setShowCreateWorkspace(false)} />
      <InviteLinkDialog open={showInviteLink} onClose={() => setShowInviteLink(false)} />
      <NewDMDialog 
        open={showNewDM} 
        onClose={() => setShowNewDM(false)} 
        onSelectDM={(dm) => {
          setShowNewDM(false);
          onSelectDM(dm);
          onNavigateToDMs();
        }}
      />
    </div>
  );
}
