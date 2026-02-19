import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface DirectMessage {
  id: string;
  workspace_id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  created_at: string;
  other_user?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    status: string | null;
    last_seen?: string | null;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
}

export interface DMMessage {
  id: string;
  dm_id: string;
  user_id: string;
  content: string;
  reply_to: string | null;
  is_edited: boolean;
  file_url: string | null;
  file_type: string | null;
  file_name: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useDirectMessages(workspaceId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["direct-messages", workspaceId],
    queryFn: async () => {
      if (!workspaceId || !user) return [];

      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      // Get other user's profile for each DM
      const dmsWithProfiles = await Promise.all(
        (data || []).map(async (dm) => {
          const otherId = dm.user1_id === user.id ? dm.user2_id : dm.user1_id;
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url, status, last_seen")
            .eq("id", otherId)
            .single();

          // Get last message
          const { data: lastMsg } = await supabase
            .from("dm_messages")
            .select("content, created_at")
            .eq("dm_id", dm.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...dm,
            other_user: profile || undefined,
            last_message: lastMsg || undefined,
          } as DirectMessage;
        })
      );

      return dmsWithProfiles;
    },
    enabled: !!workspaceId && !!user,
  });
}

export function useDMMessages(dmId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery({
    queryKey: ["dm-messages", dmId],
    queryFn: async () => {
      if (!dmId) return [];

      const { data, error } = await supabase
        .from("dm_messages")
        .select(`
          *,
          profile:profiles!dm_messages_user_id_fkey(display_name, avatar_url)
        `)
        .eq("dm_id", dmId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      return data as unknown as DMMessage[];
    },
    enabled: !!dmId,
  });

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
                ["dm-messages", dmId],
                (old: DMMessage[] | undefined) => [...(old || []), data as unknown as DMMessage]
              );
            }
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

  return query;
}

export function useCreateOrGetDM() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ workspaceId, otherUserId }: { workspaceId: string; otherUserId: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if DM already exists
      const { data: existing } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("workspace_id", workspaceId)
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
        .single();

      if (existing) return existing;

      // Create new DM
      const { data, error } = await supabase
        .from("direct_messages")
        .insert({
          workspace_id: workspaceId,
          user1_id: user.id,
          user2_id: otherUserId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ["direct-messages", workspaceId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar conversa");
    },
  });
}

