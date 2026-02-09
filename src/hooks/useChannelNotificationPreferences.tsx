import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type NotificationLevel = "all" | "mentions" | "none";

export interface ChannelNotificationPreference {
  id: string;
  user_id: string;
  channel_id: string;
  notification_level: NotificationLevel;
  created_at: string;
  updated_at: string;
}

export function useChannelNotificationPreferences(workspaceId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["channel-notification-preferences", user?.id, workspaceId],
    queryFn: async () => {
      if (!user || !workspaceId) return [];

      const { data, error } = await supabase
        .from("channel_notification_preferences")
        .select(`
          *,
          channel:channels!inner(id, workspace_id)
        `)
        .eq("user_id", user.id)
        .eq("channel.workspace_id", workspaceId);

      if (error) throw error;
      return data as unknown as ChannelNotificationPreference[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useChannelNotificationPreference(channelId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["channel-notification-preference", user?.id, channelId],
    queryFn: async () => {
      if (!user || !channelId) return null;

      const { data, error } = await supabase
        .from("channel_notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .eq("channel_id", channelId)
        .maybeSingle();

      if (error) throw error;
      return data as ChannelNotificationPreference | null;
    },
    enabled: !!user && !!channelId,
  });
}

export function useUpdateChannelNotificationPreference() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      channelId,
      notificationLevel,
    }: {
      channelId: string;
      notificationLevel: NotificationLevel;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Upsert the preference
      const { error } = await supabase
        .from("channel_notification_preferences")
        .upsert(
          {
            user_id: user.id,
            channel_id: channelId,
            notification_level: notificationLevel,
          },
          {
            onConflict: "user_id,channel_id",
          }
        );

      if (error) throw error;
      return { channelId, notificationLevel };
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ["channel-notification-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["channel-notification-preference", user?.id, channelId] });
      toast.success("Preferências de notificação atualizadas");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar preferências");
    },
  });
}

export function getNotificationLevelLabel(level: NotificationLevel): string {
  switch (level) {
    case "all":
      return "Todas as mensagens";
    case "mentions":
      return "Apenas menções";
    case "none":
      return "Silenciado";
    default:
      return "Todas as mensagens";
  }
}
