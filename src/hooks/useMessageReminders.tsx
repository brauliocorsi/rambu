import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { addHours, addDays, startOfTomorrow, setHours } from "date-fns";

export type ReminderType = "1h" | "3h" | "tomorrow" | "custom";

export interface MessageReminder {
  id: string;
  user_id: string;
  message_id: string | null;
  dm_message_id: string | null;
  group_message_id: string | null;
  remind_at: string;
  is_completed: boolean;
  created_at: string;
}

function getRemindAtTime(type: ReminderType, customDate?: Date): Date {
  const now = new Date();
  
  switch (type) {
    case "1h":
      return addHours(now, 1);
    case "3h":
      return addHours(now, 3);
    case "tomorrow":
      return setHours(startOfTomorrow(), 9); // Tomorrow at 9 AM
    case "custom":
      return customDate || addHours(now, 1);
    default:
      return addHours(now, 1);
  }
}

export function useCreateReminder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      dmMessageId,
      groupMessageId,
      reminderType,
      customDate,
    }: {
      messageId?: string;
      dmMessageId?: string;
      groupMessageId?: string;
      reminderType: ReminderType;
      customDate?: Date;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const remindAt = getRemindAtTime(reminderType, customDate);

      const { data, error } = await supabase
        .from("message_reminders")
        .insert({
          user_id: user.id,
          message_id: messageId || null,
          dm_message_id: dmMessageId || null,
          group_message_id: groupMessageId || null,
          remind_at: remindAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-reminders"] });
      toast.success("Lembrete criado!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar lembrete");
    },
  });
}

export function useReminders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["message-reminders", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("message_reminders")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_completed", false)
        .order("remind_at", { ascending: true });

      if (error) throw error;
      return data as MessageReminder[];
    },
    enabled: !!user,
  });
}

export interface ReminderWithMessage extends MessageReminder {
  message?: {
    content: string;
    channel?: { name: string };
    profile?: { display_name: string; avatar_url: string | null };
  } | null;
  dm_message?: {
    content: string;
    profile?: { display_name: string; avatar_url: string | null };
  } | null;
  group_message?: {
    content: string;
    profile?: { display_name: string; avatar_url: string | null };
    group?: { name: string | null };
  } | null;
}

export function useAllReminders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["all-reminders", user?.id],
    queryFn: async () => {
      if (!user) return { pending: [], completed: [] };

      // Fetch all reminders
      const { data: reminders, error } = await supabase
        .from("message_reminders")
        .select("*")
        .eq("user_id", user.id)
        .order("remind_at", { ascending: false });

      if (error) throw error;

      const enrichedReminders: ReminderWithMessage[] = [];

      for (const reminder of reminders || []) {
        const enriched: ReminderWithMessage = { ...reminder };

        // Fetch message details based on type
        if (reminder.message_id) {
          const { data: message } = await supabase
            .from("messages")
            .select(`
              content,
              channel:channels(name),
              profile:profiles!messages_user_id_fkey(display_name, avatar_url)
            `)
            .eq("id", reminder.message_id)
            .single();
          
          if (message) {
            enriched.message = {
              content: message.content,
              channel: message.channel as any,
              profile: message.profile as any,
            };
          }
        } else if (reminder.dm_message_id) {
          const { data: dmMessage } = await supabase
            .from("dm_messages")
            .select(`
              content,
              profile:profiles!dm_messages_user_id_fkey(display_name, avatar_url)
            `)
            .eq("id", reminder.dm_message_id)
            .single();
          
          if (dmMessage) {
            enriched.dm_message = {
              content: dmMessage.content,
              profile: dmMessage.profile as any,
            };
          }
        } else if (reminder.group_message_id) {
          const { data: groupMessage } = await supabase
            .from("dm_group_messages")
            .select(`
              content,
              profile:profiles!dm_group_messages_user_id_fkey(display_name, avatar_url),
              group:dm_groups(name)
            `)
            .eq("id", reminder.group_message_id)
            .single();
          
          if (groupMessage) {
            enriched.group_message = {
              content: groupMessage.content,
              profile: groupMessage.profile as any,
              group: groupMessage.group as any,
            };
          }
        }

        enrichedReminders.push(enriched);
      }

      const pending = enrichedReminders.filter(r => !r.is_completed);
      const completed = enrichedReminders.filter(r => r.is_completed);

      return { pending, completed };
    },
    enabled: !!user,
  });
}

export function useCompleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from("message_reminders")
        .update({ is_completed: true })
        .eq("id", reminderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-reminders"] });
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from("message_reminders")
        .delete()
        .eq("id", reminderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-reminders"] });
      toast.success("Lembrete removido");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover lembrete");
    },
  });
}
