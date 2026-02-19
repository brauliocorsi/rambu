import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useChannelContext } from "@/contexts/ChannelContext";
import { useViewMode } from "@/contexts/ViewModeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useChannels } from "@/hooks/useChannels";
import { useMessages } from "@/hooks/useMessages";
import { useDirectMessages, DirectMessage } from "@/hooks/useDirectMessages";
import { usePresence } from "@/hooks/usePresence";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { 
  useUnreadChannelCounts, 
  useUnreadDMCounts, 
  useTotalUnreadCount,
  useMarkChannelAsRead,
  useMarkDMAsRead,
} from "@/hooks/useNotifications";
import { useReminders } from "@/hooks/useMessageReminders";
import { CreateChannelDialog } from "@/components/channel/CreateChannelDialog";
import { ChannelDetailsDialog } from "@/components/channel/ChannelDetailsDialog";
import { CreateWorkspaceDialog } from "@/components/workspace/CreateWorkspaceDialog";
import { WorkspaceSettingsDialog } from "@/components/workspace/WorkspaceSettingsDialog";
import { InviteLinkDialog } from "@/components/workspace/InviteLinkDialog";
import { MemberManagementDialog } from "@/components/workspace/MemberManagementDialog";
import { ChannelList } from "@/components/channel/ChannelList";
import { MessageList } from "@/components/message/MessageList";
import { MessageInput } from "@/components/message/MessageInput";
import { EmojiPicker } from "@/components/message/EmojiPicker";
import { TypingIndicator } from "@/components/message/TypingIndicator";
import { DMChatView } from "@/components/dm/DMChatView";
import { DMList } from "@/components/dm/DMList";
import { NewDMDialog } from "@/components/dm/NewDMDialog";
import { SearchDialog } from "@/components/search/SearchDialog";
import { SettingsView } from "@/components/settings/SettingsView";
import { ShortcutsDialog } from "@/components/shortcuts/ShortcutsDialog";
import { AvatarWithStatus } from "@/components/user/OnlineIndicator";
import { ThreadPanel } from "@/components/message/ThreadPanel";
import { Message } from "@/hooks/useMessages";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { MentionsFeed } from "@/components/mentions/MentionsFeed";
import { Notification } from "@/hooks/useInAppNotifications";
import { useUnreadMentionsCount } from "@/hooks/useMentionsFeed";
import { useTotalUnreadCount as useFeedUnreadCount } from "@/hooks/useUnreadFeed";
import { UnreadFeed } from "@/components/unread/UnreadFeed";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import { RemindersFeed } from "@/components/reminders/RemindersFeed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MessageSquare, 
  Hash, 
  Plus, 
  LogOut,
  Smartphone,
  Users,
  Search,
  Settings,
  Moon,
  Sun,
  Link,
  UserPlus,
  ChevronDown,
  Keyboard,
  Info,
  AtSign,
  Clock,
  Inbox,
  Bell,
} from "lucide-react";
import { ScheduledMessagesList } from "@/components/message/ScheduledMessagesList";
import { useScheduledMessages } from "@/hooks/useScheduledMessages";

