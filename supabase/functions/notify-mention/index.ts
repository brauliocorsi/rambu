import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MentionPayload {
  mention_id: string;
  message_id?: string;
  dm_message_id?: string;
  thread_message_id?: string;
  mentioned_user_id: string;
  sender_user_id: string;
  content: string;
  channel_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: MentionPayload = await req.json();
    console.log("Processing mention notification:", payload);

    // Get the mentioned user's profile and notification preferences
    const { data: mentionedUser, error: userError } = await supabase
      .from("profiles")
      .select("display_name, do_not_disturb, dnd_until")
      .eq("id", payload.mentioned_user_id)
      .single();

    if (userError || !mentionedUser) {
      console.error("Error fetching mentioned user:", userError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has DND enabled
    if (mentionedUser.do_not_disturb) {
      const dndUntil = mentionedUser.dnd_until ? new Date(mentionedUser.dnd_until) : null;
      if (!dndUntil || dndUntil > new Date()) {
        console.log("User has DND enabled, skipping notification");
        return new Response(
          JSON.stringify({ message: "User has DND enabled", notified: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get notification preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("mention_notifications, push_notifications")
      .eq("user_id", payload.mentioned_user_id)
      .single();

    if (prefs && !prefs.mention_notifications) {
      console.log("User has mention notifications disabled");
      return new Response(
        JSON.stringify({ message: "Mention notifications disabled", notified: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get sender info
    const { data: sender } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", payload.sender_user_id)
      .single();

    const senderName = sender?.display_name || "Alguém";
    const locationText = payload.channel_name 
      ? `em #${payload.channel_name}` 
      : "em uma mensagem";

    // Create in-app notification record
    // For now we'll just log - in production you could:
    // 1. Store in a notifications table
    // 2. Send push notification via service like OneSignal
    // 3. Send email notification
    
    console.log(`Notification: ${senderName} mencionou ${mentionedUser.display_name || 'você'} ${locationText}`);
    
    // We could store this in a notifications table for in-app display
    // For now, the realtime subscription on message_mentions will handle UI updates

    return new Response(
      JSON.stringify({ 
        message: "Notification processed",
        notified: true,
        details: {
          to: mentionedUser.display_name,
          from: senderName,
          location: locationText,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing mention notification:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
