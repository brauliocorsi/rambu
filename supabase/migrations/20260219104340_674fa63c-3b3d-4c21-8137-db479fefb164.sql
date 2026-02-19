-- Trigger for DM message notifications
CREATE OR REPLACE FUNCTION public.notify_on_dm_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_name TEXT;
  v_other_user_id UUID;
  v_dm RECORD;
BEGIN
  -- Get DM participants
  SELECT user1_id, user2_id INTO v_dm
  FROM public.direct_messages
  WHERE id = NEW.dm_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Determine the other user
  IF v_dm.user1_id = NEW.user_id THEN
    v_other_user_id := v_dm.user2_id;
  ELSE
    v_other_user_id := v_dm.user1_id;
  END IF;

  -- Get sender name
  SELECT display_name INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Create notification for the other user
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (
    v_other_user_id,
    'dm',
    'Nova mensagem de ' || COALESCE(v_sender_name, 'Alguém'),
    LEFT(NEW.content, 100),
    jsonb_build_object(
      'sender_id', NEW.user_id,
      'dm_message_id', NEW.id,
      'dm_id', NEW.dm_id
    )
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_dm_message_notify
  AFTER INSERT ON public.dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_dm_message();

-- Trigger for channel message notifications
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

  -- Create notification for all workspace members (except sender)
  FOR v_member IN
    SELECT user_id FROM public.workspace_members
    WHERE workspace_id = v_channel.workspace_id
    AND user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    VALUES (
      v_member.user_id,
      'channel',
      COALESCE(v_sender_name, 'Alguém') || ' em #' || COALESCE(v_channel.name, 'canal'),
      LEFT(NEW.content, 100),
      jsonb_build_object(
        'sender_id', NEW.user_id,
        'message_id', NEW.id,
        'channel_id', NEW.channel_id,
        'channel_name', v_channel.name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_channel_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_channel_message();