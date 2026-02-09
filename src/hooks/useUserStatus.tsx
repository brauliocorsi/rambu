import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type UserStatus = 'online' | 'away' | 'busy' | 'offline';

interface StatusUpdate {
  status?: UserStatus;
  status_text?: string;
  status_emoji?: string;
  do_not_disturb?: boolean;
  dnd_until?: string | null;
  away_message?: string | null;
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
        .select('status, status_text, status_emoji, do_not_disturb, dnd_until, away_message')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
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

  // Check if DND should auto-disable
  const isDNDExpired = currentStatus?.dnd_until 
    ? new Date(currentStatus.dnd_until) < new Date()
    : false;

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
    isDNDActive: currentStatus?.do_not_disturb && !isDNDExpired,
    isUpdating: updateStatusMutation.isPending,
  };
};
