import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useChannelContext } from "@/contexts/ChannelContext";
import { useViewMode } from "@/contexts/ViewModeContext";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import { CreateChannelDialog } from "@/components/channel/CreateChannelDialog";
import { ChannelList } from "@/components/channel/ChannelList";
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
import { MessageList } from "@/components/message/MessageList";
import { MessageInput } from "@/components/message/MessageInput";
import { DMChatView } from "@/components/dm/DMChatView";
import { DMList } from "@/components/dm/DMList";
import { NewDMDialog } from "@/components/dm/NewDMDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  MessageSquare, 
  Hash, 
  Users, 
  Plus, 
  ChevronRight,
  LogOut,
  Settings,
  Bell,
  Moon,
  Smartphone,
  Briefcase,
  ArrowLeft
} from "lucide-react";

// Home View
function HomeView() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Usuário";

  return (
    <div className="p-4 space-y-6">
      {/* Welcome section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h2 className="text-2xl font-bold">
          Olá, <span className="gradient-text">{displayName}</span>! 👋
        </h2>
        <p className="text-muted-foreground">O que você quer fazer hoje?</p>
      </motion.div>

      {/* Workspace Switcher */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <WorkspaceSwitcher />
      </motion.div>

      {/* Quick actions */}
      {currentWorkspace && (
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => setShowCreateChannel(true)}
            className="gradient-primary p-4 rounded-2xl flex flex-col items-center gap-2 text-white shadow-soft"
          >
            <Hash className="h-6 w-6" />
            <span className="text-sm font-medium">Criar Canal</span>
          </motion.button>
          {[
            { icon: MessageSquare, label: "Nova Mensagem", color: "bg-primary" },
            { icon: Users, label: "Convidar", color: "bg-accent" },
            { icon: Briefcase, label: "Novo Workspace", color: "bg-accent" },
          ].map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (i + 1) * 0.1 + 0.2 }}
              className={`${action.color} p-4 rounded-2xl flex flex-col items-center gap-2 text-white shadow-soft`}
            >
              <action.icon className="h-6 w-6" />
              <span className="text-sm font-medium">{action.label}</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Recent activity */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Atividade Recente</h3>
        <Card className="p-4 rounded-2xl">
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            {currentWorkspace ? (
              <p>Nenhuma atividade recente em {currentWorkspace.name}</p>
            ) : (
              <p>Crie um workspace para começar!</p>
            )}
          </div>
        </Card>
      </div>

      <CreateChannelDialog open={showCreateChannel} onClose={() => setShowCreateChannel(false)} />
    </div>
  );
}

// DMs View
function DMsView() {
  const { currentWorkspace } = useWorkspaceContext();
  const { data: dms = [], isLoading } = useDirectMessages(currentWorkspace?.id || null);
  const { data: unreadCounts = {} } = useUnreadDMCounts(currentWorkspace?.id || null);
  const markAsRead = useMarkDMAsRead();
  const [selectedDM, setSelectedDM] = useState<DirectMessage | null>(null);
  const [showNewDM, setShowNewDM] = useState(false);

  // Mark DM as read when selected
  useEffect(() => {
    if (selectedDM) {
      markAsRead.mutate(selectedDM.id);
    }
  }, [selectedDM?.id]);

  if (selectedDM) {
    return <DMChatView dm={selectedDM} onBack={() => setSelectedDM(null)} />;
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
            <p className="text-sm text-muted-foreground">Crie um workspace para iniciar conversas!</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Mensagens Diretas</h2>
        <Button 
          size="icon" 
          variant="ghost" 
          className="rounded-xl"
          onClick={() => setShowNewDM(true)}
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
      ) : dms.length === 0 ? (
        <Card className="p-8 rounded-2xl flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 rounded-full gradient-primary-soft flex items-center justify-center">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold">Nenhuma conversa</h3>
            <p className="text-sm text-muted-foreground">Inicie uma nova conversa!</p>
          </div>
          <Button 
            className="rounded-xl gradient-primary text-white"
            onClick={() => setShowNewDM(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Mensagem
          </Button>
        </Card>
      ) : (
        <Card className="p-2 rounded-2xl">
          <DMList 
            dms={dms} 
            selectedDM={selectedDM} 
            onSelectDM={setSelectedDM}
            unreadCounts={unreadCounts}
          />
        </Card>
      )}

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

// Channel Chat View
function ChannelChatView() {
  const { currentChannel, setCurrentChannel } = useChannelContext();
  const { data: messages = [], isLoading } = useMessages(currentChannel?.id || null);
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

// Channels View
function ChannelsView() {
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
          <ChannelList
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

// Notifications View
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

// Profile View
function ProfileView() {
  const { user, signOut } = useAuth();
  const { toggleViewMode } = useViewMode();
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Usuário";

  const menuItems = [
    { icon: Settings, label: "Configurações", action: () => {} },
    { icon: Bell, label: "Notificações", action: () => {} },
    { icon: Moon, label: "Modo Escuro", action: () => {} },
    { icon: Smartphone, label: "Versão Desktop", action: toggleViewMode },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative">
          <Avatar className="h-24 w-24 ring-4 ring-primary/20">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="text-2xl gradient-primary text-white">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full status-online border-2 border-background" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">{displayName}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="outline" className="rounded-xl">
          Editar Perfil
        </Button>
      </motion.div>

      {/* Menu */}
      <div className="space-y-2">
        {menuItems.map((item, i) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={item.action}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-card hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{item.label}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </motion.button>
        ))}
      </div>

      {/* Logout */}
      <Button
        variant="ghost"
        onClick={signOut}
        className="w-full h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <LogOut className="h-5 w-5 mr-2" />
        Sair da conta
      </Button>
    </div>
  );
}

export function MainApp() {
  const [activeTab, setActiveTab] = useState("home");
  const { currentWorkspace } = useWorkspaceContext();
  const { currentChannel } = useChannelContext();
  const { channels: unreadChannels, dms: unreadDMs } = useTotalUnreadCount(currentWorkspace?.id || null);

  const getTitle = () => {
    if (activeTab === "channels" && currentChannel) {
      return `#${currentChannel.name}`;
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

  const renderContent = () => {
    switch (activeTab) {
      case "home": return <HomeView />;
      case "dms": return <DMsView />;
      case "channels": return <ChannelsView />;
      case "notifications": return <NotificationsView />;
      case "profile": return <ProfileView />;
      default: return <HomeView />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title={getTitle()} />
      <main className="pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (currentChannel?.id || "")}
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
        onTabChange={setActiveTab}
        unreadDMs={unreadDMs}
        unreadChannels={unreadChannels}
      />
    </div>
  );
}
