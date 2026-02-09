import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type UserStatus = 'online' | 'away' | 'busy' | 'offline';
export type AwayNotificationLevel = 'all' | 'mentions' | 'none';

interface StatusUpdate {
  status?: UserStatus;
  status_text?: string | null;
  status_emoji?: string | null;
  do_not_disturb?: boolean;
  dnd_until?: string | null;
  away_message?: string | null;
  away_auto_reply?: string | null;
  away_notification_level?: AwayNotificationLevel;
  scheduled_away_start?: string | null;
  scheduled_away_end?: string | null;
}

export interface UserStatusData {
  status: UserStatus | null;
  status_text: string | null;
  status_emoji: string | null;
  do_not_disturb: boolean | null;
  dnd_until: string | null;
  away_message: string | null;
  away_auto_reply: string | null;
  away_notification_level: AwayNotificationLevel | null;
  scheduled_away_start: string | null;
  scheduled_away_end: string | null;
}

export const useUserStatus = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: currentStatus, isLoading } = useQuery({
    queryKey: ['user-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('status, status_text, status_emoji, do_not_disturb, dnd_until, away_message, away_auto_reply, away_notification_level, scheduled_away_start, scheduled_away_end')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as UserStatusData;
    },
    enabled: !!user?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (updates: StatusUpdate) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-status'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status');
      console.error('Status update error:', error);
    },
  });

  const setStatus = (status: UserStatus) => {
    updateStatusMutation.mutate({ status });
  };

  const setCustomStatus = (text: string, emoji?: string) => {
    updateStatusMutation.mutate({ 
      status_text: text,
      status_emoji: emoji || null,
    });
  };

  const clearCustomStatus = () => {
    updateStatusMutation.mutate({ 
      status_text: null,
      status_emoji: null,
    });
  };

  const enableDND = (untilDate?: Date) => {
    updateStatusMutation.mutate({ 
      do_not_disturb: true,
      dnd_until: untilDate?.toISOString() || null,
      status: 'busy',
    });
    toast.success('Modo Não Perturbe ativado');
  };

  const disableDND = () => {
    updateStatusMutation.mutate({ 
      do_not_disturb: false,
      dnd_until: null,
      status: 'online',
    });
    toast.success('Modo Não Perturbe desativado');
  };

  const setAwayMessage = (message: string) => {
    updateStatusMutation.mutate({ 
      away_message: message,
      status: 'away',
    });
  };

  const clearAwayMessage = () => {
    updateStatusMutation.mutate({ 
      away_message: null,
      status: 'online',
    });
  };

  // Advanced away mode
  const setAdvancedAwayMode = ({
    autoReply,
    notificationLevel,
    scheduledStart,
    scheduledEnd,
  }: {
    autoReply?: string;
    notificationLevel?: AwayNotificationLevel;
    scheduledStart?: Date;
    scheduledEnd?: Date;
  }) => {
    updateStatusMutation.mutate({
      status: 'away',
      away_auto_reply: autoReply || null,
      away_notification_level: notificationLevel || 'all',
      scheduled_away_start: scheduledStart?.toISOString() || null,
      scheduled_away_end: scheduledEnd?.toISOString() || null,
    });
    toast.success('Modo ausente configurado');
  };

  const clearAwayMode = () => {
    updateStatusMutation.mutate({
      status: 'online',
      away_message: null,
      away_auto_reply: null,
      away_notification_level: 'all',
      scheduled_away_start: null,
      scheduled_away_end: null,
    });
    toast.success('Modo ausente desativado');
  };

  // Check if DND should auto-disable
  const isDNDExpired = currentStatus?.dnd_until 
    ? new Date(currentStatus.dnd_until) < new Date()
    : false;

  // Check if scheduled away is active
  const isScheduledAwayActive = () => {
    if (!currentStatus?.scheduled_away_start || !currentStatus?.scheduled_away_end) {
      return false;
    }
    const now = new Date();
    const start = new Date(currentStatus.scheduled_away_start);
    const end = new Date(currentStatus.scheduled_away_end);
    return now >= start && now <= end;
  };

  return {
    currentStatus,
    isLoading,
    setStatus,
    setCustomStatus,
    clearCustomStatus,
    enableDND,
    disableDND,
    setAwayMessage,
    clearAwayMessage,
    setAdvancedAwayMode,
    clearAwayMode,
    isDNDActive: currentStatus?.do_not_disturb && !isDNDExpired,
    isScheduledAwayActive: isScheduledAwayActive(),
    isUpdating: updateStatusMutation.isPending,
  };
};
