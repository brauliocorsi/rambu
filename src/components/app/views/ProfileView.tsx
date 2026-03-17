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

  const sections = [
    {
      title: "Conta",
      items: [
        { icon: Settings, label: "Configurações", action: onOpenSettings },
        { icon: Bell, label: "Notificações", action: onOpenSettings },
      ],
    },
    {
      title: "Aparência",
      items: [
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
      ],
    },
  ];

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full pb-24">
      {/* Profile header */}
      <div className="flex items-center gap-4 animate-fade-in">
        <Avatar className="h-16 w-16 ring-2 ring-primary/20">
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback className="text-lg gradient-primary text-primary-foreground">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{displayName}</h2>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          <button
            onClick={onOpenSettings}
            className="text-xs text-primary mt-1 hover:underline"
          >
            Editar perfil
          </button>
        </div>
      </div>

      {/* Grouped menu */}
      {sections.map((section, si) => (
        <div key={section.title} className="space-y-1 animate-fade-in" style={{ animationDelay: `${(si + 1) * 50}ms` }}>
          <h3 className="text-xs font-medium text-muted-foreground px-1 mb-1.5">{section.title}</h3>
          <div className="rounded-xl border border-border overflow-hidden">
            {section.items.map((item, i) => (
              <button
                key={item.label}
                onClick={item.action}
                className="w-full flex items-center justify-between p-3 bg-card hover:bg-secondary/50 transition-colors active:scale-[0.99]"
                style={{ borderTop: i > 0 ? '1px solid hsl(var(--border))' : undefined }}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{item.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Logout */}
      <Button
        variant="ghost"
        onClick={signOut}
        className="w-full h-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 text-sm"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sair da conta
      </Button>
    </div>
  );
}
