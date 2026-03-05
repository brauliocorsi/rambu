import { Home, MessageSquare, Hash, User, Inbox, Bell, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { UnreadBadge } from "@/components/ui/UnreadBadge";

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadDMs?: number;
  unreadChannels?: number;
  totalUnread?: number;
  pendingReminders?: number;
  pendingTasks?: number;
}

const tabs = [
  { id: "home", icon: Home, label: "Home" },
  { id: "unread", icon: Inbox, label: "Não Lidas" },
  { id: "dms", icon: MessageSquare, label: "DMs" },
  { id: "channels", icon: Hash, label: "Canais" },
  { id: "tasks", icon: ClipboardList, label: "Tarefas" },
  { id: "reminders", icon: Bell, label: "Lembretes" },
  { id: "profile", icon: User, label: "Perfil" },
];

export function MobileNav({ activeTab, onTabChange, unreadDMs = 0, unreadChannels = 0, totalUnread = 0, pendingReminders = 0, pendingTasks = 0 }: MobileNavProps) {
  const getUnreadCount = (tabId: string) => {
    if (tabId === "dms") return unreadDMs;
    if (tabId === "channels") return unreadChannels;
    if (tabId === "unread") return totalUnread;
    if (tabId === "reminders") return pendingReminders;
    if (tabId === "tasks") return pendingTasks;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-bottom">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const unreadCount = getUnreadCount(tab.id);

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
                className="relative"
              >
                <Icon className="h-5 w-5 relative z-10" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5">
                    <UnreadBadge count={unreadCount} size="sm" />
                  </div>
                )}
              </motion.div>
              <span className="text-xs font-medium relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
