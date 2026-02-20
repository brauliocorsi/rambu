import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, CheckCheck, Trash2, AtSign, MessageSquare, Hash, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useNotificationsList,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useClearNotifications,
  useDeleteNotification,
  Notification,
} from "@/hooks/useInAppNotifications";
import { cn } from "@/lib/utils";

interface NotificationCenterProps {
  onNavigate?: (notification: Notification) => void;
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

  const getIcon = (type: string) => {
    switch (type) {
      case "mention":
        return <AtSign className="h-4 w-4 text-primary" />;
      case "dm":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "channel":
        return <Hash className="h-4 w-4 text-green-500" />;
      case "thread_reply":
        return <MessageSquare className="h-4 w-4 text-orange-500" />;
      case "reminder":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      onClick={handleClick}
      className={cn(
        "w-full text-left p-3 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors",
        !notification.is_read && "bg-primary/5"
      )}
    >
      <div className="flex gap-3">
        <div className="shrink-0 mt-0.5">{getIcon(notification.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-sm line-clamp-1", !notification.is_read && "font-medium")}>
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="shrink-0 h-2 w-2 rounded-full bg-primary mt-1" />
            )}
          </div>
          {notification.body && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {notification.body}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function NotificationList({
  notifications,
  emptyLabel,
  onDelete,
  onNavigate,
}: {
  notifications: Notification[];
  emptyLabel: string;
  onDelete: (id: string) => void;
  onNavigate?: (n: Notification) => void;
}) {
  if (notifications.length === 0) return <EmptyState label={emptyLabel} />;
  return (
    <AnimatePresence>
      {notifications.map((n) => (
        <NotificationItem key={n.id} notification={n} onDelete={onDelete} onNavigate={onNavigate} />
      ))}
    </AnimatePresence>
  );
}

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
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

  // Filter by type
  const mentions = notifications.filter((n) => n.type === "mention");
  const dms = notifications.filter((n) => n.type === "dm" || n.type === "thread_reply");
  const reminders = notifications.filter((n) => n.type === "reminder");

  const unreadMentions = mentions.filter((n) => !n.is_read).length;
  const unreadDMs = dms.filter((n) => !n.is_read).length;
  const unreadReminders = reminders.filter((n) => !n.is_read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold">Notificações</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => markAllAsRead.mutate()}
                title="Marcar todas como lidas"
              >
                <CheckCheck className="h-4 w-4" />
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
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <TabsList className="w-full rounded-none border-b border-border h-auto p-0 bg-transparent">
            <TabsTrigger
              value="all"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 text-xs"
            >
              Tudo
              {unreadCount > 0 && (
                <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="mentions"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 text-xs"
            >
              <AtSign className="h-3 w-3 mr-1" />
              Menções
              {unreadMentions > 0 && (
                <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {unreadMentions}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="dms"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 text-xs"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              DMs
              {unreadDMs > 0 && (
                <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {unreadDMs}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="reminders"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 text-xs"
            >
              <Clock className="h-3 w-3 mr-1" />
              Lembretes
              {unreadReminders > 0 && (
                <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {unreadReminders}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="max-h-80">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full"
                />
              </div>
            ) : (
              <>
                <TabsContent value="all" className="m-0">
                  <NotificationList
                    notifications={notifications}
                    emptyLabel="Nenhuma notificação"
                    onDelete={handleDelete}
                    onNavigate={handleNavigate}
                  />
                </TabsContent>
                <TabsContent value="mentions" className="m-0">
                  <NotificationList
                    notifications={mentions}
                    emptyLabel="Nenhuma menção"
                    onDelete={handleDelete}
                    onNavigate={handleNavigate}
                  />
                </TabsContent>
                <TabsContent value="dms" className="m-0">
                  <NotificationList
                    notifications={dms}
                    emptyLabel="Nenhum DM ou resposta em thread"
                    onDelete={handleDelete}
                    onNavigate={handleNavigate}
                  />
                </TabsContent>
                <TabsContent value="reminders" className="m-0">
                  <NotificationList
                    notifications={reminders}
                    emptyLabel="Nenhum lembrete"
                    onDelete={handleDelete}
                    onNavigate={handleNavigate}
                  />
                </TabsContent>
              </>
            )}
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
