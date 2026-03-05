import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useChannelContext } from "@/contexts/ChannelContext";
import { useTotalUnreadCount } from "@/hooks/useNotifications";
import { useTotalUnreadCount as useFeedUnreadCount } from "@/hooks/useUnreadFeed";
import { useReminders } from "@/hooks/useMessageReminders";
import { usePendingTasks } from "@/hooks/usePendingTasks";
import { DirectMessage } from "@/hooks/useDirectMessages";

// Views
import { HomeView } from "@/components/app/views/HomeView";
import { DMsView } from "@/components/app/views/DMsView";
import { ChannelsView } from "@/components/app/views/ChannelsView";
import { ProfileView } from "@/components/app/views/ProfileView";
import { UnreadView } from "@/components/app/views/UnreadView";
import { RemindersView } from "@/components/app/views/RemindersView";
import { FlowsView } from "@/components/app/views/FlowsView";
import { SettingsView } from "@/components/settings/SettingsView";
import { SearchDialog } from "@/components/search/SearchDialog";

export function MainApp() {
  const [activeTab, setActiveTab] = useState("channels");
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedDM, setSelectedDM] = useState<DirectMessage | null>(null);
  
  const { currentWorkspace } = useWorkspaceContext();
  const { currentChannel, setCurrentChannel } = useChannelContext();
  const { channels: unreadChannels, dms: unreadDMs } = useTotalUnreadCount(currentWorkspace?.id || null);
  const totalUnread = useFeedUnreadCount();
  const { data: pendingReminders = [] } = useReminders();
  const { data: pendingTasksList = [] } = usePendingTasks(currentWorkspace?.id || null);

  const getTitle = () => {
    if (showSettings) return "Configurações";
    if (activeTab === "channels" && currentChannel) {
      return `#${currentChannel.name}`;
    }
    if (activeTab === "dms" && selectedDM) {
      return selectedDM.other_user?.display_name || "Mensagem";
    }
    switch (activeTab) {
      case "home": return "Rambu";
      case "unread": return "Não Lidas";
      case "dms": return "Mensagens";
      case "channels": return currentWorkspace ? currentWorkspace.name : "Canais";
      case "flows": return "Fluxos";
      case "reminders": return "Lembretes";
      case "profile": return "Perfil";
      default: return "Rambu";
    }
  };

  const handleNavigateToDMs = () => {
    setActiveTab("dms");
  };

  const handleSelectDM = (dm: DirectMessage | null) => {
    setSelectedDM(dm);
    if (dm) {
      setActiveTab("dms");
    }
  };

  const handleSelectChannel = (channelId: string) => {
    // This would need to fetch the channel and set it
    setActiveTab("channels");
  };

  const renderContent = () => {
    if (showSettings) {
      return <SettingsView onBack={() => setShowSettings(false)} />;
    }

    switch (activeTab) {
      case "home": 
        return (
          <HomeView 
            onNavigateToDMs={handleNavigateToDMs}
            onSelectDM={handleSelectDM}
          />
        );
      case "unread":
        return (
          <UnreadView
            onSelectChannel={handleSelectChannel}
            onSelectDM={(dmId) => {
              // Navigate to DMs view - this needs to find the DM by ID
              setActiveTab("dms");
            }}
            onSelectGroup={(groupId) => {
              setActiveTab("dms");
            }}
          />
        );
      case "dms": 
        return (
          <DMsView 
            selectedDM={selectedDM}
            onSelectDM={setSelectedDM}
          />
        );
      case "channels": 
        return <ChannelsView />;
      case "flows":
        return <FlowsView onSelectChannel={handleSelectChannel} />;
      case "reminders":
        return <RemindersView />;
      case "profile": 
        return <ProfileView onOpenSettings={() => setShowSettings(true)} />;
      default: 
        return (
          <HomeView 
            onNavigateToDMs={handleNavigateToDMs}
            onSelectDM={handleSelectDM}
          />
        );
    }
  };

  // Reset selected DM when changing tabs
  const handleTabChange = (tab: string) => {
    if (tab !== "dms") {
      setSelectedDM(null);
    }
    if (tab !== "channels") {
      setCurrentChannel(null);
    }
    setShowSettings(false);
    setActiveTab(tab);
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <Header 
        title={getTitle()} 
        onSearchClick={() => setShowSearch(true)}
      />
      <main className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (currentChannel?.id || "") + (selectedDM?.id || "") + (showSettings ? "settings" : "")}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      <MobileNav 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        unreadDMs={unreadDMs}
        unreadChannels={unreadChannels}
        totalUnread={totalUnread}
        pendingReminders={pendingReminders.length}
        pendingTasks={pendingTasksList.length}
      />
      <SearchDialog 
        open={showSearch} 
        onClose={() => setShowSearch(false)}
        onSelectChannel={handleSelectChannel}
      />
    </div>
  );
}
