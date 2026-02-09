import { useState } from "react";
import { format, addHours, addDays, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Calendar, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ScheduleMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (date: Date) => void;
  messagePreview?: string;
}

const QUICK_OPTIONS = [
  { label: "Em 1 hora", getValue: () => addHours(new Date(), 1) },
  { label: "Em 3 horas", getValue: () => addHours(new Date(), 3) },
  { label: "Amanhã às 9h", getValue: () => setMinutes(setHours(addDays(new Date(), 1), 9), 0) },
  { label: "Amanhã às 14h", getValue: () => setMinutes(setHours(addDays(new Date(), 1), 14), 0) },
];

export function ScheduleMessageDialog({
  open,
  onOpenChange,
  onSchedule,
  messagePreview,
}: ScheduleMessageDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("09:00");
  const [showCalendar, setShowCalendar] = useState(false);

  const handleQuickOption = (getValue: () => Date) => {
    const date = getValue();
    onSchedule(date);
    onOpenChange(false);
  };

  const handleCustomSchedule = () => {
    if (!selectedDate) return;
    
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledDate = setMinutes(setHours(selectedDate, hours), minutes);
    
    if (scheduledDate <= new Date()) {
      return; // Don't allow past dates
    }
    
    onSchedule(scheduledDate);
    onOpenChange(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setShowCalendar(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Agendar Mensagem
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {messagePreview && (
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Mensagem:</p>
              <p className="text-sm line-clamp-2">{messagePreview}</p>
            </div>
          )}

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              Opções Rápidas
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_OPTIONS.map((option) => (
                <Button
                  key={option.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickOption(option.getValue)}
                  className="justify-start"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                ou escolha data e hora
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate
                    ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
                    : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-28"
            />
          </div>

          {selectedDate && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedDate(undefined)}>
                Limpar
              </Button>
              <Button onClick={handleCustomSchedule} className="gradient-primary text-white">
                Agendar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
