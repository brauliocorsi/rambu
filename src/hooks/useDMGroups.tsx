import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { getProfileCached } from "@/lib/realtimeSync";
import { saveRetry, getRetry, clearRetry } from "@/lib/pendingRetries";

export interface DMGroup {
  id: string;
  workspace_id: string;
  name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  members?: DMGroupMember[];
  last_message?: {
    content: string;
    created_at: string;
    user_id: string;
  };
}

export interface DMGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    status: string | null;
  };
}

export interface DMGroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  reply_to: string | null;
  is_edited: boolean;
  file_url: string | null;
  file_type: string | null;
  file_name: string | null;
  created_at: string;
  updated_at: string;
  client_msg_id?: string | null;
  /** Client-only send lifecycle. Never persisted. */
  _status?: "pending" | "uploading" | "failed" | "sent";
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useDMGroups(workspaceId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dm-groups", workspaceId],
    queryFn: async (): Promise<DMGroup[]> => {
      if (!workspaceId || !user?.id) return [];

      // First get groups the user is a member of
      const { data: memberOf, error: memberError } = await supabase
        .from("dm_group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (memberError) throw memberError;
      const groupIds = (memberOf || []).map(m => m.group_id);
      
      if (groupIds.length === 0) return [];

      // Fetch groups
      const { data: groups, error: groupsError } = await supabase
        .from("dm_groups")
        .select("*")
        .in("id", groupIds)
        .eq("workspace_id", workspaceId)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (groupsError) throw groupsError;

      // Fetch members for each group
      const groupsWithMembers = await Promise.all(
        (groups || []).map(async (group) => {
          const { data: members } = await supabase
            .from("dm_group_members")
            .select(`
              *,
              profile:profiles!dm_group_members_user_id_fkey(id, display_name, avatar_url, status)
            `)
            .eq("group_id", group.id);

          // Fetch last message
          const { data: lastMsg } = await supabase
            .from("dm_group_messages")
            .select("content, created_at, user_id")
            .eq("group_id", group.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...group,
            members: (members || []).map(m => ({
              ...m,
              profile: m.profile as DMGroupMember["profile"],
            })),
            last_message: lastMsg || undefined,
          } as DMGroup;
        })
      );

      return groupsWithMembers;
    },
    enabled: !!workspaceId && !!user?.id,
  });
}

export function useCreateDMGroup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      memberIds,
      name,
    }: {
      workspaceId: string;
      memberIds: string[];
      name?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Create the group
      const { data: group, error: groupError } = await supabase
        .from("dm_groups")
        .insert({
          workspace_id: workspaceId,
          created_by: user.id,
          name: name || null,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add members (including creator)
      const allMemberIds = [...new Set([user.id, ...memberIds])];
      const { error: membersError } = await supabase
        .from("dm_group_members")
        .insert(
          allMemberIds.map(userId => ({
            group_id: group.id,
            user_id: userId,
          }))
        );

      if (membersError) throw membersError;

      return group;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dm-groups", variables.workspaceId] });
      toast.success("Grupo criado!");
    },
    onError: (error: any) => {
      console.error("Error creating group:", error);
      toast.error("Erro ao criar grupo");
    },
  });
}

export function useUpdateDMGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      name,
      workspaceId,
    }: {
      groupId: string;
      name: string;
      workspaceId: string;
    }) => {
      const { error } = await supabase
        .from("dm_groups")
        .update({ name })
        .eq("id", groupId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dm-groups", variables.workspaceId] });
      toast.success("Grupo atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar grupo");
    },
  });
}

export function useAddGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      workspaceId,
    }: {
      groupId: string;
      userId: string;
      workspaceId: string;
    }) => {
      const { error } = await supabase
        .from("dm_group_members")
        .insert({ group_id: groupId, user_id: userId });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dm-groups", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["dm-group-members", variables.groupId] });
      toast.success("Membro adicionado!");
    },
    onError: () => {
      toast.error("Erro ao adicionar membro");
    },
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      groupId,
      workspaceId,
    }: {
      groupId: string;
      workspaceId: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("dm_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dm-groups", variables.workspaceId] });
      toast.success("Você saiu do grupo");
    },
    onError: () => {
      toast.error("Erro ao sair do grupo");
    },
  });
}

export function useDMGroupMessages(groupId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useInfiniteQuery({
    queryKey: ["dm-group-messages", groupId],
    queryFn: async ({ pageParam = null }) => {
      if (!groupId) return { messages: [], nextCursor: null };

      let queryBuilder = supabase
        .from("dm_group_messages")
        .select(`
          *,
          profile:profiles!dm_group_messages_user_id_fkey(display_name, avatar_url)
        `)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (pageParam) {
        queryBuilder = queryBuilder.lt("created_at", pageParam);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;

      const messages = (data || []).reverse() as unknown as DMGroupMessage[];
      const nextCursor = data && data.length === 50 ? data[data.length - 1]?.created_at : null;

      return { messages, nextCursor };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
    enabled: !!groupId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!groupId) return;

    channelRef.current = supabase
      .channel(`dm-group-messages:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const profile = await getProfileCached(payload.new.user_id, queryClient);
            const data = { ...payload.new, profile } as unknown as DMGroupMessage;
            queryClient.setQueryData(
              ["dm-group-messages", groupId],
              (old: any) => {
                if (!old) return old;
                const allMsgs = old.pages.flatMap((p: any) => p.messages);
                if (allMsgs.some((m: any) => m.id === data.id)) return old;
                const cid = (data as any).client_msg_id;
                if (cid) {
                  const idx = allMsgs.findIndex((m: any) => m.client_msg_id === cid);
                  if (idx >= 0) {
                    return {
                      ...old,
                      pages: old.pages.map((p: any) => ({
                        ...p,
                        messages: p.messages.map((m: any) =>
                          m.client_msg_id === cid ? { ...m, ...data } : m
                        ),
                      })),
                    };
                  }
                }
                const lastPage = old.pages[old.pages.length - 1];
                return {
                  ...old,
                  pages: [
                    ...old.pages.slice(0, -1),
                    {
                      ...lastPage,
                      messages: [...lastPage.messages, data],
                    },
                  ],
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
  }, [groupId, queryClient]);

  const messages = query.data?.pages.flatMap((page) => page.messages) ?? [];

  return {
    messages,
    isLoading: query.isLoading,
    isFetchingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage,
    loadMore: () => query.fetchNextPage(),
  };
}

export function useSendGroupMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      groupId,
      content,
      replyTo,
      fileUrl,
      fileType,
      fileName,
    }: {
      groupId: string;
      content: string;
      replyTo?: string;
      fileUrl?: string;
      fileType?: string;
      fileName?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("dm_group_messages")
        .insert({
          group_id: groupId,
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
        .from("dm_groups")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", groupId);

      return data;
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar mensagem");
    },
  });
}
