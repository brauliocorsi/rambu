import { useState } from "react";
import { Forward, Hash, User, Users, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useChannels } from "@/hooks/useChannels";
import { useDirectMessages } from "@/hooks/useDirectMessages";
import { useDMGroups } from "@/hooks/useDMGroups";
import { useSendMessage } from "@/hooks/useMessages";
import { useSendDMMessage } from "@/hooks/useDirectMessages";
import { useSendGroupMessage } from "@/hooks/useDMGroups";
import { formatMentionsForDisplay } from "@/hooks/useMentions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageContent: string;
  senderName?: string;
}

type DestinationType = "channel" | "dm" | "group";

interface Destination {
  id: string;
  type: DestinationType;
  name: string;
  avatarUrl?: string;
}

export function ForwardMessageDialog({
  open,
  onOpenChange,
  messageContent,
  senderName,
}: ForwardMessageDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isSending, setIsSending] = useState(false);

  const { currentWorkspace } = useWorkspaceContext();
  const { data: channels } = useChannels(currentWorkspace?.id || null);
  const { data: dms } = useDirectMessages(currentWorkspace?.id || null);
  const { data: groups } = useDMGroups(currentWorkspace?.id || null);

  const sendChannelMessage = useSendMessage();
  const sendDMMessage = useSendDMMessage();
  const sendGroupMessage = useSendGroupMessage();

  const destinations: Destination[] = [
    ...(channels || []).map((ch) => ({
      id: ch.id,
      type: "channel" as const,
      name: ch.name,
    })),
    ...(dms || []).map((dm) => ({
      id: dm.id,
      type: "dm" as const,
      name: dm.other_user?.display_name || "Usuário",
      avatarUrl: dm.other_user?.avatar_url || undefined,
    })),
    ...(groups || []).map((g) => ({
      id: g.id,
      type: "group" as const,
      name: g.name || g.members?.map((m) => m.profile?.display_name).filter(Boolean).join(", ") || "Grupo",
    })),
  ];

  const filteredDestinations = destinations.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleForward = async () => {
    if (!selectedDestination) return;

    setIsSending(true);
    const plainContent = formatMentionsForDisplay(messageContent);
    const forwardedContent = senderName 
      ? `📨 Encaminhado de ${senderName}:\n\n${plainContent}`
      : `📨 Mensagem encaminhada:\n\n${plainContent}`;

    try {
      if (selectedDestination.type === "channel") {
        await sendChannelMessage.mutateAsync({
          channelId: selectedDestination.id,
          content: forwardedContent,
        });
      } else if (selectedDestination.type === "dm") {
        await sendDMMessage.mutateAsync({
          dmId: selectedDestination.id,
          content: forwardedContent,
        });
      } else if (selectedDestination.type === "group") {
        await sendGroupMessage.mutateAsync({
          groupId: selectedDestination.id,
          content: forwardedContent,
        });
      }

      toast.success("Mensagem encaminhada!");
      onOpenChange(false);
      setSelectedDestination(null);
      setSearch("");
    } catch (error) {
      toast.error("Erro ao encaminhar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  const getIcon = (type: DestinationType) => {
    switch (type) {
      case "channel":
        return <Hash className="h-4 w-4 text-muted-foreground" />;
      case "dm":
        return <User className="h-4 w-4 text-muted-foreground" />;
      case "group":
        return <Users className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="h-5 w-5" />
            Encaminhar mensagem
          </DialogTitle>
          <DialogDescription>
            Selecione para onde deseja encaminhar esta mensagem
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar canal, DM ou grupo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Destinations list */}
          <ScrollArea className="h-[300px] rounded-md border">
            <div className="p-2 space-y-1">
              {filteredDestinations.map((dest) => (
                <button
                  key={`${dest.type}-${dest.id}`}
                  onClick={() => setSelectedDestination(dest)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left",
                    selectedDestination?.id === dest.id && selectedDestination?.type === dest.type
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  )}
                >
                  {dest.type === "dm" && dest.avatarUrl ? (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={dest.avatarUrl} />
                      <AvatarFallback>{dest.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  ) : (
                    getIcon(dest.type)
                  )}
                  <span className="flex-1 truncate">{dest.name}</span>
                </button>
              ))}

              {filteredDestinations.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Nenhum destino encontrado
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                setSelectedDestination(null);
                setSearch("");
              }}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleForward}
              disabled={!selectedDestination || isSending}
            >
              {isSending ? "Encaminhando..." : "Encaminhar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
