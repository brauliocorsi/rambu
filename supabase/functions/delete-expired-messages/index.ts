// Cron-friendly edge function: hard-deletes messages whose expires_at has passed.
// Schedule via Supabase cron or external scheduler every 1-5 minutes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date().toISOString();
  const tables = ["messages", "dm_messages", "dm_group_messages"];
  const result: Record<string, number> = {};

  for (const t of tables) {
    const { data, error } = await supabase
      .from(t)
      .delete()
      .lt("expires_at", now)
      .select("id");
    if (error) {
      result[t] = -1;
      console.error(`[${t}]`, error);
    } else {
      result[t] = data?.length ?? 0;
    }
  }

  return new Response(JSON.stringify({ deleted: result, ran_at: now }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});