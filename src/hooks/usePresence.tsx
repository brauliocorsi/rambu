import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useQueryClient } from '@tanstack/react-query';

interface PresenceState {
  odigo: string;
  presence_ref: string;
  last_seen: string;
  status: string;
}

export const usePresence = (workspaceId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const updateLastSeen = useCallback(async (forceStatus?: string) => {
    if (!user?.id) return;
    
    // Get current user status to check if they want to appear offline
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single();
    
    // Don't update if user has chosen to appear offline
    if (profile?.status === 'offline' && !forceStatus) {
      return;
    }
    
    await supabase
      .from('profiles')
      .update({ 
        last_seen: new Date().toISOString(),
        status: forceStatus || profile?.status || 'online'
      })
      .eq('id', user.id);
  }, [user?.id]);

  const setOffline = useCallback(async () => {
    if (!user?.id) return;
    
    // Get current status - only set to offline if they weren't already invisible
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single();
    
    // If already offline (invisible mode), don't change
    if (profile?.status === 'offline') return;
    
    await supabase
      .from('profiles')
      .update({ status: 'offline' })
      .eq('id', user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !workspaceId) return;

    // Update last_seen immediately when connecting
    updateLastSeen();

    // Create presence channel
    const channel = supabase.channel(`presence:${workspaceId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Invalidate profiles query to refresh online status
        queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key);
        queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key);
        queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            status: 'online',
          });
        }
      });

    channelRef.current = channel;

    // Heartbeat every 30 seconds to update last_seen
    heartbeatRef.current = setInterval(() => {
      updateLastSeen();
    }, 30000);

    // Handle page visibility changes
    const handleVisibilityChange = async () => {
      // Get current status to check if user wants to appear offline
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .single();
      
      // If user chose to appear offline, don't auto-change status
      if (profile?.status === 'offline') return;
      
      if (document.hidden) {
        // User switched tab - mark as away after a bit
        supabase
          .from('profiles')
          .update({ status: 'away' })
          .eq('id', user.id);
      } else {
        // User is back - mark as online
        updateLastSeen('online');
      }
    };

    // Handle before unload
    const handleBeforeUnload = () => {
      setOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setOffline();
    };
  }, [user?.id, workspaceId, updateLastSeen, setOffline, queryClient]);

  return { updateLastSeen, setOffline };
};

// Hook to check if a user is online (within last 60 seconds)
export const isUserOnline = (lastSeen: string | null): boolean => {
  if (!lastSeen) return false;
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffSeconds = (now.getTime() - lastSeenDate.getTime()) / 1000;
  return diffSeconds < 60;
};

// Get status color based on user status - using semantic tokens
export const getStatusColor = (status: string | null, lastSeen: string | null): string => {
  if (status === 'busy' || status === 'dnd') return 'bg-destructive';
  if (status === 'away') return 'bg-warning';
  if (status === 'offline') return 'bg-muted-foreground';
  if (status === 'online' && isUserOnline(lastSeen)) return 'bg-success';
  return 'bg-muted-foreground';
};
