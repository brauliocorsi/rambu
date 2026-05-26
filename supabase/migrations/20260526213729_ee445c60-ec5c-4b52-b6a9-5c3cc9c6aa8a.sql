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
  v_mentioned_ids uuid[];
BEGIN
  SELECT name, workspace_id, is_private INTO v_channel
  FROM public.channels
  WHERE id = NEW.channel_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT display_name INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Extrai @[name](uuid) do conteúdo para deduplicar com notificação de menção
  SELECT COALESCE(array_agg((m[1])::uuid), ARRAY[]::uuid[])
  INTO v_mentioned_ids
  FROM regexp_matches(COALESCE(NEW.content, ''), '@\[[^\]]+\]\(([0-9a-fA-F-]{36})\)', 'g') AS m;

  -- Apenas usuários que explicitamente optaram por 'all' nesse canal
  FOR v_member IN
    SELECT cnp.user_id
    FROM public.channel_notification_preferences cnp
    JOIN public.channel_members cm
      ON cm.channel_id = cnp.channel_id AND cm.user_id = cnp.user_id
    WHERE cnp.channel_id = NEW.channel_id
      AND cnp.notification_level = 'all'
      AND cnp.user_id <> NEW.user_id
      AND (cnp.snoozed_until IS NULL OR cnp.snoozed_until <= now())
      AND NOT public.is_user_banned(v_channel.workspace_id, cnp.user_id)
      AND NOT (cnp.user_id = ANY(v_mentioned_ids))
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    VALUES (
      v_member.user_id,
      'channel',
      COALESCE(v_sender_name, 'Alguém') || ' em #' || COALESCE(v_channel.name, 'canal'),
      LEFT(COALESCE(NEW.content, ''), 100),
      jsonb_build_object(
        'sender_id', NEW.user_id,
        'author_id', NEW.user_id,
        'message_id', NEW.id,
        'channel_id', NEW.channel_id,
        'channel_name', v_channel.name,
        'workspace_id', v_channel.workspace_id,
        'conversation_type', 'channel',
        'reason', 'channel_all'
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;