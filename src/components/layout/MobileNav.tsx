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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-bottom border-t border-[hsl(var(--rambu-border))]/70 bg-[hsl(var(--rambu-chat-bg))]/85 backdrop-blur-xl supports-[backdrop-filter]:bg-[hsl(var(--rambu-chat-bg))]/70"
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="flex items-center justify-around px-1 pt-1.5 pb-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const unreadCount = getUnreadCount(tab.id);

          return (
              <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[44px] min-w-[44px] py-1.5 px-2 rounded-xl transition-colors duration-150 press-scale",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--rambu-hover))]/60"
              )}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-b-full bg-primary"
                />
              )}
              <div className="relative">
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-transform duration-150",
                    isActive ? "scale-105" : ""
                  )}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                {unreadCount > 0 && (
                  <div className="absolute -top-1.5 -right-2.5" aria-label={`${unreadCount} não lidas`}>
                    <UnreadBadge count={unreadCount} size="sm" />
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] leading-none tracking-tight transition-all duration-150",
                  isActive ? "font-semibold opacity-100" : "font-medium opacity-70"
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
