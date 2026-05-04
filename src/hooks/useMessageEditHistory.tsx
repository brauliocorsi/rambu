import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EditScope = "channel" | "dm" | "group";

export interface MessageEditEntry {
  id: string;
  previous_content: string;
  edited_at: string;
  edited_by: string;
}

export function useMessageEditHistory(messageId: string | null, scope: EditScope, enabled = true) {
  return useQuery({
    queryKey: ["message-edits", scope, messageId],
    queryFn: async () => {
      if (!messageId) return [] as MessageEditEntry[];
      const table =
        scope === "channel"
          ? "message_edits"
          : scope === "dm"
          ? "dm_message_edits"
          : "group_message_edits";
      const fk =
        scope === "channel"
          ? "message_id"
          : scope === "dm"
          ? "dm_message_id"
          : "group_message_id";
      const { data, error } = await (supabase as any)
        .from(table)
        .select("id, previous_content, edited_at, edited_by")
        .eq(fk, messageId)
        .order("edited_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MessageEditEntry[];
    },
    enabled: enabled && !!messageId,
  });
}