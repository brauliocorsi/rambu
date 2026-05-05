import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, retention_days")
    .not("retention_days", "is", null);

  let deleted = 0;
  for (const ws of workspaces ?? []) {
    if (!ws.retention_days || ws.retention_days < 1) continue;
    const cutoff = new Date(Date.now() - ws.retention_days * 86400000).toISOString();

    const { data: channels } = await supabase
      .from("channels")
      .select("id")
      .eq("workspace_id", ws.id);

    const ids = (channels ?? []).map((c: any) => c.id);
    if (ids.length === 0) continue;

    const { count } = await supabase
      .from("messages")
      .delete({ count: "exact" })
      .in("channel_id", ids)
      .lt("created_at", cutoff);

    deleted += count ?? 0;
  }

  return new Response(JSON.stringify({ deleted }), {
    headers: { "Content-Type": "application/json" },
  });
});
