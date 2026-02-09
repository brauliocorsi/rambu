import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MessageReminder {
  id: string;
  user_id: string;
  message_id: string | null;
  dm_message_id: string | null;
  group_message_id: string | null;
  remind_at: string;
}

interface MessageDetails {
  content: string;
  sender_name: string;
  channel_name?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all reminders that are due
    const now = new Date().toISOString();
    
    const { data: dueReminders, error: fetchError } = await supabase
      .from("message_reminders")
      .select("*")
      .lte("remind_at", now)
      .eq("is_completed", false)
      .limit(100);

    if (fetchError) {
      console.error("Error fetching reminders:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch reminders" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(
        JSON.stringify({ message: "No reminders to process", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${dueReminders.length} due reminders to process`);

    let processedCount = 0;
    const errors: string[] = [];

    for (const reminder of dueReminders as MessageReminder[]) {
      try {
        let messageDetails: MessageDetails | null = null;

        // Get message details based on type
        if (reminder.message_id) {
          const { data: message } = await supabase
            .from("messages")
            .select(`
              content,
              channel:channels(name),
              profile:profiles!messages_user_id_fkey(display_name)
            `)
            .eq("id", reminder.message_id)
            .single();

          if (message) {
            messageDetails = {
              content: message.content,
              sender_name: (message.profile as any)?.display_name || "Usuário",
              channel_name: (message.channel as any)?.name,
            };
          }
        } else if (reminder.dm_message_id) {
          const { data: dmMessage } = await supabase
            .from("dm_messages")
            .select(`
              content,
              profile:profiles!dm_messages_user_id_fkey(display_name)
            `)
            .eq("id", reminder.dm_message_id)
            .single();

          if (dmMessage) {
            messageDetails = {
              content: dmMessage.content,
              sender_name: (dmMessage.profile as any)?.display_name || "Usuário",
            };
          }
        } else if (reminder.group_message_id) {
          const { data: groupMessage } = await supabase
            .from("dm_group_messages")
            .select(`
              content,
              profile:profiles!dm_group_messages_user_id_fkey(display_name)
            `)
            .eq("id", reminder.group_message_id)
            .single();

          if (groupMessage) {
            messageDetails = {
              content: groupMessage.content,
              sender_name: (groupMessage.profile as any)?.display_name || "Usuário",
            };
          }
        }

        if (!messageDetails) {
          // Message was deleted, mark reminder as completed
          await supabase
            .from("message_reminders")
            .update({ is_completed: true })
            .eq("id", reminder.id);
          continue;
        }

        // Create in-app notification
        const title = messageDetails.channel_name
          ? `⏰ Lembrete: ${messageDetails.sender_name} em #${messageDetails.channel_name}`
          : `⏰ Lembrete: ${messageDetails.sender_name}`;

        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: reminder.user_id,
            type: "reminder",
            title: title,
            body: messageDetails.content.length > 150 
              ? messageDetails.content.substring(0, 150) + "..." 
              : messageDetails.content,
            metadata: {
              reminder_id: reminder.id,
              message_id: reminder.message_id,
              dm_message_id: reminder.dm_message_id,
              group_message_id: reminder.group_message_id,
              channel_name: messageDetails.channel_name,
            },
          });

        if (notifError) {
          console.error(`Error creating notification for reminder ${reminder.id}:`, notifError);
          errors.push(`Notification ${reminder.id}: ${notifError.message}`);
          continue;
        }

        // Mark reminder as completed
        const { error: updateError } = await supabase
          .from("message_reminders")
          .update({ is_completed: true })
          .eq("id", reminder.id);

        if (updateError) {
          console.error(`Error marking reminder ${reminder.id} as completed:`, updateError);
          errors.push(`Update ${reminder.id}: ${updateError.message}`);
          continue;
        }

        processedCount++;
        console.log(`Processed reminder ${reminder.id} for user ${reminder.user_id}`);
      } catch (err) {
        console.error(`Unexpected error processing reminder ${reminder.id}:`, err);
        errors.push(`Reminder ${reminder.id}: ${String(err)}`);
      }
    }

    const response = {
      message: `Processed ${dueReminders.length} reminders`,
      processed: processedCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("Result:", response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
