import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type SnoozeDuration = "1h" | "8h" | "24h" | "7d" | "until_morning" | "clear";

function durationToDate(d: SnoozeDuration): Date | null {
  const now = new Date();
  switch (d) {
    case "1h": return new Date(now.getTime() + 60 * 60 * 1000);
    case "8h": return new Date(now.getTime() + 8 * 60 * 60 * 1000);
    case "24h": return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "7d": return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "until_morning": {
      const d = new Date(now);
      d.setHours(8, 0, 0, 0);
      if (d <= now) d.setDate(d.getDate() + 1);
      return d;
    }
    case "clear":
      return null;
  }
}

export function useSnoozeChannel() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ channelId, duration }: { channelId: string; duration: SnoozeDuration }) => {
      if (!user) throw new Error("Not authenticated");
      const until = durationToDate(duration);
      const { error } = await supabase
        .from("channel_notification_preferences")
        .upsert(
          {
            user_id: user.id,
            channel_id: channelId,
            notification_level: "all",
            snoozed_until: until ? until.toISOString() : null,
          },
          { onConflict: "user_id,channel_id" }
        );
      if (error) throw error;
      return { channelId, until };
    },
    onSuccess: ({ until }) => {
      qc.invalidateQueries({ queryKey: ["channel-notification-preferences"] });
      qc.invalidateQueries({ queryKey: ["channel-notification-preference"] });
      toast.success(until ? `Silenciado até ${until.toLocaleString("pt-BR")}` : "Silenciamento removido");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao silenciar"),
  });
}

export const SNOOZE_OPTIONS: { value: SnoozeDuration; label: string }[] = [
  { value: "1h", label: "Por 1 hora" },
  { value: "8h", label: "Por 8 horas" },
  { value: "24h", label: "Por 24 horas" },
  { value: "7d", label: "Por 7 dias" },
  { value: "until_morning", label: "Até amanhã às 8h" },
  { value: "clear", label: "Remover silenciamento" },
];