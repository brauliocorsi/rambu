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
  is_edited: boolean;
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
            .select("id, display_name, avatar_url, status")
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
    mutationFn: async ({ dmId, content }: { dmId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("dm_messages")
        .insert({
          dm_id: dmId,
          user_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Update last_message_at
      await supabase
        .from("direct_messages")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", dmId);

      return data;
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar mensagem");
    },
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
