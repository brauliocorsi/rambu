import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useDirectMessages, DirectMessage } from "@/hooks/useDirectMessages";
import { useUnreadDMCounts, useMarkDMAsRead } from "@/hooks/useNotifications";
import { DMChatView } from "@/components/dm/DMChatView";
import { DMListWithArchive } from "@/components/dm/DMListWithArchive";
import { NewDMDialog } from "@/components/dm/NewDMDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Plus, 
  Briefcase,
} from "lucide-react";

interface DMsViewProps {
  selectedDM: DirectMessage | null;
  onSelectDM: (dm: DirectMessage | null) => void;
}

export function DMsView({ selectedDM, onSelectDM }: DMsViewProps) {
  const { currentWorkspace } = useWorkspaceContext();
  const { data: dms = [], isLoading } = useDirectMessages(currentWorkspace?.id || null);
  const { data: unreadCounts = {} } = useUnreadDMCounts(currentWorkspace?.id || null);
  const markAsRead = useMarkDMAsRead();
  const [showNewDM, setShowNewDM] = useState(false);

  // Mark DM as read when selected
  useEffect(() => {
    if (selectedDM) {
      markAsRead.mutate(selectedDM.id);
    }
  }, [selectedDM?.id]);

  if (selectedDM) {
    return <DMChatView dm={selectedDM} onBack={() => onSelectDM(null)} />;
  }

  if (!currentWorkspace) {
    return (
      <div className="p-4">
        <Card className="p-8 rounded-2xl flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 rounded-full gradient-primary-soft flex items-center justify-center">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold">Nenhum workspace</h3>
            <p className="text-sm text-muted-foreground">Crie um workspace para iniciar conversas!</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Mensagens Diretas</h2>
        <Button 
          size="icon" 
          variant="ghost" 
          className="rounded-xl"
          onClick={() => setShowNewDM(true)}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-8 rounded-2xl flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
          />
        </Card>
      ) : dms.length === 0 ? (
        <Card className="p-8 rounded-2xl flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 rounded-full gradient-primary-soft flex items-center justify-center">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold">Nenhuma conversa</h3>
            <p className="text-sm text-muted-foreground">Inicie uma nova conversa!</p>
          </div>
          <Button 
            className="rounded-xl gradient-primary text-white"
            onClick={() => setShowNewDM(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Mensagem
          </Button>
        </Card>
      ) : (
        <Card className="p-2 rounded-2xl">
          <DMListWithArchive 
            dms={dms} 
            selectedDM={selectedDM} 
            onSelectDM={onSelectDM}
            workspaceId={currentWorkspace.id}
            unreadCounts={unreadCounts}
          />
        </Card>
      )}

      <NewDMDialog 
        open={showNewDM} 
        onClose={() => setShowNewDM(false)} 
        onSelectDM={(dm) => {
          onSelectDM(dm);
          setShowNewDM(false);
        }}
      />
    </div>
  );
}
