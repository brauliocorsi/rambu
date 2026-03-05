import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DMMessage } from "./useDirectMessages";

const PAGE_SIZE = 50;

export function useInfiniteDMMessages(dmId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useInfiniteQuery({
    queryKey: ["infinite-dm-messages", dmId],
    queryFn: async ({ pageParam }) => {
      if (!dmId) return { messages: [], nextCursor: null };

      let queryBuilder = supabase
        .from("dm_messages")
        .select(`
          *,
          profile:profiles!dm_messages_user_id_fkey(display_name, avatar_url)
        `)
        .eq("dm_id", dmId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) {
        queryBuilder = queryBuilder.lt("created_at", pageParam);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      const messages = (data as unknown as DMMessage[]).reverse();
      const nextCursor = data.length === PAGE_SIZE ? data[data.length - 1].created_at : null;

      return { messages, nextCursor };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!dmId,
  });

  // Flatten all pages into a single array
  const allMessages = query.data?.pages.flatMap((page) => page.messages) || [];

  // Real-time subscription
  useEffect(() => {
    if (!dmId) return;

    channelRef.current = supabase
      .channel(`dm-messages:${dmId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_messages",
          filter: `dm_id=eq.${dmId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const { data } = await supabase
              .from("dm_messages")
              .select(`
                *,
                profile:profiles!dm_messages_user_id_fkey(display_name, avatar_url)
              `)
              .eq("id", payload.new.id)
              .single();

            if (data) {
              queryClient.setQueryData(
                ["infinite-dm-messages", dmId],
                (oldData: any) => {
                  if (!oldData) return oldData;

                  // Check if message already exists (could be optimistic or duplicate)
                  const allExistingMessages = oldData.pages.flatMap((p: any) => p.messages);
                  const existingMessage = allExistingMessages.find(
                    (msg: DMMessage) => 
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
                        messages: page.messages.map((msg: DMMessage) =>
                          msg.id === existingMessage.id ? { ...data, profile: data.profile } as unknown as DMMessage : msg
                        ),
                      })),
                    };
                  }

                  // Add to the last page if not exists
                  const newPages = [...oldData.pages];
                  if (newPages.length > 0) {
                    newPages[newPages.length - 1] = {
                      ...newPages[newPages.length - 1],
                      messages: [...newPages[newPages.length - 1].messages, data as unknown as DMMessage],
                    };
                  }
                  return { ...oldData, pages: newPages };
                }
              );
            }
          } else if (payload.eventType === "UPDATE") {
            queryClient.setQueryData(
              ["infinite-dm-messages", dmId],
              (oldData: any) => {
                if (!oldData) return oldData;
                return {
                  ...oldData,
                  pages: oldData.pages.map((page: any) => ({
                    ...page,
                    messages: page.messages.map((msg: DMMessage) =>
                      msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
                    ),
                  })),
                };
              }
            );
          } else if (payload.eventType === "DELETE") {
            queryClient.setQueryData(
              ["infinite-dm-messages", dmId],
              (oldData: any) => {
                if (!oldData) return oldData;
                return {
                  ...oldData,
                  pages: oldData.pages.map((page: any) => ({
                    ...page,
                    messages: page.messages.filter((msg: DMMessage) => msg.id !== payload.old.id),
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
  }, [dmId, queryClient]);

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
