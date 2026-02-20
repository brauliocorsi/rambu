
-- Update can_access_channel to require explicit channel membership for ALL channels
-- (both public and private channels now require being a member to see messages)
CREATE OR REPLACE FUNCTION public.can_access_channel(p_channel_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.channel_members cm
    WHERE cm.channel_id = p_channel_id
    AND cm.user_id = auth.uid()
  )
$function$;
