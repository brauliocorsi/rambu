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

      // Single aggregated RPC call (replaces 1 + 3*N queries with 1 round trip)
      const { data, error } = await supabase.rpc("get_unread_feed", {
        p_workspace_id: currentWorkspace.id,
      });

      if (error) {
        console.error("[useUnreadFeed] RPC error:", error);
        return [];
      }

      const rows = (data as any[]) || [];
      return rows.map((row): UnreadSource => ({
        type: row.type,
        id: row.id,
        name: row.name,
        icon: row.icon || undefined,
        unreadCount: Number(row.unread_count) || 0,
        lastMessage: row.last_message
          ? {
              content: row.last_message.content || "",
              senderName: row.last_message.sender_name || "Usuário",
              senderAvatar: row.last_message.sender_avatar || undefined,
              createdAt: row.last_message.created_at,
            }
          : undefined,
      }));
    },
    enabled: !!user?.id && !!currentWorkspace?.id,
    // Realtime subscription in useBrowserNotifications already invalidates this
    // query on new messages, so a long fallback interval is enough.
    refetchInterval: 60000,
    staleTime: 15000,
  });
}

export function useTotalUnreadCount() {
  const { data: unreadSources = [] } = useUnreadFeed();
  return unreadSources.reduce((total, source) => total + source.unreadCount, 0);
}
