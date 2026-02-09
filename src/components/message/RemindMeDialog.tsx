import { useState } from "react";
import { Clock, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useCreateReminder, ReminderType } from "@/hooks/useMessageReminders";
import { format, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RemindMeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId?: string;
  dmMessageId?: string;
  groupMessageId?: string;
}

export function RemindMeDialog({
  open,
  onOpenChange,
  messageId,
  dmMessageId,
  groupMessageId,
}: RemindMeDialogProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const createReminder = useCreateReminder();

  const handleQuickReminder = async (type: ReminderType) => {
    await createReminder.mutateAsync({
      messageId,
      dmMessageId,
      groupMessageId,
      reminderType: type,
    });
    onOpenChange(false);
  };

  const handleCustomReminder = async () => {
    if (!selectedDate) return;
    
    // Set time to 9 AM
    const reminderDate = setMinutes(setHours(selectedDate, 9), 0);
    
    await createReminder.mutateAsync({
      messageId,
      dmMessageId,
      groupMessageId,
      reminderType: "custom",
      customDate: reminderDate,
    });
    onOpenChange(false);
    setShowCalendar(false);
    setSelectedDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Lembrar-me depois
          </DialogTitle>
          <DialogDescription>
            Escolha quando deseja ser lembrado sobre esta mensagem
          </DialogDescription>
        </DialogHeader>

        {!showCalendar ? (
          <div className="flex flex-col gap-2 pt-4">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleQuickReminder("1h")}
              disabled={createReminder.isPending}
            >
              <Clock className="h-4 w-4 mr-2" />
              Em 1 hora
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleQuickReminder("3h")}
              disabled={createReminder.isPending}
            >
              <Clock className="h-4 w-4 mr-2" />
              Em 3 horas
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleQuickReminder("tomorrow")}
              disabled={createReminder.isPending}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Amanhã às 9h
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => setShowCalendar(true)}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Escolher data...
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pt-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
            
            {selectedDate && (
              <p className="text-sm text-muted-foreground text-center">
                Lembrete: {format(selectedDate, "dd 'de' MMMM 'às' 9'h'", { locale: ptBR })}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCalendar(false);
                  setSelectedDate(undefined);
                }}
              >
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={handleCustomReminder}
                disabled={!selectedDate || createReminder.isPending}
              >
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
