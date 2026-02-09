import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface QuickReply {
  id: string;
  user_id: string;
  shortcut: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const useQuickReplies = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: quickReplies = [], isLoading } = useQuery({
    queryKey: ['quick-replies', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('quick_replies')
        .select('*')
        .eq('user_id', user.id)
        .order('shortcut');

      if (error) throw error;
      return data as QuickReply[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async ({ shortcut, content }: { shortcut: string; content: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Ensure shortcut starts with /
      const normalizedShortcut = shortcut.startsWith('/') ? shortcut : `/${shortcut}`;

      const { data, error } = await supabase
        .from('quick_replies')
        .insert({
          user_id: user.id,
          shortcut: normalizedShortcut,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      toast.success('Resposta rápida criada');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Este atalho já existe');
      } else {
        toast.error('Erro ao criar resposta rápida');
      }
      console.error('Create quick reply error:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, shortcut, content }: { id: string; shortcut: string; content: string }) => {
      const normalizedShortcut = shortcut.startsWith('/') ? shortcut : `/${shortcut}`;

      const { error } = await supabase
        .from('quick_replies')
        .update({
          shortcut: normalizedShortcut,
          content,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      toast.success('Resposta rápida atualizada');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar resposta rápida');
      console.error('Update quick reply error:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quick_replies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      toast.success('Resposta rápida removida');
    },
    onError: (error) => {
      toast.error('Erro ao remover resposta rápida');
      console.error('Delete quick reply error:', error);
    },
  });

  // Find quick reply by shortcut (for autocomplete)
  const findByShortcut = (text: string): QuickReply | undefined => {
    if (!text.startsWith('/')) return undefined;
    return quickReplies.find(qr => qr.shortcut.toLowerCase() === text.toLowerCase());
  };

  // Get suggestions based on partial input
  const getSuggestions = (text: string): QuickReply[] => {
    if (!text.startsWith('/')) return [];
    const search = text.toLowerCase();
    return quickReplies.filter(qr => 
      qr.shortcut.toLowerCase().startsWith(search)
    ).slice(0, 5);
  };

  return {
    quickReplies,
    isLoading,
    createQuickReply: createMutation.mutate,
    updateQuickReply: updateMutation.mutate,
    deleteQuickReply: deleteMutation.mutate,
    findByShortcut,
    getSuggestions,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
