import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useChannelMembersRealtime(workspaceId: string | null) {
  const queryClient = useQueryClient();
  const subId = useRef(Math.random().toString(36).slice(2)).current;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`channel-members:${workspaceId}:${subId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channel_members" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["channels", workspaceId] });
          queryClient.invalidateQueries({ queryKey: ["channel-members-with-roles"] });
          queryClient.invalidateQueries({ queryKey: ["channel-members"] });
          queryClient.invalidateQueries({ queryKey: ["channel-role"] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [workspaceId, queryClient]);
}