import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";

export interface SearchResult {
  type: "message" | "dm_message" | "channel" | "user";
  id: string;
  content?: string;
  name?: string;
  channelId?: string;
  channelName?: string;
  dmId?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  createdAt?: string;
}

export interface SearchFilters {
  types: ("message" | "dm_message" | "channel" | "user")[];
  channelId?: string;
  dmId?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export function useSearch(
  query: string, 
  enabled: boolean = true,
  filters?: SearchFilters
) {
  const { currentWorkspace } = useWorkspaceContext();

  return useQuery({
    queryKey: ["search", query, currentWorkspace?.id, filters],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!query || query.length < 2 || !currentWorkspace?.id) {
        return [];
      }

      const results: SearchResult[] = [];
      const searchTerm = `%${query}%`;
      const typesToSearch = filters?.types?.length ? filters.types : ["message", "dm_message", "channel", "user"];

      // Search messages in channels
      if (typesToSearch.includes("message")) {
        let messagesQuery = supabase
          .from("messages")
          .select(`
            id,
            content,
            created_at,
            channel_id,
            user_id,
            channels!inner (
              id,
              name,
              workspace_id
            ),
            profiles!inner (
              display_name,
              avatar_url
            )
          `)
          .ilike("content", searchTerm)
          .eq("channels.workspace_id", currentWorkspace.id)
          .order("created_at", { ascending: false })
          .limit(20);

        // Apply channel filter
        if (filters?.channelId) {
          messagesQuery = messagesQuery.eq("channel_id", filters.channelId);
        }

        // Apply user filter
        if (filters?.userId) {
          messagesQuery = messagesQuery.eq("user_id", filters.userId);
        }

        // Apply date filters
        if (filters?.dateFrom) {
          messagesQuery = messagesQuery.gte("created_at", filters.dateFrom.toISOString());
        }
        if (filters?.dateTo) {
          messagesQuery = messagesQuery.lte("created_at", filters.dateTo.toISOString());
        }

        const { data: messages } = await messagesQuery;

        if (messages) {
          for (const msg of messages) {
            const channel = msg.channels as { id: string; name: string } | null;
            const profile = msg.profiles as { display_name: string | null; avatar_url: string | null } | null;
            
            results.push({
              type: "message",
              id: msg.id,
              content: msg.content,
              channelId: channel?.id,
              channelName: channel?.name,
              userId: msg.user_id,
              userName: profile?.display_name || undefined,
              userAvatar: profile?.avatar_url || undefined,
              createdAt: msg.created_at,
            });
          }
        }
      }

      // Search DM messages
      if (typesToSearch.includes("dm_message")) {
        let dmQuery = supabase
          .from("dm_messages")
          .select(`
            id,
            content,
            created_at,
            dm_id,
            user_id,
            direct_messages!inner (
              id,
              workspace_id
            ),
            profiles!inner (
              display_name,
              avatar_url
            )
          `)
          .ilike("content", searchTerm)
          .eq("direct_messages.workspace_id", currentWorkspace.id)
          .order("created_at", { ascending: false })
          .limit(20);

        // Apply DM filter
        if (filters?.dmId) {
          dmQuery = dmQuery.eq("dm_id", filters.dmId);
        }

        // Apply user filter
        if (filters?.userId) {
          dmQuery = dmQuery.eq("user_id", filters.userId);
        }

        // Apply date filters
        if (filters?.dateFrom) {
          dmQuery = dmQuery.gte("created_at", filters.dateFrom.toISOString());
        }
        if (filters?.dateTo) {
          dmQuery = dmQuery.lte("created_at", filters.dateTo.toISOString());
        }

        const { data: dmMessages } = await dmQuery;

        if (dmMessages) {
          for (const msg of dmMessages) {
            const profile = msg.profiles as { display_name: string | null; avatar_url: string | null } | null;
            
            results.push({
              type: "dm_message",
              id: msg.id,
              content: msg.content,
              dmId: msg.dm_id,
              userId: msg.user_id,
              userName: profile?.display_name || undefined,
              userAvatar: profile?.avatar_url || undefined,
              createdAt: msg.created_at,
            });
          }
        }
      }

      // Search channels
      if (typesToSearch.includes("channel")) {
        const { data: channels } = await supabase
          .from("channels")
          .select("id, name, description")
          .eq("workspace_id", currentWorkspace.id)
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(10);

        if (channels) {
          for (const channel of channels) {
            results.push({
              type: "channel",
              id: channel.id,
              name: channel.name,
              content: channel.description || undefined,
            });
          }
        }
      }

      // Search users in workspace
      if (typesToSearch.includes("user")) {
        const { data: members } = await supabase
          .from("workspace_members")
          .select(`
            user_id,
            profiles!workspace_members_user_id_fkey (
              id,
              display_name,
              avatar_url
            )
          `)
          .eq("workspace_id", currentWorkspace.id);

        if (members) {
          for (const member of members) {
            const profile = member.profiles as unknown as { id: string; display_name: string | null; avatar_url: string | null } | null;
            if (!profile) continue;
            const name = profile.display_name || "";
            
            if (name.toLowerCase().includes(query.toLowerCase())) {
              // Apply user filter if set
              if (filters?.userId && profile.id !== filters.userId) continue;
              
              results.push({
                type: "user",
                id: profile.id,
                name: name,
                userAvatar: profile.avatar_url || undefined,
              });
            }
          }
        }
      }

      return results;
    },
    enabled: enabled && !!query && query.length >= 2 && !!currentWorkspace?.id,
    staleTime: 30000,
  });
}
