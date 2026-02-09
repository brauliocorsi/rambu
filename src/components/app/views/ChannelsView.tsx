import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useChannelContext } from "@/contexts/ChannelContext";
import { useChannels } from "@/hooks/useChannels";
import { useInfiniteMessages } from "@/hooks/useInfiniteMessages";
import { useUnreadChannelCounts, useMarkChannelAsRead } from "@/hooks/useNotifications";
import { CategoryManager } from "@/components/channel/CategoryManager";
import { CreateChannelDialog } from "@/components/channel/CreateChannelDialog";
import { MessageList } from "@/components/message/MessageList";
import { MessageInput } from "@/components/message/MessageInput";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Hash, 
  Plus, 
  Briefcase,
  ArrowLeft,
} from "lucide-react";

// Channel Chat View
function ChannelChatView() {
  const { currentChannel, setCurrentChannel } = useChannelContext();
  const { messages, isLoading, isFetchingMore, hasMore, loadMore } = useInfiniteMessages(currentChannel?.id || null);
  const [replyTo, setReplyTo] = useState<string | undefined>();

  if (!currentChannel) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Channel Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={() => setCurrentChannel(null)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="font-bold flex items-center gap-1">
            <Hash className="h-4 w-4" />
            {currentChannel.name}
          </h2>
          {currentChannel.description && (
            <p className="text-xs text-muted-foreground">{currentChannel.description}</p>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <MessageList
        messages={messages}
        channelId={currentChannel.id}
        channelName={currentChannel.name}
        isLoading={isLoading}
        isFetchingMore={isFetchingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onReply={setReplyTo}
      />

      {/* Message Input */}
      <MessageInput
        channelId={currentChannel.id}
        channelName={currentChannel.name}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(undefined)}
      />
    </div>
  );
}

export function ChannelsView() {
  const { currentWorkspace } = useWorkspaceContext();
  const { currentChannel, setCurrentChannel } = useChannelContext();
  const { data: channels = [], isLoading } = useChannels(currentWorkspace?.id || null);
  const { data: unreadCounts = {} } = useUnreadChannelCounts(currentWorkspace?.id || null);
  const markAsRead = useMarkChannelAsRead();
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  // Mark channel as read when selected
  useEffect(() => {
    if (currentChannel) {
      markAsRead.mutate(currentChannel.id);
    }
  }, [currentChannel?.id]);

  if (currentChannel) {
    return <ChannelChatView />;
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
            <p className="text-sm text-muted-foreground">Crie um workspace para criar canais!</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Canais</h2>
        <Button 
          size="icon" 
          variant="ghost" 
          className="rounded-xl"
          onClick={() => setShowCreateChannel(true)}
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
      ) : channels.length === 0 ? (
        <Card className="p-8 rounded-2xl flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 rounded-full gradient-primary-soft flex items-center justify-center">
            <Hash className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold">Nenhum canal</h3>
            <p className="text-sm text-muted-foreground">Crie o primeiro canal em {currentWorkspace.name}!</p>
          </div>
          <Button 
            className="rounded-xl gradient-primary text-white"
            onClick={() => setShowCreateChannel(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Canal
          </Button>
        </Card>
      ) : (
        <Card className="p-2 rounded-2xl">
          <CategoryManager
            workspaceId={currentWorkspace.id}
            channels={channels}
            selectedChannel={currentChannel}
            onSelectChannel={setCurrentChannel}
            unreadCounts={unreadCounts}
          />
        </Card>
      )}

      <CreateChannelDialog open={showCreateChannel} onClose={() => setShowCreateChannel(false)} />
    </div>
  );
}
