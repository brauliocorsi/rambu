
-- Extend cleanup to also remove user from DM groups and archived DMs of the workspace
CREATE OR REPLACE FUNCTION public.cleanup_workspace_member_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Remove from all channels in this workspace
  DELETE FROM public.channel_members
  WHERE user_id = OLD.user_id
  AND channel_id IN (
    SELECT id FROM public.channels WHERE workspace_id = OLD.workspace_id
  );

  -- Remove from all DM groups in this workspace
  DELETE FROM public.dm_group_members
  WHERE user_id = OLD.user_id
  AND group_id IN (
    SELECT id FROM public.dm_groups WHERE workspace_id = OLD.workspace_id
  );

  -- Remove archived DMs entries for this workspace
  DELETE FROM public.archived_dms
  WHERE user_id = OLD.user_id
  AND dm_id IN (
    SELECT id FROM public.direct_messages WHERE workspace_id = OLD.workspace_id
  );

  -- Remove channel favorites
  DELETE FROM public.channel_favorites
  WHERE user_id = OLD.user_id
  AND channel_id IN (
    SELECT id FROM public.channels WHERE workspace_id = OLD.workspace_id
  );

  -- Remove channel notification preferences
  DELETE FROM public.channel_notification_preferences
  WHERE user_id = OLD.user_id
  AND channel_id IN (
    SELECT id FROM public.channels WHERE workspace_id = OLD.workspace_id
  );

  -- Remove read statuses
  DELETE FROM public.channel_read_status
  WHERE user_id = OLD.user_id
  AND channel_id IN (
    SELECT id FROM public.channels WHERE workspace_id = OLD.workspace_id
  );

  DELETE FROM public.dm_read_status
  WHERE user_id = OLD.user_id
  AND dm_id IN (
    SELECT id FROM public.direct_messages WHERE workspace_id = OLD.workspace_id
  );

  RETURN OLD;
END;
$function$;
