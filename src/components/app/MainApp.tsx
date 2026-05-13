import { useState, useCallback, useMemo } from "react";
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
import { SavedMessagesPanel } from "@/components/message/SavedMessagesPanel";
import { ShortcutsDialog } from "@/components/shortcuts/ShortcutsDialog";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export function MainApp() {
  const [activeTab, setActiveTab] = useState("channels");
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [selectedDM, setSelectedDM] = useState<DirectMessage | null>(null);
  
  const { currentWorkspace } = useWorkspaceContext();
  const { currentChannel, setCurrentChannel } = useChannelContext();
  const { channels: unreadChannels, dms: unreadDMs } = useTotalUnreadCount(currentWorkspace?.id || null);
  const totalUnread = useFeedUnreadCount();
  const { data: pendingReminders = [] } = useReminders();
  const { data: pendingTasksList = [] } = usePendingTasks(currentWorkspace?.id || null);

  useKeyboardShortcuts([
    { key: "k", ctrl: true, action: () => setShowSearch(true), description: "Busca global" },
    { key: "/", ctrl: true, action: () => setShowShortcuts(true), description: "Mostrar atalhos" },
    { key: "Escape", action: () => { setShowSearch(false); setShowSaved(false); setShowShortcuts(false); }, description: "Fechar" },
  ]);

  const getTitle = useCallback(() => {
    if (showSettings) return "Configurações";
    if (activeTab === "channels" && currentChannel) {
      return `#${currentChannel.name}`;
    }
    if (activeTab === "dms" && selectedDM) {
      return selectedDM.other_user?.display_name || "Mensagem";
    }
    switch (activeTab) {
      case "unread": return "Não Lidas";
      case "dms": return "Mensagens";
      case "channels": return currentWorkspace ? currentWorkspace.name : "Canais";
      case "flows": return "Fluxos";
      case "reminders": return "Lembretes";
      case "profile": return "Perfil";
      default: return "Rambu";
    }
  }, [showSettings, activeTab, currentChannel, selectedDM, currentWorkspace]);

  const handleNavigateToDMs = useCallback(() => {
    setActiveTab("dms");
  }, []);

  const handleSelectDM = useCallback((dm: DirectMessage | null) => {
    setSelectedDM(dm);
    if (dm) {
      setActiveTab("dms");
    }
  }, []);

  const handleSelectChannel = useCallback((channelId: string) => {
    setActiveTab("channels");
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    if (tab !== "dms") {
      setSelectedDM(null);
    }
    if (tab !== "channels") {
      setCurrentChannel(null);
    }
    setShowSettings(false);
    setActiveTab(tab);
  }, [setCurrentChannel]);

  const content = useMemo(() => {
    if (showSettings) {
      return <SettingsView onBack={() => setShowSettings(false)} />;
    }

    switch (activeTab) {
      case "unread":
        return (
          <UnreadView
            onSelectChannel={handleSelectChannel}
            onSelectDM={() => setActiveTab("dms")}
            onSelectGroup={() => setActiveTab("dms")}
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
        return <ChannelsView />;
    }
  }, [showSettings, activeTab, selectedDM, handleSelectChannel]);

  // Hide bottom nav when inside a chat (DM selected or channel selected)
  const isInChat = !!(selectedDM || currentChannel);

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <Header 
        title={getTitle()} 
        onSearchClick={() => setShowSearch(true)}
      />
      <div className="absolute top-2 right-14 z-50 hidden md:block">
        <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={() => setShowSaved(true)} title="Mensagens salvas">
          <Bookmark className="h-4 w-4" />
        </Button>
      </div>
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full animate-fade-in" key={activeTab + (showSettings ? "s" : "")}>
          {content}
        </div>
      </main>
      {!isInChat && (
        <MobileNav 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          unreadDMs={unreadDMs}
          unreadChannels={unreadChannels}
          totalUnread={totalUnread}
          pendingReminders={pendingReminders.length}
          pendingTasks={pendingTasksList.length}
        />
      )}
      <SearchDialog 
        open={showSearch} 
        onClose={() => setShowSearch(false)}
        onSelectChannel={handleSelectChannel}
      />
      <SavedMessagesPanel open={showSaved} onOpenChange={setShowSaved} />
      <ShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
    </div>
  );
}
