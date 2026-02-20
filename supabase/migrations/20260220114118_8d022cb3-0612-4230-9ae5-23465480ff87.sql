
-- Fix notify_on_channel_message to only notify channel members (not all workspace members)
-- and remove "channel" type from in-app notifications (badges handle unread for channels)
CREATE OR REPLACE FUNCTION public.notify_on_channel_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_name TEXT;
  v_channel RECORD;
  v_member RECORD;
BEGIN
  -- Get channel info
  SELECT name, workspace_id INTO v_channel
  FROM public.channels
  WHERE id = NEW.channel_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Get sender name
  SELECT display_name INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Create notification ONLY for channel members (not all workspace members) who are NOT the sender
  FOR v_member IN
    SELECT user_id FROM public.channel_members
    WHERE channel_id = NEW.channel_id
    AND user_id != NEW.user_id
  LOOP
    -- Only create notification for @mentions and DMs via the mention trigger
    -- Channel messages only update unread counts (badges), not in-app notifications
    -- This avoids notification spam for every channel message
    NULL;
  END LOOP;

  RETURN NEW;
END;
$function$;
