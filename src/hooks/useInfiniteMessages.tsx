import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "./useMessages";

const PAGE_SIZE = 50;

export function useInfiniteMessages(channelId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useInfiniteQuery({
    queryKey: ["infinite-messages", channelId],
    queryFn: async ({ pageParam }) => {
      if (!channelId) return { messages: [], nextCursor: null };

      let queryBuilder = supabase
        .from("messages")
        .select(`
          *,
          profile:profiles!messages_user_id_fkey(display_name, avatar_url)
        `)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) {
        queryBuilder = queryBuilder.lt("created_at", pageParam);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      const messages = (data as unknown as Message[]).reverse();
      const nextCursor = data.length === PAGE_SIZE ? data[data.length - 1].created_at : null;

      return { messages, nextCursor };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!channelId,
  });

  // Flatten all pages into a single array
  const allMessages = query.data?.pages.flatMap((page) => page.messages) || [];

  // Real-time subscription
  useEffect(() => {
    if (!channelId) return;

    channelRef.current = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Fetch the new message with profile
            const { data } = await supabase
              .from("messages")
              .select(`
                *,
                profile:profiles!messages_user_id_fkey(display_name, avatar_url)
              `)
              .eq("id", payload.new.id)
              .single();

            if (data) {
              queryClient.setQueryData(
                ["infinite-messages", channelId],
                (oldData: any) => {
                  if (!oldData) return oldData;

                  const allExistingMessages = oldData.pages.flatMap((p: any) => p.messages);
                  const existingMessage = allExistingMessages.find(
                    (msg: Message) => 
                      msg.id === data.id || 
                      (msg.id.startsWith("temp-") && 
                       msg.user_id === data.user_id && 
                       msg.content === data.content &&
                       Math.abs(new Date(msg.created_at).getTime() - new Date(data.created_at).getTime()) < 5000)
                  );

                  if (existingMessage) {
                    return {
                      ...oldData,
                      pages: oldData.pages.map((page: any) => ({
                        ...page,
                        messages: page.messages.map((msg: Message) =>
                          msg.id === existingMessage.id ? { ...data, profile: data.profile } as unknown as Message : msg
                        ),
                      })),
                    };
                  }

                  const newPages = [...oldData.pages];
                  if (newPages.length > 0) {
                    newPages[newPages.length - 1] = {
                      ...newPages[newPages.length - 1],
                      messages: [...newPages[newPages.length - 1].messages, data as unknown as Message],
                    };
                  }
                  return { ...oldData, pages: newPages };
                }
              );

              // Fallback: invalidate to ensure data appears even if cache update failed
              setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ["infinite-messages", channelId] });
              }, 500);
            }
          } else if (payload.eventType === "UPDATE") {
            queryClient.setQueryData(
              ["infinite-messages", channelId],
              (oldData: any) => {
                if (!oldData) return oldData;
                return {
                  ...oldData,
                  pages: oldData.pages.map((page: any) => ({
                    ...page,
                    messages: page.messages.map((msg: Message) =>
                      msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
                    ),
                  })),
                };
              }
            );
          } else if (payload.eventType === "DELETE") {
            queryClient.setQueryData(
              ["infinite-messages", channelId],
              (oldData: any) => {
                if (!oldData) return oldData;
                return {
                  ...oldData,
                  pages: oldData.pages.map((page: any) => ({
                    ...page,
                    messages: page.messages.filter((msg: Message) => msg.id !== payload.old.id),
                  })),
                };
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [channelId, queryClient]);

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  return {
    messages: allMessages,
    isLoading: query.isLoading,
    isFetchingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage,
    loadMore,
  };
}
