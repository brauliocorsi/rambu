import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useViewMode } from "@/contexts/ViewModeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight,
  LogOut,
  Settings,
  Bell,
  Moon,
  Sun,
  Smartphone,
  Monitor,
} from "lucide-react";

interface ProfileViewProps {
  onOpenSettings: () => void;
}

export function ProfileView({ onOpenSettings }: ProfileViewProps) {
  const { user, signOut } = useAuth();
  const { toggleViewMode, isMobile } = useViewMode();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Usuário";

  const handleThemeToggle = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const menuItems = [
    { icon: Settings, label: "Configurações", action: onOpenSettings },
    { icon: Bell, label: "Notificações", action: onOpenSettings },
    { 
      icon: resolvedTheme === "dark" ? Sun : Moon, 
      label: resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro", 
      action: handleThemeToggle 
    },
    { 
      icon: isMobile ? Monitor : Smartphone, 
      label: isMobile ? "Versão Desktop" : "Versão Mobile", 
      action: toggleViewMode 
    },
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
        <Button variant="outline" className="rounded-xl" onClick={onOpenSettings}>
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
