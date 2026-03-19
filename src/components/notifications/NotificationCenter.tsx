import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, CheckCheck, Trash2, AtSign, MessageSquare, Clock, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotificationsList,
  useUnreadNotificationCount,
  useMarkAllNotificationsAsRead,
  useClearNotifications,
  useDeleteNotification,
  Notification,
} from "@/hooks/useInAppNotifications";
import { cn } from "@/lib/utils";

interface NotificationCenterProps {
  onNavigate?: (notification: Notification) => void;
}

type FilterType = "all" | "mentions" | "dms" | "reminders";

const FILTERS: { id: FilterType; label: string; icon: typeof Bell }[] = [
  { id: "all", label: "Tudo", icon: Inbox },
  { id: "mentions", label: "Menções", icon: AtSign },
  { id: "dms", label: "Mensagens", icon: MessageSquare },
  { id: "reminders", label: "Lembretes", icon: Clock },
];

function getNotificationIcon(type: string) {
  switch (type) {
    case "mention":
    case "task_assigned":
      return <AtSign className="h-4 w-4 text-primary" />;
    case "dm":
      return <MessageSquare className="h-4 w-4 text-accent-foreground" />;
    case "thread_reply":
      return <MessageSquare className="h-4 w-4 text-accent-foreground" />;
    case "reminder":
      return <Clock className="h-4 w-4 text-accent-foreground" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function NotificationItem({
  notification,
  onDelete,
  onNavigate,
}: {
  notification: Notification;
  onDelete: (id: string) => void;
  onNavigate?: (n: Notification) => void;
}) {
  const handleClick = () => {
    onDelete(notification.id);
    onNavigate?.(notification);
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
      onClick={handleClick}
      className={cn(
        "w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary/60 active:bg-secondary",
        !notification.is_read && "bg-primary/[0.03]"
      )}
    >
      <div className="shrink-0 mt-0.5 h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
        {getNotificationIcon(notification.type)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm leading-snug line-clamp-1 flex-1", !notification.is_read ? "font-semibold text-foreground" : "text-foreground/80")}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </div>
        {notification.body && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {notification.body}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
            locale: ptBR,
          })}
        </p>
      </div>
    </motion.button>
  );
}

function EmptyState({ filter }: { filter: FilterType }) {
  const messages: Record<FilterType, { icon: typeof Bell; text: string }> = {
    all: { icon: Bell, text: "Nenhuma notificação" },
    mentions: { icon: AtSign, text: "Nenhuma menção" },
    dms: { icon: MessageSquare, text: "Nenhuma mensagem" },
    reminders: { icon: Clock, text: "Nenhum lembrete" },
  };

  const { icon: Icon, text } = messages[filter];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <div className="h-12 w-12 rounded-full bg-secondary/80 flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 opacity-50" />
      </div>
      <p className="text-sm">{text}</p>
      <p className="text-xs text-muted-foreground/60 mt-0.5">Você está em dia!</p>
    </div>
  );
}

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const { data: notifications = [], isLoading } = useNotificationsList();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const clearAll = useClearNotifications();
  const deleteNotification = useDeleteNotification();

  const handleDelete = (id: string) => {
    deleteNotification.mutate(id);
  };

  const handleNavigate = (notification: Notification) => {
    onNavigate?.(notification);
    setOpen(false);
  };

  const getFilteredNotifications = (filter: FilterType) => {
    switch (filter) {
      case "mentions":
        return notifications.filter((n) => n.type === "mention" || n.type === "task_assigned");
      case "dms":
        return notifications.filter((n) => n.type === "dm" || n.type === "thread_reply");
      case "reminders":
        return notifications.filter((n) => n.type === "reminder");
      default:
        return notifications;
    }
  };

  const getUnreadForFilter = (filter: FilterType) => {
    return getFilteredNotifications(filter).filter((n) => !n.is_read).length;
  };

  const filtered = getFilteredNotifications(activeFilter);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 h-4.5 min-w-4.5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[380px] p-0 rounded-2xl overflow-hidden" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h3 className="text-base font-semibold">Notificações</h3>
          <div className="flex items-center gap-0.5">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => markAllAsRead.mutate()}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Ler tudo
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => clearAll.mutate()}
                title="Limpar todas"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border/30">
          {FILTERS.map(({ id, label, icon: Icon }) => {
            const count = getUnreadForFilter(id);
            const isActive = activeFilter === id;
            return (
              <button
                key={id}
                onClick={() => setActiveFilter(id)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
                {count > 0 && (
                  <span className={cn(
                    "ml-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[360px]">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full"
              />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState filter={activeFilter} />
          ) : (
            <div className="divide-y divide-border/30">
              <AnimatePresence mode="popLayout">
                {filtered.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onDelete={handleDelete}
                    onNavigate={handleNavigate}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
