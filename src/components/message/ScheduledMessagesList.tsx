import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, X, Hash, MessageSquare, Pencil, Check, Calendar } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  useScheduledMessages,
  useCancelScheduledMessage,
  useUpdateScheduledMessage,
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
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [editDate, setEditDate] = useState<Date>(new Date(message.scheduled_at));
  const [editTime, setEditTime] = useState(format(new Date(message.scheduled_at), "HH:mm"));
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const updateMessage = useUpdateScheduledMessage();

  const scheduledDate = new Date(message.scheduled_at);
  const isToday = new Date().toDateString() === scheduledDate.toDateString();

  const handleSave = async () => {
    const [hours, minutes] = editTime.split(":").map(Number);
    const newScheduledAt = new Date(editDate);
    newScheduledAt.setHours(hours, minutes, 0, 0);

    await updateMessage.mutateAsync({
      messageId: message.id,
      content: editContent.trim(),
      scheduledAt: newScheduledAt,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
    setEditDate(new Date(message.scheduled_at));
    setEditTime(format(new Date(message.scheduled_at), "HH:mm"));
  };

  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="p-3 bg-secondary/50 rounded-xl space-y-3 border border-primary/30"
      >
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

        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm"
          rows={3}
          autoFocus
        />

        <div className="flex items-center gap-2">
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {format(editDate, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={editDate}
                onSelect={(date) => {
                  if (date) {
                    setEditDate(date);
                    setShowDatePicker(false);
                  }
                }}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <input
            type="time"
            value={editTime}
            onChange={(e) => setEditTime(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancelEdit}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateMessage.isPending || !editContent.trim()}
            className="gap-1"
          >
            <Check className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="p-3 bg-secondary/50 rounded-xl space-y-2 group"
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setIsEditing(true)}
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setShowCancelDialog(true)}
              title="Cancelar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
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

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar mensagem agendada?</AlertDialogTitle>
            <AlertDialogDescription>
              A mensagem não será enviada e será removida da lista de agendadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar Mensagem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
