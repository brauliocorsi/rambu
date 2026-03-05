import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find active recurrence rules that are due
    const { data: rules, error: rulesError } = await supabase
      .from("task_recurrence_rules")
      .select("*, task_templates(name, description, workspace_id, checklist_items, created_by)")
      .eq("is_active", true)
      .lte("next_run_at", new Date().toISOString());

    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let processed = 0;

    for (const rule of rules) {
      try {
        const template = rule.task_templates;
        if (!template) continue;

        // Create message in channel
        const messageContent = `📋 **${template.name}** (recorrente)\n${template.description || "Tarefa automática"}`;
        
        const { data: message, error: msgError } = await supabase
          .from("messages")
          .insert({
            channel_id: rule.channel_id,
            user_id: rule.created_by,
            content: messageContent,
          })
          .select()
          .single();

        if (msgError) { console.error("Message error:", msgError); continue; }

        // Create task instance
        const assignees = Array.isArray(rule.auto_assignees) ? rule.auto_assignees : [];
        const { data: instance, error: instError } = await supabase
          .from("task_instances")
          .insert({
            template_id: rule.template_id,
            channel_id: rule.channel_id,
            created_by: rule.created_by,
            assigned_to: assignees[0] || null,
            message_id: message.id,
            status: "pending",
          })
          .select()
          .single();

        if (instError) { console.error("Instance error:", instError); continue; }

        // Add assignees
        if (assignees.length > 0) {
          await supabase.from("task_assignees").insert(
            assignees.map((userId: string) => ({
              task_instance_id: instance.id,
              user_id: userId,
            }))
          );
        }

        // Add checklist items from template
        const checklistItems = Array.isArray(template.checklist_items) ? template.checklist_items : [];
        if (checklistItems.length > 0) {
          await supabase.from("task_checklist_items").insert(
            checklistItems.map((label: string, i: number) => ({
              task_instance_id: instance.id,
              label: typeof label === "string" ? label : String(label),
              position: i,
            }))
          );
        }

        // Calculate next_run_at based on cron expression
        const nextRun = calculateNextRun(rule.cron_expression);
        
        await supabase
          .from("task_recurrence_rules")
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRun.toISOString(),
          })
          .eq("id", rule.id);

        processed++;
      } catch (err) {
        console.error(`Error processing rule ${rule.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateNextRun(cronExpression: string): Date {
  // Simple cron parser for: minute hour dayOfMonth month dayOfWeek
  const parts = cronExpression.split(" ");
  const minute = parseInt(parts[0]) || 0;
  const hour = parseInt(parts[1]) || 0;
  const dayOfMonth = parts[2];
  const dayOfWeek = parts[4];

  const now = new Date();
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setMinutes(minute);
  next.setHours(hour);

  if (dayOfMonth !== "*") {
    // Monthly
    const dom = parseInt(dayOfMonth);
    next.setDate(dom);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  } else if (dayOfWeek !== "*") {
    // Weekly
    const dow = parseInt(dayOfWeek);
    const currentDow = next.getDay();
    let daysUntil = dow - currentDow;
    if (daysUntil < 0 || (daysUntil === 0 && next <= now)) {
      daysUntil += 7;
    }
    next.setDate(next.getDate() + daysUntil);
  } else {
    // Daily
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  }

  return next;
}
