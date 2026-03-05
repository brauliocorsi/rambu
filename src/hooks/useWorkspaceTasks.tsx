import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface WorkspaceTask {
  id: string;
  template_id: string;
  channel_id: string;
  created_by: string;
  assigned_to: string | null;
  status: "pending" | "approved" | "rejected" | "completed";
  requires_approval: boolean;
  message_id: string | null;
  created_at: string;
  template_name: string;
  channel_name: string;
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
        .select("id, template_id, channel_id, created_by, assigned_to, status, requires_approval, message_id, created_at")
        .in("status", statusValues)
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!tasks || tasks.length === 0) return [];

      const channelIds = [...new Set(tasks.map(t => t.channel_id))];
      const { data: channels } = await supabase
        .from("channels")
        .select("id, name, workspace_id")
        .in("id", channelIds)
        .eq("workspace_id", workspaceId);

      const channelMap = new Map(channels?.map(c => [c.id, c]) || []);
      const filteredTasks = tasks.filter(t => channelMap.has(t.channel_id));

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
        channel_name: channelMap.get(t.channel_id)?.name || "canal",
        creator_name: profileMap.get(t.created_by) || null,
        assigned_name: t.assigned_to ? profileMap.get(t.assigned_to) || null : null,
      })) as WorkspaceTask[];
    },
    enabled: !!user && !!workspaceId,
    refetchInterval: 30000,
  });
}
