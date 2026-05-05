import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AuditLog {
  id: string;
  workspace_id: string;
  actor_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: any;
  created_at: string;
  actor?: { display_name: string | null; avatar_url: string | null };
}

export function useAuditLogs(workspaceId: string | null) {
  return useQuery({
    queryKey: ["audit-logs", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("audit_logs" as any)
        .select("*, actor:profiles!audit_logs_actor_id_fkey(display_name, avatar_url)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as AuditLog[];
    },
    enabled: !!workspaceId,
  });
}

export function useLogAction() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: {
      workspaceId: string;
      action: string;
      targetType?: string;
      targetId?: string;
      metadata?: any;
    }) => {
      if (!user) return;
      await supabase.from("audit_logs" as any).insert({
        workspace_id: params.workspaceId,
        actor_id: user.id,
        action: params.action,
        target_type: params.targetType ?? null,
        target_id: params.targetId ?? null,
        metadata: params.metadata ?? {},
      });
    },
  });
}