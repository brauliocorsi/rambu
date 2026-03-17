import { MessageSquare, Hash, User, Inbox, ClipboardList } from "lucide-react";
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
  { id: "dms", icon: MessageSquare, label: "DMs" },
  { id: "channels", icon: Hash, label: "Canais" },
  { id: "unread", icon: Inbox, label: "Não Lidas" },
  { id: "flows", icon: ClipboardList, label: "Fluxos" },
  { id: "profile", icon: User, label: "Perfil" },
];

export function MobileNav({ activeTab, onTabChange, unreadDMs = 0, unreadChannels = 0, totalUnread = 0, pendingReminders = 0, pendingTasks = 0 }: MobileNavProps) {
  const getUnreadCount = (tabId: string) => {
    if (tabId === "dms") return unreadDMs;
    if (tabId === "channels") return unreadChannels;
    if (tabId === "unread") return totalUnread;
    if (tabId === "profile") return pendingReminders;
    if (tabId === "flows") return pendingTasks;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border safe-bottom bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-around py-1.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const unreadCount = getUnreadCount(tab.id);

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 min-w-[3rem] py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-110")} />
                {unreadCount > 0 && (
                  <div className="absolute -top-1.5 -right-2.5">
                    <UnreadBadge count={unreadCount} size="sm" />
                  </div>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all duration-200",
                isActive ? "opacity-100" : "opacity-60"
              )}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1.5 w-5 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
