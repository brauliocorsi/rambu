import { supabase } from "@/integrations/supabase/client";

export type ExportScope =
  | { type: "channel"; id: string; name: string }
  | { type: "dm"; id: string; name: string }
  | { type: "group"; id: string; name: string };

interface ExportedMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
  file_url?: string | null;
  file_name?: string | null;
}

export async function fetchConversation(scope: ExportScope): Promise<ExportedMessage[]> {
  let query;
  if (scope.type === "channel") {
    query = supabase
      .from("messages")
      .select("id, user_id, content, created_at, file_url, file_name, profiles!inner(display_name)")
      .eq("channel_id", scope.id)
      .order("created_at", { ascending: true });
  } else if (scope.type === "dm") {
    query = supabase
      .from("dm_messages")
      .select("id, user_id, content, created_at, file_url, file_name, profiles!inner(display_name)")
      .eq("dm_id", scope.id)
      .order("created_at", { ascending: true });
  } else {
    query = supabase
      .from("dm_group_messages")
      .select("id, user_id, content, created_at, file_url, file_name, profiles!inner(display_name)")
      .eq("group_id", scope.id)
      .order("created_at", { ascending: true });
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((m: any) => ({
    id: m.id,
    user_id: m.user_id,
    content: m.content,
    created_at: m.created_at,
    user_name: m.profiles?.display_name || "Usuário",
    file_url: m.file_url,
    file_name: m.file_name,
  }));
}

function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportAsJSON(scope: ExportScope) {
  const messages = await fetchConversation(scope);
  const payload = { scope, exported_at: new Date().toISOString(), messages };
  downloadFile(`${scope.name}-${Date.now()}.json`, JSON.stringify(payload, null, 2), "application/json");
}

export async function exportAsText(scope: ExportScope) {
  const messages = await fetchConversation(scope);
  const lines = [
    `# ${scope.name}`,
    `Exportado em: ${new Date().toLocaleString("pt-BR")}`,
    `Total de mensagens: ${messages.length}`,
    "",
    ...messages.map((m) => {
      const ts = new Date(m.created_at).toLocaleString("pt-BR");
      const file = m.file_url ? `\n  📎 ${m.file_name || m.file_url}` : "";
      return `[${ts}] ${m.user_name}: ${m.content}${file}`;
    }),
  ];
  downloadFile(`${scope.name}-${Date.now()}.txt`, lines.join("\n"), "text/plain");
}