export function useSendDMMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      dmId, 
      content,
      replyTo,
      fileUrl,
      fileType,
      fileName,
    }: { 
      dmId: string; 
      content: string;
      replyTo?: string;
      fileUrl?: string;
      fileType?: string;
      fileName?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("dm_messages")
        .insert({
          dm_id: dmId,
          user_id: user.id,
          content,
          reply_to: replyTo || null,
          file_url: fileUrl || null,
          file_type: fileType || null,
          file_name: fileName || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update last_message_at
      await supabase
        .from("direct_messages")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", dmId);

      // Parse and create mentions
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      const mentions: string[] = [];
      let match;
      
      while ((match = mentionRegex.exec(content)) !== null) {
        mentions.push(match[2]);
      }

      if (mentions.length > 0 && data) {
        const mentionInserts = mentions.map((userId) => ({
          dm_message_id: data.id,
          mentioned_user_id: userId,
        }));

        await supabase.from("message_mentions").insert(mentionInserts);
      }

      return data;
    },
    onMutate: async (variables) => {
      if (!user) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["infinite-dm-messages", variables.dmId] });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(["infinite-dm-messages", variables.dmId]);

      // Get cached profile from queryClient
      const cachedProfile = queryClient.getQueryData<{ display_name: string | null; avatar_url: string | null }>(["profile", user.id]);

      // Create optimistic message with temp ID
      const optimisticMessage: DMMessage = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        dm_id: variables.dmId,
        user_id: user.id,
        content: variables.content,
        reply_to: variables.replyTo || null,
        is_edited: false,
        file_url: variables.fileUrl || null,
        file_type: variables.fileType || null,
        file_name: variables.fileName || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profile: {
          display_name: cachedProfile?.display_name || null,
          avatar_url: cachedProfile?.avatar_url || null,
        },
      };

      // Optimistically update infinite DM messages
      queryClient.setQueryData(
        ["infinite-dm-messages", variables.dmId],
        (oldData: any) => {
          if (!oldData) return oldData;
          const newPages = [...oldData.pages];
          if (newPages.length > 0) {
            newPages[newPages.length - 1] = {
              ...newPages[newPages.length - 1],
              messages: [...newPages[newPages.length - 1].messages, optimisticMessage],
            };
          }
          return { ...oldData, pages: newPages };
        }
      );

      // Also update legacy dm-messages query if exists
      queryClient.setQueryData(
        ["dm-messages", variables.dmId],
        (old: DMMessage[] | undefined) => [...(old || []), optimisticMessage]
      );

      return { previousMessages, optimisticId: optimisticMessage.id };
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["infinite-dm-messages", variables.dmId],
          context.previousMessages
        );
      }
      toast.error(error.message || "Erro ao enviar mensagem");
    },
    onSuccess: (data, variables, context) => {
      // Replace optimistic message with real one
      if (data && context?.optimisticId) {
        queryClient.setQueryData(
          ["infinite-dm-messages", variables.dmId],
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                messages: page.messages.map((msg: DMMessage) =>
                  msg.id === context.optimisticId
                    ? { ...msg, id: data.id, created_at: data.created_at, updated_at: data.updated_at }
                    : msg
                ),
              })),
            };
          }
        );

        // Also update legacy query
        queryClient.setQueryData(
          ["dm-messages", variables.dmId],
          (old: DMMessage[] | undefined) =>
            old?.map((msg) =>
              msg.id === context.optimisticId
                ? { ...msg, id: data.id, created_at: data.created_at, updated_at: data.updated_at }
                : msg
            )
        );
      }
    },
  });
}

export function useEditDMMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, content, dmId }: { messageId: string; content: string; dmId: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("dm_messages")
        .update({ content, is_edited: true })
        .eq("id", messageId)
        .eq("user_id", user.id);

      if (error) throw error;
      return { messageId, dmId };
    },
    onSuccess: (_, { dmId }) => {
      queryClient.invalidateQueries({ queryKey: ["dm-messages", dmId] });
      queryClient.invalidateQueries({ queryKey: ["infinite-dm-messages", dmId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao editar mensagem");
    },
  });
}

export function useDeleteDMMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, dmId }: { messageId: string; dmId: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("dm_messages")
        .delete()
        .eq("id", messageId)
        .eq("user_id", user.id);

      if (error) throw error;
      return { messageId, dmId };
    },
    onSuccess: (_, { dmId }) => {
      queryClient.invalidateQueries({ queryKey: ["dm-messages", dmId] });
      queryClient.invalidateQueries({ queryKey: ["infinite-dm-messages", dmId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao deletar mensagem");
    },
  });
}

export function useDMMessageById(messageId: string | null) {
  return useQuery({
    queryKey: ["dm-message", messageId],
    queryFn: async () => {
      if (!messageId) return null;
      
      const { data, error } = await supabase
        .from("dm_messages")
        .select(`
          *,
          profile:profiles!dm_messages_user_id_fkey(display_name, avatar_url)
        `)
        .eq("id", messageId)
        .single();

      if (error) throw error;
      return data as unknown as DMMessage;
    },
    enabled: !!messageId,
  });
}

export function useWorkspaceMembers(workspaceId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workspace-members-profiles", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("workspace_members")
        .select(`
          user_id,
          profile:profiles!workspace_members_user_id_fkey(id, display_name, avatar_url, status)
        `)
        .eq("workspace_id", workspaceId);

      if (error) throw error;

      // Filter out current user and return profiles
      return (data || [])
        .filter((m) => m.user_id !== user?.id)
        .map((m) => m.profile)
        .filter(Boolean) as Array<{
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          status: string | null;
        }>;
    },
    enabled: !!workspaceId && !!user,
  });
}
