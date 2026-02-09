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
import { ReminderType, ReminderWithMessage } from "@/hooks/useMessageReminders";
import { format, setHours, setMinutes, addHours, addDays, startOfTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EditReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: ReminderWithMessage;
  onSave: (remindAt: Date) => Promise<void>;
  isPending: boolean;
}

function getQuickTime(type: ReminderType): Date {
  const now = new Date();
  switch (type) {
    case "1h":
      return addHours(now, 1);
    case "3h":
      return addHours(now, 3);
    case "tomorrow":
      return setHours(startOfTomorrow(), 9);
    default:
      return addHours(now, 1);
  }
}

export function EditReminderDialog({
  open,
  onOpenChange,
  reminder,
  onSave,
  isPending,
}: EditReminderDialogProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();

  const handleQuickReminder = async (type: ReminderType) => {
    const newTime = getQuickTime(type);
    await onSave(newTime);
    onOpenChange(false);
  };

  const handleCustomReminder = async () => {
    if (!selectedDate) return;
    const reminderDate = setMinutes(setHours(selectedDate, 9), 0);
    await onSave(reminderDate);
    onOpenChange(false);
    setShowCalendar(false);
    setSelectedDate(undefined);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setShowCalendar(false);
      setSelectedDate(undefined);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Editar lembrete
          </DialogTitle>
          <DialogDescription>
            Atual: {format(new Date(reminder.remind_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        {!showCalendar ? (
          <div className="flex flex-col gap-2 pt-4">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleQuickReminder("1h")}
              disabled={isPending}
            >
              <Clock className="h-4 w-4 mr-2" />
              Em 1 hora
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleQuickReminder("3h")}
              disabled={isPending}
            >
              <Clock className="h-4 w-4 mr-2" />
              Em 3 horas
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleQuickReminder("tomorrow")}
              disabled={isPending}
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
                Novo lembrete: {format(selectedDate, "dd 'de' MMMM 'às' 9'h'", { locale: ptBR })}
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
                disabled={!selectedDate || isPending}
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
