import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useChannelContext } from "@/contexts/ChannelContext";
import { useViewMode } from "@/contexts/ViewModeContext";
import { useChannels } from "@/hooks/useChannels";
import { useMessages } from "@/hooks/useMessages";
import { useDirectMessages, DirectMessage } from "@/hooks/useDirectMessages";
import { 
  useUnreadChannelCounts, 
  useUnreadDMCounts, 
  useTotalUnreadCount,
  useMarkChannelAsRead,
  useMarkDMAsRead,
} from "@/hooks/useNotifications";
import { CreateChannelDialog } from "@/components/channel/CreateChannelDialog";
import { ChannelList } from "@/components/channel/ChannelList";
import { MessageList } from "@/components/message/MessageList";
import { MessageInput } from "@/components/message/MessageInput";
import { DMChatView } from "@/components/dm/DMChatView";
import { DMList } from "@/components/dm/DMList";
import { NewDMDialog } from "@/components/dm/NewDMDialog";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Hash, 
  Plus, 
  LogOut,
  Smartphone,
  Users,
  Search,
} from "lucide-react";

export function DesktopApp() {
  const { user, signOut } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const { currentChannel, setCurrentChannel } = useChannelContext();
  const { toggleViewMode } = useViewMode();
  
  const { data: channels = [], isLoading: loadingChannels } = useChannels(currentWorkspace?.id || null);
  const { data: dms = [], isLoading: loadingDMs } = useDirectMessages(currentWorkspace?.id || null);
  const { data: messages = [], isLoading: loadingMessages } = useMessages(currentChannel?.id || null);
  const { data: unreadChannelCounts = {} } = useUnreadChannelCounts(currentWorkspace?.id || null);
  const { data: unreadDMCounts = {} } = useUnreadDMCounts(currentWorkspace?.id || null);
  const { channels: totalUnreadChannels, dms: totalUnreadDMs } = useTotalUnreadCount(currentWorkspace?.id || null);
  const markChannelAsRead = useMarkChannelAsRead();
  const markDMAsRead = useMarkDMAsRead();

  const [selectedDM, setSelectedDM] = useState<DirectMessage | null>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [activeSection, setActiveSection] = useState<"channels" | "dms">("channels");
  const [replyTo, setReplyTo] = useState<string | undefined>();

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Usuário";

  useEffect(() => {
    if (currentChannel) {
      markChannelAsRead.mutate(currentChannel.id);
      setSelectedDM(null);
    }
  }, [currentChannel?.id]);

  useEffect(() => {
    if (selectedDM) {
      markDMAsRead.mutate(selectedDM.id);
      setCurrentChannel(null);
    }
  }, [selectedDM?.id]);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Left Sidebar - Workspace Icon */}
      <div className="w-16 bg-secondary/50 border-r border-border flex flex-col items-center py-4 gap-2">
        <Avatar className="h-10 w-10 rounded-xl cursor-pointer hover:ring-2 hover:ring-primary transition-all">
          <AvatarImage src={currentWorkspace?.icon_url || undefined} />
          <AvatarFallback className="rounded-xl gradient-primary text-white font-bold">
            {currentWorkspace?.name?.charAt(0).toUpperCase() || "C"}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1" />
        
        <div className="relative">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="gradient-primary text-white text-sm">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-online border-2 border-secondary" />
        </div>
      </div>

      {/* Second Sidebar - Channels & DMs */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-lg truncate">
            {currentWorkspace?.name || "ChatFlow"}
          </h2>
        </div>

        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveSection("channels")}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeSection === "channels" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Hash className="h-4 w-4" />
              Canais
              {totalUnreadChannels > 0 && <UnreadBadge count={totalUnreadChannels} size="sm" />}
            </span>
            {activeSection === "channels" && (
              <motion.div layoutId="section-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveSection("dms")}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeSection === "dms" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <MessageSquare className="h-4 w-4" />
              DMs
              {totalUnreadDMs > 0 && <UnreadBadge count={totalUnreadDMs} size="sm" />}
            </span>
            {activeSection === "dms" && (
              <motion.div layoutId="section-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {activeSection === "channels" ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 mb-2"
                  onClick={() => setShowCreateChannel(true)}
                >
                  <Plus className="h-4 w-4" />
                  Novo Canal
                </Button>
                {loadingChannels ? (
                  <div className="flex justify-center py-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full"
                    />
                  </div>
                ) : (
                  <ChannelList
                    channels={channels}
                    selectedChannel={currentChannel}
                    onSelectChannel={setCurrentChannel}
                    unreadCounts={unreadChannelCounts}
                  />
                )}
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 mb-2"
                  onClick={() => setShowNewDM(true)}
                >
                  <Plus className="h-4 w-4" />
                  Nova Mensagem
                </Button>
                {loadingDMs ? (
                  <div className="flex justify-center py-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full"
                    />
                  </div>
                ) : (
                  <DMList
                    dms={dms}
                    selectedDM={selectedDM}
                    onSelectDM={setSelectedDM}
                    unreadCounts={unreadDMCounts}
                  />
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <div className="p-2 border-t border-border space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={toggleViewMode}
          >
            <Smartphone className="h-4 w-4" />
            Versão Mobile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {currentChannel ? (
          <>
            <div className="h-14 border-b border-border flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold">{currentChannel.name}</h2>
                {currentChannel.description && (
                  <span className="text-sm text-muted-foreground">| {currentChannel.description}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-lg">
                  <Users className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-lg">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <MessageList
                messages={messages}
                channelId={currentChannel.id}
                channelName={currentChannel.name}
                isLoading={loadingMessages}
                onReply={setReplyTo}
              />
            </div>

            <MessageInput
              channelId={currentChannel.id}
              channelName={currentChannel.name}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(undefined)}
            />
          </>
        ) : selectedDM ? (
          <DMChatView dm={selectedDM} onBack={() => setSelectedDM(null)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="h-20 w-20 mx-auto rounded-2xl gradient-primary flex items-center justify-center">
                <MessageSquare className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold">
                Bem-vindo ao <span className="gradient-text">ChatFlow</span>!
              </h2>
              <p className="text-muted-foreground max-w-md">
                Selecione um canal ou inicie uma conversa direta para começar.
              </p>
            </motion.div>
          </div>
        )}
      </div>

      <CreateChannelDialog open={showCreateChannel} onClose={() => setShowCreateChannel(false)} />
      <NewDMDialog 
        open={showNewDM} 
        onClose={() => setShowNewDM(false)} 
        onSelectDM={(dm) => {
          setSelectedDM(dm);
          setShowNewDM(false);
        }}
      />
    </div>
  );
}
