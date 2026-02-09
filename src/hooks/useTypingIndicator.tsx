import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TypingUser {
  userId: string;
  displayName: string;
  timestamp: number;
}

export const useTypingIndicator = (channelId: string | null, isDM: boolean = false) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

  // Clean up stale typing indicators (older than 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers(prev => 
        prev.filter(u => Date.now() - u.timestamp < 3000)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!channelId || !user?.id) return;

    const channelName = isDM ? `typing:dm:${channelId}` : `typing:channel:${channelId}`;
    
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: {
          self: false,
        },
      },
    });

    channel
      .on('broadcast', { event: 'typing_start' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setTypingUsers(prev => {
            const existing = prev.find(u => u.userId === payload.userId);
            if (existing) {
              return prev.map(u => 
                u.userId === payload.userId 
                  ? { ...u, timestamp: Date.now() }
                  : u
              );
            }
            return [...prev, {
              userId: payload.userId,
              displayName: payload.displayName,
              timestamp: Date.now(),
            }];
          });
        }
      })
      .on('broadcast', { event: 'typing_stop' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setTypingUsers(prev => 
            prev.filter(u => u.userId !== payload.userId)
          );
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [channelId, user?.id, isDM]);

  const sendTypingStart = useCallback(async (displayName: string) => {
    if (!channelRef.current || !user?.id) return;

    // Debounce: only send if more than 1 second since last typing event
    const now = Date.now();
    if (now - lastTypingRef.current < 1000) return;
    lastTypingRef.current = now;

    await channelRef.current.send({
      type: 'broadcast',
      event: 'typing_start',
      payload: {
        userId: user.id,
        displayName,
      },
    });

    // Auto-stop after 3 seconds of no typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop();
    }, 3000);
  }, [user?.id]);

  const sendTypingStop = useCallback(async () => {
    if (!channelRef.current || !user?.id) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    await channelRef.current.send({
      type: 'broadcast',
      event: 'typing_stop',
      payload: {
        userId: user.id,
      },
    });
  }, [user?.id]);

  // Filter out current user from typing list
  const otherTypingUsers = typingUsers.filter(u => u.userId !== user?.id);

  return {
    typingUsers: otherTypingUsers,
    sendTypingStart,
    sendTypingStop,
    isAnyoneTyping: otherTypingUsers.length > 0,
  };
};
