import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useChannelContext } from "@/contexts/ChannelContext";
import { useTotalUnreadCount } from "@/hooks/useNotifications";
import { DirectMessage } from "@/hooks/useDirectMessages";

// Views
import { HomeView } from "@/components/app/views/HomeView";
import { DMsView } from "@/components/app/views/DMsView";
import { ChannelsView } from "@/components/app/views/ChannelsView";
import { ProfileView } from "@/components/app/views/ProfileView";
import { SettingsView } from "@/components/settings/SettingsView";
import { SearchDialog } from "@/components/search/SearchDialog";

// Notification placeholder
import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";

function NotificationsView() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Notificações</h2>
      <Card className="p-8 rounded-2xl flex flex-col items-center justify-center gap-4">
        <div className="h-16 w-16 rounded-full gradient-primary-soft flex items-center justify-center">
          <Bell className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold">Tudo em dia!</h3>
          <p className="text-sm text-muted-foreground">Você não tem notificações pendentes.</p>
        </div>
      </Card>
    </div>
  );
}

export function MainApp() {
  const [activeTab, setActiveTab] = useState("home");
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedDM, setSelectedDM] = useState<DirectMessage | null>(null);
  
  const { currentWorkspace } = useWorkspaceContext();
  const { currentChannel, setCurrentChannel } = useChannelContext();
  const { channels: unreadChannels, dms: unreadDMs } = useTotalUnreadCount(currentWorkspace?.id || null);

  const getTitle = () => {
    if (showSettings) return "Configurações";
    if (activeTab === "channels" && currentChannel) {
      return `#${currentChannel.name}`;
    }
    if (activeTab === "dms" && selectedDM) {
      return selectedDM.other_user?.display_name || "Mensagem";
    }
    switch (activeTab) {
      case "home": return "ChatFlow";
      case "dms": return "Mensagens";
      case "channels": return currentWorkspace ? currentWorkspace.name : "Canais";
      case "notifications": return "Notificações";
      case "profile": return "Perfil";
      default: return "ChatFlow";
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
      case "dms": 
        return (
          <DMsView 
            selectedDM={selectedDM}
            onSelectDM={setSelectedDM}
          />
        );
      case "channels": 
        return <ChannelsView />;
      case "notifications": 
        return <NotificationsView />;
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
    <div className="min-h-screen bg-background">
      <Header 
        title={getTitle()} 
        onSearchClick={() => setShowSearch(true)}
      />
      <main className="pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (currentChannel?.id || "") + (selectedDM?.id || "") + (showSettings ? "settings" : "")}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
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
      />
      <SearchDialog 
        open={showSearch} 
        onClose={() => setShowSearch(false)}
        onSelectChannel={handleSelectChannel}
      />
    </div>
  );
}
