import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface WorkspaceTask {
  id: string;
  template_id: string;
  channel_id: string | null;
  dm_id: string | null;
  created_by: string;
  assigned_to: string | null;
  status: "pending" | "approved" | "rejected" | "completed";
  requires_approval: boolean;
  message_id: string | null;
  created_at: string;
  template_name: string;
  channel_name: string | null;
  dm_label: string | null;
  creator_name: string | null;
  assigned_name: string | null;
}

export function useWorkspaceTasks(workspaceId: string | null, statusFilter: "pending" | "completed") {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workspace-tasks", user?.id, workspaceId, statusFilter],
    queryFn: async () => {
      if (!user || !workspaceId) return [];

      const statusValues: ("pending" | "approved" | "rejected" | "completed")[] = statusFilter === "completed" 
        ? ["completed", "approved", "rejected"] 
        : ["pending"];

      const { data: tasks, error } = await supabase
        .from("task_instances")
        .select("id, template_id, channel_id, dm_id, created_by, assigned_to, status, requires_approval, message_id, created_at")
        .in("status", statusValues)
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!tasks || tasks.length === 0) return [];

      // Filter channel-based tasks by workspace
      const channelIds = [...new Set(tasks.filter(t => t.channel_id).map(t => t.channel_id!))];
      let channelMap = new Map<string, { id: string; name: string; workspace_id: string }>();
      if (channelIds.length > 0) {
        const { data: channels } = await supabase
          .from("channels")
          .select("id, name, workspace_id")
          .in("id", channelIds)
          .eq("workspace_id", workspaceId);
        channelMap = new Map(channels?.map(c => [c.id, c]) || []);
      }

      // Filter DM-based tasks by workspace
      const dmIds = [...new Set(tasks.filter(t => t.dm_id).map(t => t.dm_id!))];
      let dmMap = new Map<string, { id: string; workspace_id: string }>();
      if (dmIds.length > 0) {
        const { data: dms } = await supabase
          .from("direct_messages")
          .select("id, workspace_id")
          .in("id", dmIds)
          .eq("workspace_id", workspaceId);
        dmMap = new Map(dms?.map(d => [d.id, d]) || []);
      }

      const filteredTasks = tasks.filter(t => 
        (t.channel_id && channelMap.has(t.channel_id)) || 
        (t.dm_id && dmMap.has(t.dm_id))
      );

      if (filteredTasks.length === 0) return [];

      const templateIds = [...new Set(filteredTasks.map(t => t.template_id))];
      const { data: templates } = await supabase
        .from("task_templates")
        .select("id, name")
        .in("id", templateIds);
      const templateMap = new Map(templates?.map(t => [t.id, t.name]) || []);

      const userIds = [...new Set([
        ...filteredTasks.map(t => t.created_by),
        ...filteredTasks.filter(t => t.assigned_to).map(t => t.assigned_to!),
      ])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);

      return filteredTasks.map(t => ({
        ...t,
        template_name: templateMap.get(t.template_id) || "Fluxo",
        channel_name: t.channel_id ? (channelMap.get(t.channel_id)?.name || "canal") : null,
        dm_label: t.dm_id ? "Mensagem Direta" : null,
        creator_name: profileMap.get(t.created_by) || null,
        assigned_name: t.assigned_to ? profileMap.get(t.assigned_to) || null : null,
      })) as WorkspaceTask[];
    },
    enabled: !!user && !!workspaceId,
    refetchInterval: 30000,
  });
}
