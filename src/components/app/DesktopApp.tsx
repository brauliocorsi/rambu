import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useChannelContext } from "@/contexts/ChannelContext";
import { useViewMode } from "@/contexts/ViewModeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useChannels } from "@/hooks/useChannels";
import { useInfiniteMessages } from "@/hooks/useInfiniteMessages";
import { useDirectMessages, DirectMessage } from "@/hooks/useDirectMessages";
import { usePresence } from "@/hooks/usePresence";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useRecordMessageView, useMessageViewCounts } from "@/hooks/useMessageViews";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { 
  useUnreadChannelCounts, 
  useUnreadDMCounts, 
  useTotalUnreadCount,
} from "@/hooks/useNotifications";
import { useConversationReadStatus } from "@/hooks/useConversationReadStatus";
import { useReminders } from "@/hooks/useMessageReminders";
import { CreateChannelDialog } from "@/components/channel/CreateChannelDialog";
import { ChannelDetailsDialog } from "@/components/channel/ChannelDetailsDialog";
import { MediaGalleryDialog } from "@/components/channel/MediaGalleryDialog";
import { GlobalDropOverlay } from "@/components/chat/GlobalDropOverlay";
import { CreateWorkspaceDialog } from "@/components/workspace/CreateWorkspaceDialog";
import { WorkspaceSettingsDialog } from "@/components/workspace/WorkspaceSettingsDialog";
import { InviteLinkDialog } from "@/components/workspace/InviteLinkDialog";
import { MemberManagementDialog } from "@/components/workspace/MemberManagementDialog";
import { ChannelList } from "@/components/channel/ChannelList";
import { ChannelMembersPopover } from "@/components/channel/ChannelMembersPopover";
import { JumpToDateButton } from "@/components/channel/JumpToDateButton";
import { ConversationMessageList } from "@/components/conversation/ConversationMessageList";
import { normalizeMessage } from "@/lib/conversation/normalizeMessage";
import { useLayoutPreferences } from "@/hooks/useLayoutPreferences";
import { ConversationComposer } from "@/components/conversation/ConversationComposer";
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
import { useDeleteChannel } from "@/hooks/useChannels";
import { useCurrentChannelRole } from "@/hooks/useChannelMembers";
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
  MoreVertical,
  Trash2,
  ClipboardList,
  Image as ImageIcon,
} from "lucide-react";
import { ScheduledMessagesList } from "@/components/message/ScheduledMessagesList";
import { useScheduledMessages } from "@/hooks/useScheduledMessages";
import { PendingTasksPanel } from "@/components/tasks/PendingTasksPanel";
import { usePendingTasks } from "@/hooks/usePendingTasks";
import { FlowsView } from "@/components/app/views/FlowsView";
import { ChannelListSkeleton, DMListSkeleton } from "@/components/ui/skeletons";
import { useChannelMembersRealtime } from "@/hooks/useChannelMembersRealtime";

