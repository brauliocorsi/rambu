import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ScheduledMessage {
  id: string;
  channel_id: string | null;
  dm_id: string | null;
  user_id: string;
  content: string;
  file_url: string | null;
  file_type: string | null;
  file_name: string | null;
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

    // Get all scheduled messages that are due
    const now = new Date().toISOString();
    
    const { data: scheduledMessages, error: fetchError } = await supabase
      .from("scheduled_messages")
      .select("*")
      .lte("scheduled_at", now)
      .is("sent_at", null)
      .eq("is_cancelled", false)
      .limit(100);

    if (fetchError) {
      console.error("Error fetching scheduled messages:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch scheduled messages" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!scheduledMessages || scheduledMessages.length === 0) {
      return new Response(
        JSON.stringify({ message: "No scheduled messages to send", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${scheduledMessages.length} scheduled messages to send`);

    let sentCount = 0;
    const errors: string[] = [];

    for (const scheduled of scheduledMessages as ScheduledMessage[]) {
      try {
        // Send to channel or DM
        if (scheduled.channel_id) {
          // Send channel message
          const { error: insertError } = await supabase
            .from("messages")
            .insert({
              channel_id: scheduled.channel_id,
              user_id: scheduled.user_id,
              content: scheduled.content,
              file_url: scheduled.file_url,
              file_type: scheduled.file_type,
              file_name: scheduled.file_name,
            });

          if (insertError) {
            console.error(`Error sending channel message ${scheduled.id}:`, insertError);
            errors.push(`Channel message ${scheduled.id}: ${insertError.message}`);
            continue;
          }
        } else if (scheduled.dm_id) {
          // Send DM message
          const { error: insertError } = await supabase
            .from("dm_messages")
            .insert({
              dm_id: scheduled.dm_id,
              user_id: scheduled.user_id,
              content: scheduled.content,
              file_url: scheduled.file_url,
              file_type: scheduled.file_type,
              file_name: scheduled.file_name,
            });

          if (insertError) {
            console.error(`Error sending DM ${scheduled.id}:`, insertError);
            errors.push(`DM ${scheduled.id}: ${insertError.message}`);
            continue;
          }

          // Update last_message_at on the DM
          await supabase
            .from("direct_messages")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", scheduled.dm_id);
        }

        // Mark as sent
        const { error: updateError } = await supabase
          .from("scheduled_messages")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", scheduled.id);

        if (updateError) {
          console.error(`Error marking message ${scheduled.id} as sent:`, updateError);
          errors.push(`Update ${scheduled.id}: ${updateError.message}`);
          continue;
        }

        sentCount++;
        console.log(`Sent scheduled message ${scheduled.id}`);
      } catch (err) {
        console.error(`Unexpected error processing message ${scheduled.id}:`, err);
        errors.push(`Message ${scheduled.id}: ${String(err)}`);
      }
    }

    const response = {
      message: `Processed ${scheduledMessages.length} scheduled messages`,
      sent: sentCount,
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
