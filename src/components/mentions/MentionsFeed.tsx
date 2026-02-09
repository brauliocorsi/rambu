import { motion } from "framer-motion";
import { AtSign, Hash, MessageSquare, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useMentionsFeed, MentionFeedItem } from "@/hooks/useMentionsFeed";
import { formatMentionsForDisplay } from "@/hooks/useMentions";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MentionsFeedProps {
  onNavigateToChannel?: (channelId: string) => void;
  onNavigateToDM?: (dmId: string) => void;
  onClose?: () => void;
}

export function MentionsFeed({ onNavigateToChannel, onNavigateToDM, onClose }: MentionsFeedProps) {
  const { data: mentions = [], isLoading } = useMentionsFeed();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (mentions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <AtSign className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg">Nenhuma menção</h3>
        <p className="text-sm text-muted-foreground max-w-xs mt-1">
          Você será notificado aqui quando alguém te mencionar usando @
        </p>
      </div>
    );
  }

  const handleClick = (mention: MentionFeedItem) => {
    if (mention.message?.channel_id) {
      onNavigateToChannel?.(mention.message.channel_id);
    } else if (mention.dm_message?.dm_id) {
      onNavigateToDM?.(mention.dm_message.dm_id);
    }
    onClose?.();
  };

  const getMentionContent = (mention: MentionFeedItem) => {
    if (mention.message) {
      return {
        content: mention.message.content,
        senderName: mention.message.profile?.display_name || "Usuário",
        senderAvatar: mention.message.profile?.avatar_url,
        location: mention.message.channel?.name ? `#${mention.message.channel.name}` : "Canal",
        locationIcon: Hash,
        createdAt: mention.message.created_at,
      };
    }
    if (mention.dm_message) {
      return {
        content: mention.dm_message.content,
        senderName: mention.dm_message.profile?.display_name || "Usuário",
        senderAvatar: mention.dm_message.profile?.avatar_url,
        location: "Mensagem direta",
        locationIcon: MessageSquare,
        createdAt: mention.dm_message.created_at,
      };
    }
    if (mention.thread_message) {
      return {
        content: mention.thread_message.content,
        senderName: mention.thread_message.profile?.display_name || "Usuário",
        senderAvatar: mention.thread_message.profile?.avatar_url,
        location: "Thread",
        locationIcon: MessageCircle,
        createdAt: mention.thread_message.created_at,
      };
    }
    return null;
  };

  return (
    <ScrollArea className="h-full max-h-[400px]">
      <div className="space-y-1 p-2">
        {mentions.map((mention, index) => {
          const content = getMentionContent(mention);
          if (!content) return null;

          const LocationIcon = content.locationIcon;

          return (
            <motion.button
              key={mention.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => handleClick(mention)}
              className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/80 transition-colors text-left"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={content.senderAvatar || undefined} />
                <AvatarFallback className="text-sm gradient-primary text-white">
                  {content.senderName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm">{content.senderName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(content.createdAt), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </span>
                </div>

                <p className="text-sm text-foreground line-clamp-2">
                  {formatMentionsForDisplay(content.content)}
                </p>

                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <LocationIcon className="h-3 w-3" />
                  <span>{content.location}</span>
                </div>
              </div>

              <div className="shrink-0">
                <AtSign className="h-4 w-4 text-primary" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
