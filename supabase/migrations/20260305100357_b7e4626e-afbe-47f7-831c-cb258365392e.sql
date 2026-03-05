
CREATE OR REPLACE FUNCTION public.notify_on_task_assigned()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_creator_name TEXT;
  v_template_name TEXT;
  v_channel_name TEXT;
BEGIN
  -- Only notify if assigned_to is set and is not the creator themselves
  IF NEW.assigned_to IS NULL OR NEW.assigned_to = NEW.created_by THEN
    RETURN NEW;
  END IF;

  -- Get creator name
  SELECT display_name INTO v_creator_name
  FROM public.profiles
  WHERE id = NEW.created_by;

  -- Get template name
  SELECT name INTO v_template_name
  FROM public.task_templates
  WHERE id = NEW.template_id;

  -- Get channel name
  SELECT name INTO v_channel_name
  FROM public.channels
  WHERE id = NEW.channel_id;

  -- Create notification for the assigned user
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (
    NEW.assigned_to,
    'task_assigned',
    COALESCE(v_creator_name, 'Alguém') || ' atribuiu uma tarefa a você',
    'Tarefa "' || COALESCE(v_template_name, 'Fluxo') || '" no canal #' || COALESCE(v_channel_name, 'canal'),
    jsonb_build_object(
      'sender_id', NEW.created_by,
      'task_instance_id', NEW.id,
      'channel_id', NEW.channel_id,
      'channel_name', v_channel_name,
      'message_id', NEW.message_id
    )
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_task_assigned
  AFTER INSERT ON public.task_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_task_assigned();
