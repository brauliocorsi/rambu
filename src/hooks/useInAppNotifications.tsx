import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Notification {
  id: string;
  user_id: string;
  type: "mention" | "dm" | "channel" | "thread_reply";
  title: string;
  body: string | null;
  is_read: boolean;
  metadata: {
    sender_id?: string;
    message_id?: string;
    dm_message_id?: string;
    thread_message_id?: string;
    channel_id?: string;
    channel_name?: string;
  } | null;
  created_at: string;
}

export function useNotificationsList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as unknown as Notification[];
    },
    enabled: !!user,
  });

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    channelRef.current = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Add new notification to the list
          queryClient.setQueryData(
            ["notifications", user.id],
            (old: Notification[] | undefined) => {
              const newNotification = payload.new as unknown as Notification;
              return [newNotification, ...(old || [])];
            }
          );
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id, queryClient]);

  return query;
}

export function useUnreadNotificationCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications_count", user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["notifications_count", user?.id] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["notifications_count", user?.id] });
    },
  });
}

export function useClearNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["notifications_count", user?.id] });
    },
  });
}
