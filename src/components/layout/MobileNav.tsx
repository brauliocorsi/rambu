import { Home, MessageSquare, Hash, Bell, User } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "home", icon: Home, label: "Home" },
  { id: "dms", icon: MessageSquare, label: "DMs" },
  { id: "channels", icon: Hash, label: "Canais" },
  { id: "notifications", icon: Bell, label: "Alertas" },
  { id: "profile", icon: User, label: "Perfil" },
];

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-bottom">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 gradient-primary-soft rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Icon className="h-5 w-5 relative z-10" />
              </motion.div>
              <span className="text-xs font-medium relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
