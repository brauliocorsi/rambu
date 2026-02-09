import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, X, Hash, MessageSquare, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  useScheduledMessages,
  useCancelScheduledMessage,
  ScheduledMessage,
} from "@/hooks/useScheduledMessages";

interface ScheduledMessagesListProps {
  trigger?: React.ReactNode;
}

export function ScheduledMessagesList({ trigger }: ScheduledMessagesListProps) {
  const { data: scheduledMessages = [], isLoading } = useScheduledMessages();
  const cancelMessage = useCancelScheduledMessage();

  const handleCancel = (messageId: string) => {
    cancelMessage.mutate(messageId);
  };

  const pendingCount = scheduledMessages.length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Clock className="h-4 w-4" />
            Agendadas
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingCount}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Mensagens Agendadas
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full"
              />
            </div>
          ) : scheduledMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma mensagem agendada</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {scheduledMessages.map((message) => (
                  <ScheduledMessageCard
                    key={message.id}
                    message={message}
                    onCancel={() => handleCancel(message.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function ScheduledMessageCard({
  message,
  onCancel,
}: {
  message: ScheduledMessage;
  onCancel: () => void;
}) {
  const scheduledDate = new Date(message.scheduled_at);
  const isToday = new Date().toDateString() === scheduledDate.toDateString();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-3 bg-secondary/50 rounded-xl space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          {message.channel_id ? (
            <>
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{message.channel?.name || "Canal"}</span>
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Mensagem Direta</span>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-sm line-clamp-2">{message.content}</p>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>
            {isToday
              ? `Hoje às ${format(scheduledDate, "HH:mm", { locale: ptBR })}`
              : format(scheduledDate, "dd/MM 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
