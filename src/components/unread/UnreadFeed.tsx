import { motion, AnimatePresence } from "framer-motion";
import { useUnreadFeed, UnreadSource } from "@/hooks/useUnreadFeed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  Hash, 
  MessageSquare, 
  Users, 
  Inbox, 
  CheckCheck,
  Lock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

interface UnreadFeedProps {
  onSelectChannel?: (channelId: string) => void;
  onSelectDM?: (dmId: string) => void;
  onSelectGroup?: (groupId: string) => void;
  className?: string;
}

export function UnreadFeed({ 
  onSelectChannel, 
  onSelectDM, 
  onSelectGroup,
  className,
}: UnreadFeedProps) {
  const { data: unreadSources = [], isLoading, refetch } = useUnreadFeed();

  const handleSelect = (source: UnreadSource) => {
    switch (source.type) {
      case "channel":
        onSelectChannel?.(source.id);
        break;
      case "dm":
        onSelectDM?.(source.id);
        break;
      case "group":
        onSelectGroup?.(source.id);
        break;
    }
  };

  const getTypeIcon = (source: UnreadSource) => {
    switch (source.type) {
      case "channel":
        return source.name.includes("🔒") ? (
          <Lock className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Hash className="h-4 w-4 text-muted-foreground" />
        );
      case "dm":
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
      case "group":
        return <Users className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: UnreadSource["type"]) => {
    switch (type) {
      case "channel":
        return "Canal";
      case "dm":
        return "Mensagem Direta";
      case "group":
        return "Grupo";
    }
  };

  const getTypeBadgeColor = (type: UnreadSource["type"]) => {
    switch (type) {
      case "channel":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "dm":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "group":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (unreadSources.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <CheckCheck className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-1">Tudo em dia!</h3>
        <p className="text-muted-foreground text-sm max-w-[250px]">
          Você não tem mensagens não lidas no momento.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => refetch()}
        >
          Atualizar
        </Button>
      </div>
    );
  }

  const totalUnread = unreadSources.reduce((sum, s) => sum + s.unreadCount, 0);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Não Lidas</h2>
          <Badge variant="secondary" className="ml-1">
            {totalUnread}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="text-xs text-muted-foreground"
        >
          Atualizar
        </Button>
      </div>

      {/* Feed List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          <AnimatePresence mode="popLayout">
            {unreadSources.map((source, index) => (
              <motion.button
                key={`${source.type}-${source.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSelect(source)}
                className="w-full text-left p-3 rounded-xl hover:bg-secondary/80 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  {/* Icon/Avatar */}
                  <div className="relative shrink-0">
                    {source.type === "dm" && source.icon ? (
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={source.icon} />
                        <AvatarFallback className="gradient-primary text-white">
                          {source.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                        {source.type === "group" ? (
                          <Users className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Hash className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    
                    {/* Unread count badge */}
                    <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                      {source.unreadCount > 99 ? "99+" : source.unreadCount}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium truncate">
                        {source.name}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn("text-[10px] px-1.5 py-0", getTypeBadgeColor(source.type))}
                      >
                        {getTypeLabel(source.type)}
                      </Badge>
                    </div>
                    
                    {source.lastMessage && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground/80 shrink-0">
                          {source.lastMessage.senderName}:
                        </span>
                        <span className="truncate">
                          {source.lastMessage.content}
                        </span>
                      </div>
                    )}

                    {source.lastMessage && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(source.lastMessage.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
