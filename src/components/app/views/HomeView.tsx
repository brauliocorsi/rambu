import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import { CreateChannelDialog } from "@/components/channel/CreateChannelDialog";
import { CreateWorkspaceDialog } from "@/components/workspace/CreateWorkspaceDialog";
import { InviteLinkDialog } from "@/components/workspace/InviteLinkDialog";
import { NewDMDialog } from "@/components/dm/NewDMDialog";
import { Card } from "@/components/ui/card";
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

  const handleNewMessage = () => {
    if (currentWorkspace) {
      setShowNewDM(true);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Welcome section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h2 className="text-2xl font-bold">
          Olá, <span className="gradient-text">{displayName}</span>! 👋
        </h2>
        <p className="text-muted-foreground">O que você quer fazer hoje?</p>
      </motion.div>

      {/* Workspace Switcher */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <WorkspaceSwitcher />
      </motion.div>

      {/* Quick actions */}
      {currentWorkspace && (
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => setShowCreateChannel(true)}
            className="gradient-primary p-4 rounded-2xl flex flex-col items-center gap-2 text-white shadow-soft"
          >
            <Hash className="h-6 w-6" />
            <span className="text-sm font-medium">Criar Canal</span>
          </motion.button>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            onClick={handleNewMessage}
            className="bg-primary p-4 rounded-2xl flex flex-col items-center gap-2 text-white shadow-soft"
          >
            <MessageSquare className="h-6 w-6" />
            <span className="text-sm font-medium">Nova Mensagem</span>
          </motion.button>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            onClick={() => setShowInviteLink(true)}
            className="bg-accent p-4 rounded-2xl flex flex-col items-center gap-2 text-white shadow-soft"
          >
            <Users className="h-6 w-6" />
            <span className="text-sm font-medium">Convidar</span>
          </motion.button>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => setShowCreateWorkspace(true)}
            className="bg-accent p-4 rounded-2xl flex flex-col items-center gap-2 text-white shadow-soft"
          >
            <Briefcase className="h-6 w-6" />
            <span className="text-sm font-medium">Novo Workspace</span>
          </motion.button>
        </div>
      )}

      {!currentWorkspace && (
        <div className="grid grid-cols-1 gap-3">
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => setShowCreateWorkspace(true)}
            className="gradient-primary p-4 rounded-2xl flex flex-col items-center gap-2 text-white shadow-soft"
          >
            <Briefcase className="h-6 w-6" />
            <span className="text-sm font-medium">Criar Primeiro Workspace</span>
          </motion.button>
        </div>
      )}

      {/* Recent activity */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Atividade Recente</h3>
        <Card className="p-4 rounded-2xl">
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            {currentWorkspace ? (
              <p>Nenhuma atividade recente em {currentWorkspace.name}</p>
            ) : (
              <p>Crie um workspace para começar!</p>
            )}
          </div>
        </Card>
      </div>

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