export function DesktopApp() {
  const { user, signOut } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const { currentChannel, setCurrentChannel } = useChannelContext();
  const { toggleViewMode } = useViewMode();
  const { resolvedTheme, setTheme } = useTheme();
  
  const { data: channels = [], isLoading: loadingChannels } = useChannels(currentWorkspace?.id || null);
  const { data: dms = [], isLoading: loadingDMs } = useDirectMessages(currentWorkspace?.id || null);
  const {
    messages,
    isLoading: loadingMessages,
    isFetchingMore: isFetchingMoreMessages,
    hasMore: hasMoreMessages,
    loadMore: loadMoreMessages,
    jumpToDate: jumpToDateMessages,
    isJumping: isJumpingMessages,
  } = useInfiniteMessages(currentChannel?.id || null);
  const { data: unreadChannelCounts = {} } = useUnreadChannelCounts(currentWorkspace?.id || null);
  const { data: unreadDMCounts = {} } = useUnreadDMCounts(currentWorkspace?.id || null);
  const { channels: totalUnreadChannels, dms: totalUnreadDMs } = useTotalUnreadCount(currentWorkspace?.id || null);
  const { data: mentionsCount = 0 } = useUnreadMentionsCount();
  const totalFeedUnread = useFeedUnreadCount();
  const { data: scheduledMessages = [] } = useScheduledMessages();
  const { data: pendingReminders = [] } = useReminders();
  const deleteChannel = useDeleteChannel();
  const { data: currentChannelRole } = useCurrentChannelRole(currentChannel?.id || null);

  // Initialize presence tracking
  usePresence(currentWorkspace?.id);

  // Realtime sync for channel membership changes
  useChannelMembersRealtime(currentWorkspace?.id || null);

  // Typing indicator for current channel
  const { typingUsers, sendTypingStart, sendTypingStop, isAnyoneTyping } = useTypingIndicator(
    currentChannel?.id || null
  );

  // Read-view tracking centralizado no call-site (Fase 5-Channel-prep).
  // `MessageList` recebe `viewDataById` e, por consequência, não chama
  // `useRecordMessageView`/`useMessageViewCounts` internamente — evitando
  // duplicação quando o mesmo canal for renderizado por
  // `ConversationMessageList` na próxima fase.
  const channelVisibleMessageIds = useMemo(
    () => messages.map((m) => m.id).filter((id) => !id.startsWith("temp-")),
    [messages]
  );
  useRecordMessageView(channelVisibleMessageIds, currentChannel?.id || null);
  const { data: channelViewDataById = {} } = useMessageViewCounts(channelVisibleMessageIds);

  // Layout preferences (slack mode / density) — consumidas pelo
  // ConversationMessageList → ConversationMessageBubble → MessageBubble.
  const { preferences: layoutPreferences } = useLayoutPreferences();

  // Normalização das mensagens do canal para a camada unificada.
  // Sem fetch novo; apenas mapeia o payload bruto preservando `_raw`.
  const channelConversationRef = useMemo(
    () =>
      currentChannel
        ? {
            type: "channel" as const,
            id: currentChannel.id,
            workspaceId: currentWorkspace?.id,
            displayName: currentChannel.name,
          }
        : null,
    [currentChannel?.id, currentWorkspace?.id, currentChannel?.name]
  );
  const channelConversationMessages = useMemo(() => {
    if (!channelConversationRef) return [];
    return messages.map((m) => normalizeMessage(channelConversationRef, m));
  }, [messages, channelConversationRef]);

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
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [showUnreadFeed, setShowUnreadFeed] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showFlows, setShowFlows] = useState(false);
  const [activeSection, setActiveSection] = useState<"channels" | "dms">("channels");
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Close thread panel with Escape
  const handleGlobalEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && threadMessage) {
      setThreadMessage(null);
    }
  }, [threadMessage]);

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalEscape);
    return () => window.removeEventListener("keydown", handleGlobalEscape);
  }, [handleGlobalEscape]);

  const { data: pendingTasksList = [] } = usePendingTasks(currentWorkspace?.id || null);

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

  // Auto-mark via hook centralizado (debounce + visibilidade + cancel-on-switch).
  // Apenas uma conversa ativa por vez: channel OU dm.
  const activeConvRef = currentChannel
    ? { type: "channel" as const, id: currentChannel.id }
    : selectedDM
      ? { type: "dm" as const, id: selectedDM.id }
      : null;
  const activeHasUnread = currentChannel
    ? (unreadChannelCounts[currentChannel.id] ?? 0) > 0
    : selectedDM
      ? (unreadDMCounts[selectedDM.id] ?? 0) > 0
      : false;
  useConversationReadStatus(activeConvRef, {
    autoMark: true,
    hasUnread: activeHasUnread,
  });

  // Side-effects de seleção (resetar a outra conversa e fechar Flows)
  // permanecem locais, mas SEM disparar markAsRead — isso é responsabilidade
  // do hook acima.
  useEffect(() => {
    if (currentChannel) {
      setSelectedDM(null);
      setShowFlows(false);
    }
  }, [currentChannel?.id]);

  useEffect(() => {
    if (selectedDM) {
      setCurrentChannel(null);
      setShowFlows(false);
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
      <div className="w-[68px] bg-sidebar border-r border-sidebar-border flex flex-col items-center py-3 gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative">
              <Avatar className="h-11 w-11 rounded-2xl cursor-pointer ring-1 ring-border/40 hover:ring-2 hover:ring-primary hover:rounded-xl transition-all duration-200 shadow-md-token">
                <AvatarImage src={currentWorkspace?.icon_url || undefined} />
                <AvatarFallback className="rounded-2xl gradient-primary text-white font-semibold tracking-tight">
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

        {/* Flows Button */}
        <Button
          variant={showFlows ? "default" : "ghost"}
          size="icon"
          className="rounded-xl relative"
          onClick={() => {
            setShowFlows(!showFlows);
            if (!showFlows) {
              setCurrentChannel(null);
              setSelectedDM(null);
            }
          }}
        >
          <ClipboardList className="h-5 w-5" />
          {pendingTasksList.length > 0 && (
            <span className="absolute -top-1 -right-1">
              <UnreadBadge count={pendingTasksList.length} size="sm" />
            </span>
          )}
        </Button>

        <NotificationCenter
          onNavigate={(notification: Notification) => {
            // Navigate to the relevant channel/DM based on notification metadata
            if (notification.metadata?.channel_id) {
              const channel = channels.find(c => c.id === notification.metadata?.channel_id);
              if (channel) {
                setCurrentChannel(channel);
                setSelectedDM(null);
              }
            } else if (notification.metadata?.dm_message_id || notification.type === "dm") {
              // Try to find the DM from metadata
              const dmId = notification.metadata?.sender_id;
              if (dmId) {
                const dm = dms.find(d => d.user1_id === dmId || d.user2_id === dmId);
                if (dm) {
                  setSelectedDM(dm);
                  setCurrentChannel(null);
                }
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

      {/* Expand sidebar button - visible when collapsed */}
      {sidebarCollapsed && (
        <div className="flex items-start pt-4 border-r border-sidebar-border bg-sidebar">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg mx-1"
            onClick={() => setSidebarCollapsed(false)}
            title="Expandir painel"
          >
            <ChevronDown className="h-4 w-4 rotate-90" />
          </Button>
        </div>
      )}

      {/* Second Sidebar - Channels & DMs (collapsible) */}
      <div className={`${sidebarCollapsed ? 'w-0 overflow-hidden opacity-0' : 'w-64 opacity-100'} sidebar-transition bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col`}>
        <div className="px-4 h-14 border-b border-sidebar-border flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-[15px] tracking-tight truncate">
            {currentWorkspace?.name || "Rambu"}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setShowSearch(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setSidebarCollapsed(true)}
              title="Recolher painel"
            >
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </Button>
          </div>
        </div>

        <div className="flex border-b border-sidebar-border px-2 pt-1">
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
                  <ChannelListSkeleton />
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
                  <DMListSkeleton />
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
      <div className="flex-1 flex min-h-0 min-w-0">
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {showFlows ? (
            <FlowsView
              onSelectChannel={(channelId) => {
                const channel = channels.find(c => c.id === channelId);
                if (channel) {
                  setCurrentChannel(channel);
                  setSelectedDM(null);
                  setShowFlows(false);
                }
              }}
            />
          ) : currentChannel ? (
            <>
              <div className="h-14 border-b border-border glass flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-channel-soft flex items-center justify-center shrink-0">
                    <Hash className="h-4 w-4 text-channel" />
                  </div>
                  <h2 className="font-semibold tracking-tight truncate">{currentChannel.name}</h2>
                  {currentChannel.description && (
                    <span className="text-xs text-muted-foreground truncate hidden md:inline">· {currentChannel.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ChannelMembersPopover channelId={currentChannel.id} />
                  <JumpToDateButton jumpToDate={jumpToDateMessages} isJumping={isJumpingMessages} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg"
                    onClick={() => setShowMediaGallery(true)}
                    title="Mídia compartilhada"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
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
                    onClick={() => setShowSearch(true)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  {(currentChannelRole === 'owner' || currentChannelRole === 'admin') && (
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-lg">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl w-48 z-[60]" sideOffset={4}>
                        <DropdownMenuItem
                          className="rounded-lg text-destructive focus:text-destructive cursor-pointer"
                          onSelect={() => {
                            if (confirm(`Remover o canal #${currentChannel.name}? Esta ação não pode ser desfeita.`)) {
                              deleteChannel.mutate(
                                { channelId: currentChannel.id, workspaceId: currentWorkspace!.id },
                                { onSuccess: () => setCurrentChannel(null) }
                              );
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover Canal
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-hidden min-h-0 flex">
                {channelConversationRef && (
                  <ConversationMessageList
                    conversation={channelConversationRef}
                    conversationName={currentChannel.name}
                    messages={channelConversationMessages}
                    isLoading={loadingMessages}
                    isFetchingMore={isFetchingMoreMessages}
                    hasMore={hasMoreMessages}
                    onLoadMore={loadMoreMessages}
                    onReply={setReplyTo}
                    onOpenThread={setThreadMessage}
                    viewDataById={channelViewDataById}
                    slackMode={layoutPreferences.slackMode}
                    density={layoutPreferences.density}
                  />
                )}
              </div>

              {/* Typing Indicator */}
              {isAnyoneTyping && (
                <TypingIndicator typingUsers={typingUsers} />
              )}

              <ConversationComposer
                conversation={{
                  type: "channel",
                  id: currentChannel.id,
                  displayName: currentChannel.name,
                }}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(undefined)}
                onTyping={(name) => sendTypingStart(name ?? "")}
                onStopTyping={sendTypingStop}
              />
            </>
          ) : selectedDM ? (
            <DMChatView dm={selectedDM} onBack={() => setSelectedDM(null)} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              {sidebarCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-4 left-4 rounded-lg"
                  onClick={() => setSidebarCollapsed(false)}
                >
                  <ChevronDown className="h-4 w-4 rotate-90 mr-1" />
                  Canais
                </Button>
              )}
              <div className="space-y-4 animate-fade-in">
                <div className="h-16 w-16 mx-auto rounded-2xl gradient-primary flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-bold">
                  Selecione uma conversa
                </h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Escolha um canal ou DM para começar.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setShowSearch(true)}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Buscar (⌘K)
                  </Button>
                </div>
              </div>
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
      <MediaGalleryDialog
        channelId={currentChannel?.id || null}
        channelName={currentChannel?.name}
        open={showMediaGallery}
        onOpenChange={setShowMediaGallery}
      />
      <GlobalDropOverlay enabled={!!currentChannel || !!selectedDM} />
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
