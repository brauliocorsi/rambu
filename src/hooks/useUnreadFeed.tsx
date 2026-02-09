import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";

export interface UnreadItem {
  id: string;
  type: "channel" | "dm" | "group";
  sourceId: string;
  sourceName: string;
  sourceIcon?: string;
  content: string;
  senderName: string;
  senderAvatar?: string;
  senderId: string;
  createdAt: string;
  unreadCount: number;
}

export interface UnreadSource {
  type: "channel" | "dm" | "group";
  id: string;
  name: string;
  icon?: string;
  unreadCount: number;
  lastMessage?: {
    content: string;
    senderName: string;
    senderAvatar?: string;
    createdAt: string;
  };
}

export function useUnreadFeed() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();

  return useQuery({
    queryKey: ["unread-feed", user?.id, currentWorkspace?.id],
    queryFn: async (): Promise<UnreadSource[]> => {
      if (!user?.id || !currentWorkspace?.id) return [];

      const results: UnreadSource[] = [];

      // 1. Get unread channel messages
      const { data: channelReadStatus } = await supabase
        .from("channel_read_status")
        .select("channel_id, last_read_at")
        .eq("user_id", user.id);

      const channelLastRead = new Map(
        (channelReadStatus || []).map(s => [s.channel_id, s.last_read_at])
      );

      // Get channels in workspace
      const { data: channels } = await supabase
        .from("channels")
        .select("id, name, is_private")
        .eq("workspace_id", currentWorkspace.id);

      if (channels) {
        for (const channel of channels) {
          const lastRead = channelLastRead.get(channel.id);
          
          // Count unread messages
          let countQuery = supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("channel_id", channel.id)
            .neq("user_id", user.id);
          
          if (lastRead) {
            countQuery = countQuery.gt("created_at", lastRead);
          }

          const { count } = await countQuery;

          if (count && count > 0) {
            // Get last message
            const { data: lastMessages } = await supabase
              .from("messages")
              .select(`
                content,
                created_at,
                profiles!inner (
                  display_name,
                  avatar_url
                )
              `)
              .eq("channel_id", channel.id)
              .order("created_at", { ascending: false })
              .limit(1);

            const lastMsg = lastMessages?.[0];
            const profile = lastMsg?.profiles as { display_name: string | null; avatar_url: string | null } | null;

            results.push({
              type: "channel",
              id: channel.id,
              name: `#${channel.name}`,
              icon: channel.is_private ? "🔒" : "#",
              unreadCount: count,
              lastMessage: lastMsg ? {
                content: lastMsg.content,
                senderName: profile?.display_name || "Usuário",
                senderAvatar: profile?.avatar_url || undefined,
                createdAt: lastMsg.created_at,
              } : undefined,
            });
          }
        }
      }

      // 2. Get unread DM messages
      const { data: dmReadStatus } = await supabase
        .from("dm_read_status")
        .select("dm_id, last_read_at")
        .eq("user_id", user.id);

      const dmLastRead = new Map(
        (dmReadStatus || []).map(s => [s.dm_id, s.last_read_at])
      );

      // Get DMs
      const { data: dms } = await supabase
        .from("direct_messages")
        .select(`
          id,
          user1_id,
          user2_id,
          profiles_user1:profiles!direct_messages_user1_id_fkey (
            id,
            display_name,
            avatar_url
          ),
          profiles_user2:profiles!direct_messages_user2_id_fkey (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq("workspace_id", currentWorkspace.id)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (dms) {
        for (const dm of dms) {
          const lastRead = dmLastRead.get(dm.id);
          
          // Count unread messages
          let countQuery = supabase
            .from("dm_messages")
            .select("id", { count: "exact", head: true })
            .eq("dm_id", dm.id)
            .neq("user_id", user.id);
          
          if (lastRead) {
            countQuery = countQuery.gt("created_at", lastRead);
          }

          const { count } = await countQuery;

          if (count && count > 0) {
            // Get other user's profile
            const otherProfile = dm.user1_id === user.id 
              ? dm.profiles_user2 as { id: string; display_name: string | null; avatar_url: string | null } | null
              : dm.profiles_user1 as { id: string; display_name: string | null; avatar_url: string | null } | null;

            // Get last message
            const { data: lastMessages } = await supabase
              .from("dm_messages")
              .select(`
                content,
                created_at,
                profiles!inner (
                  display_name,
                  avatar_url
                )
              `)
              .eq("dm_id", dm.id)
              .order("created_at", { ascending: false })
              .limit(1);

            const lastMsg = lastMessages?.[0];
            const msgProfile = lastMsg?.profiles as { display_name: string | null; avatar_url: string | null } | null;

            results.push({
              type: "dm",
              id: dm.id,
              name: otherProfile?.display_name || "Usuário",
              icon: otherProfile?.avatar_url || undefined,
              unreadCount: count,
              lastMessage: lastMsg ? {
                content: lastMsg.content,
                senderName: msgProfile?.display_name || "Usuário",
                senderAvatar: msgProfile?.avatar_url || undefined,
                createdAt: lastMsg.created_at,
              } : undefined,
            });
          }
        }
      }

      // 3. Get unread group DM messages
      const { data: groupMemberships } = await supabase
        .from("dm_group_members")
        .select(`
          group_id,
          dm_groups!inner (
            id,
            name,
            workspace_id
          )
        `)
        .eq("user_id", user.id);

      if (groupMemberships) {
        for (const membership of groupMemberships) {
          const group = membership.dm_groups as { id: string; name: string | null; workspace_id: string } | null;
          if (!group || group.workspace_id !== currentWorkspace.id) continue;

          // For groups, we'll just check recent messages (no read status table yet)
          const { data: recentMessages, count } = await supabase
            .from("dm_group_messages")
            .select(`
              content,
              created_at,
              profiles!inner (
                display_name,
                avatar_url
              )
            `, { count: "exact" })
            .eq("group_id", group.id)
            .neq("user_id", user.id)
            .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24h
            .order("created_at", { ascending: false })
            .limit(1);

          if (count && count > 0) {
            const lastMsg = recentMessages?.[0];
            const profile = lastMsg?.profiles as { display_name: string | null; avatar_url: string | null } | null;

            results.push({
              type: "group",
              id: group.id,
              name: group.name || "Grupo",
              icon: "👥",
              unreadCount: count,
              lastMessage: lastMsg ? {
                content: lastMsg.content,
                senderName: profile?.display_name || "Usuário",
                senderAvatar: profile?.avatar_url || undefined,
                createdAt: lastMsg.created_at,
              } : undefined,
            });
          }
        }
      }

      // Sort by most recent message
      results.sort((a, b) => {
        const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      return results;
    },
    enabled: !!user?.id && !!currentWorkspace?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000,
  });
}

export function useTotalUnreadCount() {
  const { data: unreadSources = [] } = useUnreadFeed();
  return unreadSources.reduce((total, source) => total + source.unreadCount, 0);
}
