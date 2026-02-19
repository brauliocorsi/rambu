-- Update the auto_add_channel_creator function to add creator for ALL channels (not just private)
CREATE OR REPLACE FUNCTION public.auto_add_channel_creator()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Always add creator as owner for all channels
  INSERT INTO public.channel_members (channel_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Also add existing public channel creators as members (backfill)
INSERT INTO public.channel_members (channel_id, user_id, role)
SELECT c.id, c.created_by, 'owner'
FROM public.channels c
WHERE NOT EXISTS (
  SELECT 1 FROM public.channel_members cm
  WHERE cm.channel_id = c.id AND cm.user_id = c.created_by
)
ON CONFLICT DO NOTHING;