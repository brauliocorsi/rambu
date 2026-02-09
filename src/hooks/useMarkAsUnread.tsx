import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useMarkChannelAsUnread() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, messageCreatedAt }: { channelId: string; messageCreatedAt: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Set last_read_at to 1 second before the message
      const unreadTime = new Date(new Date(messageCreatedAt).getTime() - 1000).toISOString();

      const { error } = await supabase
        .from("channel_read_status")
        .upsert({
          channel_id: channelId,
          user_id: user.id,
          last_read_at: unreadTime,
        }, {
          onConflict: "channel_id,user_id",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-channels"] });
      queryClient.invalidateQueries({ queryKey: ["unread-feed"] });
      toast.success("Marcado como não lido");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao marcar como não lido");
    },
  });
}

export function useMarkDMAsUnread() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dmId, messageCreatedAt }: { dmId: string; messageCreatedAt: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Set last_read_at to 1 second before the message
      const unreadTime = new Date(new Date(messageCreatedAt).getTime() - 1000).toISOString();

      const { error } = await supabase
        .from("dm_read_status")
        .upsert({
          dm_id: dmId,
          user_id: user.id,
          last_read_at: unreadTime,
        }, {
          onConflict: "dm_id,user_id",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-dms"] });
      queryClient.invalidateQueries({ queryKey: ["unread-feed"] });
      toast.success("Marcado como não lido");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao marcar como não lido");
    },
  });
}
