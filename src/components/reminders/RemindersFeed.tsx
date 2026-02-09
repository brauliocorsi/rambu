import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isPast, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAllReminders, useDeleteReminder, ReminderWithMessage } from "@/hooks/useMessageReminders";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  Hash, 
  MessageSquare, 
  Users, 
  Trash2, 
  CheckCircle2,
  Bell,
  BellOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

function ReminderCard({ reminder, onDelete }: { reminder: ReminderWithMessage; onDelete: () => void }) {
  const isPastDue = isPast(new Date(reminder.remind_at));
  const deleteReminder = useDeleteReminder();

  // Determine message source and content
  let content = "";
  let senderName = "Usuário";
  let avatarUrl: string | null = null;
  let sourceIcon = <MessageSquare className="h-4 w-4" />;
  let sourceName = "Mensagem";

  if (reminder.message) {
    content = reminder.message.content;
    senderName = reminder.message.profile?.display_name || "Usuário";
    avatarUrl = reminder.message.profile?.avatar_url || null;
    sourceIcon = <Hash className="h-4 w-4" />;
    sourceName = reminder.message.channel?.name || "Canal";
  } else if (reminder.dm_message) {
    content = reminder.dm_message.content;
    senderName = reminder.dm_message.profile?.display_name || "Usuário";
    avatarUrl = reminder.dm_message.profile?.avatar_url || null;
    sourceIcon = <MessageSquare className="h-4 w-4" />;
    sourceName = "Mensagem direta";
  } else if (reminder.group_message) {
    content = reminder.group_message.content;
    senderName = reminder.group_message.profile?.display_name || "Usuário";
    avatarUrl = reminder.group_message.profile?.avatar_url || null;
    sourceIcon = <Users className="h-4 w-4" />;
    sourceName = reminder.group_message.group?.name || "Grupo";
  }

  const handleDelete = () => {
    deleteReminder.mutate(reminder.id, {
      onSuccess: onDelete,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
    >
      <Card className={cn(
        "p-4 rounded-xl transition-all",
        reminder.is_completed 
          ? "opacity-60 bg-secondary/30" 
          : isPastDue 
            ? "border-primary/50 bg-primary/5" 
            : "hover:shadow-md"
      )}>
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="gradient-primary text-white text-sm">
              {senderName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate">{senderName}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  {sourceIcon}
                  <span className="truncate max-w-[100px]">{sourceName}</span>
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={handleDelete}
                disabled={deleteReminder.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <p className="text-sm text-foreground line-clamp-2 mb-2">
              {content || <span className="text-muted-foreground italic">Mensagem não disponível</span>}
            </p>

            {/* Footer */}
            <div className="flex items-center gap-2 text-xs">
              {reminder.is_completed ? (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Concluído
                </span>
              ) : isPastDue ? (
                <span className="flex items-center gap-1 text-primary font-medium">
                  <Bell className="h-3.5 w-3.5" />
                  Venceu {formatDistanceToNow(new Date(reminder.remind_at), { locale: ptBR, addSuffix: true })}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDistanceToNow(new Date(reminder.remind_at), { locale: ptBR, addSuffix: true })}
                </span>
              )}
              
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {format(new Date(reminder.remind_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function RemindersFeed() {
  const { data, isLoading, refetch } = useAllReminders();
  const [activeTab, setActiveTab] = useState("pending");

  const pendingCount = data?.pending?.length || 0;
  const completedCount = data?.completed?.length || 0;

  if (isLoading) {
    return (
      <div className="p-4">
        <Card className="p-8 rounded-2xl flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
          <Bell className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Lembretes</h2>
          <p className="text-sm text-muted-foreground">
            {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-xl">
          <TabsTrigger value="pending" className="rounded-lg gap-2">
            <Clock className="h-4 w-4" />
            Pendentes
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Concluídos
            {completedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                {completedCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <AnimatePresence mode="popLayout">
              {data?.pending && data.pending.length > 0 ? (
                <div className="space-y-3 pr-2">
                  {data.pending.map((reminder) => (
                    <ReminderCard 
                      key={reminder.id} 
                      reminder={reminder} 
                      onDelete={() => refetch()}
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-8 rounded-2xl flex flex-col items-center justify-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
                    <BellOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold">Nenhum lembrete pendente</h3>
                    <p className="text-sm text-muted-foreground">
                      Use "Lembrar depois" nas mensagens para criar lembretes
                    </p>
                  </div>
                </Card>
              )}
            </AnimatePresence>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <AnimatePresence mode="popLayout">
              {data?.completed && data.completed.length > 0 ? (
                <div className="space-y-3 pr-2">
                  {data.completed.map((reminder) => (
                    <ReminderCard 
                      key={reminder.id} 
                      reminder={reminder} 
                      onDelete={() => refetch()}
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-8 rounded-2xl flex flex-col items-center justify-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold">Nenhum lembrete concluído</h3>
                    <p className="text-sm text-muted-foreground">
                      Lembretes vencidos aparecerão aqui
                    </p>
                  </div>
                </Card>
              )}
            </AnimatePresence>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
