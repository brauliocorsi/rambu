import { useState } from "react";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

interface JumpToDateButtonProps {
  jumpToDate: (date: Date) => Promise<void>;
  isJumping?: boolean;
}

export function JumpToDateButton({ jumpToDate, isJumping }: JumpToDateButtonProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = async (date: Date | undefined) => {
    if (!date) return;
    setOpen(false);
    await jumpToDate(date);
    // Wait a tick for DOM to render the day separator
    requestAnimationFrame(() => {
      const key = format(date, "yyyy-MM-dd");
      // Find closest day separator at or before the target
      const all = Array.from(document.querySelectorAll<HTMLElement>("[data-day]"));
      let target = all.find((el) => el.dataset.day === key);
      if (!target) {
        // Pick the closest earlier date available
        const sorted = all
          .map((el) => ({ el, d: el.dataset.day || "" }))
          .filter((x) => x.d && x.d <= key)
          .sort((a, b) => (a.d < b.d ? 1 : -1));
        target = sorted[0]?.el;
      }
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.classList.add("ring-2", "ring-primary", "rounded-lg");
        setTimeout(() => target?.classList.remove("ring-2", "ring-primary", "rounded-lg"), 1800);
      } else {
        toast.info("Nenhuma mensagem encontrada nesta data");
      }
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-lg" title="Ir para data" aria-label="Ir para data">
          {isJumping ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarIcon className="h-4 w-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0 z-[60]">
        <Calendar
          mode="single"
          locale={ptBR}
          onSelect={handleSelect}
          disabled={(d) => d > new Date()}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