export function DesktopApp() {
  const { user, signOut } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const { currentChannel, setCurrentChannel } = useChannelContext();
  const { toggleViewMode } = useViewMode();
  const { resolvedTheme, setTheme } = useTheme();
  
  const { data: channels = [], isLoading: loadingChannels } = useChannels(currentWorkspace?.id || null);
  const { data: dms = [], isLoading: loadingDMs } = useDirectMessages(currentWorkspace?.id || null);
  const { data: messages = [], isLoading: loadingMessages } = useMessages(currentChannel?.id || null);
  const { data: unreadChannelCounts = {} } = useUnreadChannelCounts(currentWorkspace?.id || null);
  const { data: unreadDMCounts = {} } = useUnreadDMCounts(currentWorkspace?.id || null);
  const { channels: totalUnreadChannels, dms: totalUnreadDMs } = useTotalUnreadCount(currentWorkspace?.id || null);
  const { data: mentionsCount = 0 } = useUnreadMentionsCount();
  const totalFeedUnread = useFeedUnreadCount();
  const { data: scheduledMessages = [] } = useScheduledMessages();
  const { data: pendingReminders = [] } = useReminders();
  const markChannelAsRead = useMarkChannelAsRead();
  const markDMAsRead = useMarkDMAsRead();

  // Initialize presence tracking
  usePresence(currentWorkspace?.id);

  // Typing indicator for current channel
  const { typingUsers, sendTypingStart, sendTypingStop, isAnyoneTyping } = useTypingIndicator(
    currentChannel?.id || null
  );

  const [selectedDM, setSelectedDM] = useState<DirectMessage | null>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [showChannelDetails, setShowChannelDetails] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [showUnreadFeed, setShowUnreadFeed] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [activeSection, setActiveSection] = useState<"channels" | "dms">("channels");
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Usuário";

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'k', ctrl: true, action: () => setShowSearch(true), description: 'Busca global' },
    { key: 'n', ctrl: true, action: () => setShowNewDM(true), description: 'Nova DM' },
    { key: 'n', ctrl: true, shift: true, action: () => setShowCreateChannel(true), description: 'Novo canal' },
    { key: '/', ctrl: true, action: () => setShowShortcuts(true), description: 'Mostrar atalhos' },
    { key: ',', ctrl: true, action: () => setShowSettings(true), description: 'Configurações' },
    { key: 'Escape', action: () => {
      setShowSearch(false);
      setShowShortcuts(false);
      setShowCreateChannel(false);
      setShowNewDM(false);
    }, description: 'Fechar modal' },
  ]);

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

  if (showSettings) {
    return (
      <div className="h-screen bg-background">
        <SettingsView onBack={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Left Sidebar - Workspace Icon */}
      <div className="w-16 bg-secondary/50 border-r border-border flex flex-col items-center py-4 gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative">
              <Avatar className="h-10 w-10 rounded-xl cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                <AvatarImage src={currentWorkspace?.icon_url || undefined} />
                <AvatarFallback className="rounded-xl gradient-primary text-white font-bold">
                  {currentWorkspace?.name?.charAt(0).toUpperCase() || "C"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-56 rounded-xl">
            <DropdownMenuItem onClick={() => setShowWorkspaceSettings(true)} className="rounded-lg">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowInviteLink(true)} className="rounded-lg">
              <Link className="h-4 w-4 mr-2" />
              Convidar Pessoas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowMembers(true)} className="rounded-lg">
              <Users className="h-4 w-4 mr-2" />
              Gerenciar Membros
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowCreateWorkspace(true)} className="rounded-lg">
              <Plus className="h-4 w-4 mr-2" />
              Novo Workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Mentions Button */}
        <Popover open={showMentions} onOpenChange={setShowMentions}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl relative"
            >
              <AtSign className="h-5 w-5" />
              {mentionsCount > 0 && (
                <span className="absolute -top-1 -right-1">
                  <UnreadBadge count={mentionsCount} size="sm" />
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-80 p-0 rounded-xl">
            <div className="p-3 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <AtSign className="h-4 w-4 text-primary" />
                Menções
              </h3>
            </div>
            <MentionsFeed
              onNavigateToChannel={(channelId) => {
                const channel = channels.find(c => c.id === channelId);
                if (channel) {
                  setCurrentChannel(channel);
                  setSelectedDM(null);
                }
                setShowMentions(false);
              }}
              onNavigateToDM={(dmId) => {
                const dm = dms.find(d => d.id === dmId);
                if (dm) {
                  setSelectedDM(dm);
                  setCurrentChannel(null);
                }
                setShowMentions(false);
              }}
              onClose={() => setShowMentions(false)}
            />
          </PopoverContent>
        </Popover>

        {/* Unread Feed Button */}
        <Popover open={showUnreadFeed} onOpenChange={setShowUnreadFeed}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl relative"
            >
              <Inbox className="h-5 w-5" />
              {totalFeedUnread > 0 && (
                <span className="absolute -top-1 -right-1">
                  <UnreadBadge count={totalFeedUnread} size="sm" />
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-80 p-0 rounded-xl">
            <div className="p-3 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <Inbox className="h-4 w-4 text-primary" />
                Não Lidas
              </h3>
            </div>
            <UnreadFeed
              onSelectChannel={(channelId) => {
                const channel = channels.find(c => c.id === channelId);
                if (channel) {
                  setCurrentChannel(channel);
                  setSelectedDM(null);
                }
                setShowUnreadFeed(false);
              }}
              onSelectDM={(dmId) => {
                const dm = dms.find(d => d.id === dmId);
                if (dm) {
                  setSelectedDM(dm);
                  setCurrentChannel(null);
                }
                setShowUnreadFeed(false);
              }}
              onSelectGroup={(groupId) => {
                // Navigate to group chat - would need to handle this separately
                setShowUnreadFeed(false);
              }}
              className="max-h-96"
            />
          </PopoverContent>
        </Popover>

        {/* Scheduled Messages Button */}
        <ScheduledMessagesList
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl relative"
            >
              <Clock className="h-5 w-5" />
              {scheduledMessages.length > 0 && (
                <span className="absolute -top-1 -right-1">
                  <UnreadBadge count={scheduledMessages.length} size="sm" />
                </span>
              )}
            </Button>
          }
        />

        {/* Reminders Button */}
        <Popover open={showReminders} onOpenChange={setShowReminders}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl relative"
            >
              <Bell className="h-5 w-5" />
              {pendingReminders.length > 0 && (
                <span className="absolute -top-1 -right-1">
                  <UnreadBadge count={pendingReminders.length} size="sm" />
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-96 p-0 rounded-xl">
            <RemindersFeed />
          </PopoverContent>
        </Popover>

        <NotificationCenter
          onNavigate={(notification: Notification) => {
            // Navigate to the relevant channel/DM based on notification metadata
            if (notification.metadata?.channel_id) {
              const channel = channels.find(c => c.id === notification.metadata?.channel_id);
              if (channel) {
                setCurrentChannel(channel);
                setSelectedDM(null);
              }
            }
          }}
        />

        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={() => setShowSettings(true)}
        >
          <Settings className="h-5 w-5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20 cursor-pointer hover:ring-primary transition-all">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="gradient-primary text-white text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-online border-2 border-secondary" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56 rounded-xl">
            <div className="px-2 py-1.5">
              <p className="font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowSettings(true)} className="rounded-lg">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleViewMode} className="rounded-lg">
              <Smartphone className="h-4 w-4 mr-2" />
              Versão Mobile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="rounded-lg text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Second Sidebar - Channels & DMs */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-lg truncate">
            {currentWorkspace?.name || "Rambu"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setShowSearch(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
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
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
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
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-lg"
                    onClick={() => setShowChannelDetails(true)}
                    title="Detalhes do canal"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-lg"
                    onClick={() => setShowMembers(true)}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-lg"
                    onClick={() => setShowSearch(true)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden min-h-0">
                <MessageList
                  messages={messages}
                  channelId={currentChannel.id}
                  channelName={currentChannel.name}
                  isLoading={loadingMessages}
                  onReply={setReplyTo}
                  onOpenThread={setThreadMessage}
                />
              </div>

              {/* Typing Indicator */}
              {isAnyoneTyping && (
                <TypingIndicator typingUsers={typingUsers} />
              )}

              <MessageInput
                channelId={currentChannel.id}
                channelName={currentChannel.name}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(undefined)}
                onTyping={sendTypingStart}
                onStopTyping={sendTypingStop}
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
                  Bem-vindo ao <span className="gradient-text">Rambu</span>!
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Selecione um canal ou inicie uma conversa direta para começar.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setShowSearch(true)}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Buscar (⌘K)
                  </Button>
                  <Button
                    className="rounded-xl"
                    onClick={() => setShowInviteLink(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Convidar
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Thread Panel */}
        <AnimatePresence>
          {threadMessage && (
            <ThreadPanel
              parentMessage={threadMessage}
              onClose={() => setThreadMessage(null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Dialogs */}
      <CreateChannelDialog open={showCreateChannel} onClose={() => setShowCreateChannel(false)} />
      <CreateWorkspaceDialog open={showCreateWorkspace} onClose={() => setShowCreateWorkspace(false)} />
      <NewDMDialog 
        open={showNewDM} 
        onClose={() => setShowNewDM(false)} 
        onSelectDM={(dm) => {
          setSelectedDM(dm);
          setShowNewDM(false);
        }}
      />
      <SearchDialog 
        open={showSearch} 
        onClose={() => setShowSearch(false)}
        onSelectChannel={(channelId) => {
          const channel = channels.find(c => c.id === channelId);
          if (channel) {
            setCurrentChannel(channel);
          }
        }}
        onSelectDM={(dmId) => {
          const dm = dms.find(d => d.id === dmId);
          if (dm) {
            setSelectedDM(dm);
          }
        }}
      />
      <InviteLinkDialog open={showInviteLink} onClose={() => setShowInviteLink(false)} />
      <MemberManagementDialog open={showMembers} onClose={() => setShowMembers(false)} />
      <ShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      <WorkspaceSettingsDialog open={showWorkspaceSettings} onClose={() => setShowWorkspaceSettings(false)} />
      {currentChannel && (
        <ChannelDetailsDialog 
          open={showChannelDetails} 
          onClose={() => setShowChannelDetails(false)}
          channelId={currentChannel.id}
          channelName={currentChannel.name}
        />
      )}
    </div>
  );
}
