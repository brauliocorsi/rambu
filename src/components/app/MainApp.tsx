import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
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
  Sun,
  Smartphone
} from "lucide-react";

// Home View
function HomeView() {
  const { user } = useAuth();
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

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Plus, label: "Novo Workspace", color: "gradient-primary" },
          { icon: Hash, label: "Criar Canal", color: "bg-accent" },
          { icon: MessageSquare, label: "Nova Mensagem", color: "bg-primary" },
          { icon: Users, label: "Convidar", color: "bg-accent" },
        ].map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`${i === 0 ? action.color : ""} ${i !== 0 ? action.color : ""} p-4 rounded-2xl flex flex-col items-center gap-2 text-white shadow-soft`}
          >
            <action.icon className="h-6 w-6" />
            <span className="text-sm font-medium">{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Recent activity */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Atividade Recente</h3>
        <Card className="p-4 rounded-2xl">
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            <p>Nenhuma atividade recente</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

// DMs View
function DMsView() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Mensagens Diretas</h2>
        <Button size="icon" variant="ghost" className="rounded-xl">
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      <Card className="p-8 rounded-2xl flex flex-col items-center justify-center gap-4">
        <div className="h-16 w-16 rounded-full gradient-primary-soft flex items-center justify-center">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold">Nenhuma conversa</h3>
          <p className="text-sm text-muted-foreground">Inicie uma nova conversa!</p>
        </div>
        <Button className="rounded-xl gradient-primary text-white">
          <Plus className="h-4 w-4 mr-2" />
          Nova Mensagem
        </Button>
      </Card>
    </div>
  );
}

// Channels View
function ChannelsView() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Canais</h2>
        <Button size="icon" variant="ghost" className="rounded-xl">
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      <Card className="p-8 rounded-2xl flex flex-col items-center justify-center gap-4">
        <div className="h-16 w-16 rounded-full gradient-primary-soft flex items-center justify-center">
          <Hash className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold">Nenhum canal</h3>
          <p className="text-sm text-muted-foreground">Crie ou entre em um canal!</p>
        </div>
        <Button className="rounded-xl gradient-primary text-white">
          <Plus className="h-4 w-4 mr-2" />
          Criar Canal
        </Button>
      </Card>
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
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Usuário";

  const menuItems = [
    { icon: Settings, label: "Configurações", action: () => {} },
    { icon: Bell, label: "Notificações", action: () => {} },
    { icon: Moon, label: "Modo Escuro", action: () => {} },
    { icon: Smartphone, label: "Versão Desktop", action: () => {} },
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

  const getTitle = () => {
    switch (activeTab) {
      case "home": return "ChatFlow";
      case "dms": return "Mensagens";
      case "channels": return "Canais";
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
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
