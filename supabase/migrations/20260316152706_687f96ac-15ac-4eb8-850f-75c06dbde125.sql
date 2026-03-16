
-- Trigger function: when a workspace member is removed, clean up their channel memberships and DM access
CREATE OR REPLACE FUNCTION public.cleanup_workspace_member_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Remove from all channels in this workspace
  DELETE FROM public.channel_members
  WHERE user_id = OLD.user_id
  AND channel_id IN (
    SELECT id FROM public.channels WHERE workspace_id = OLD.workspace_id
  );

  RETURN OLD;
END;
$$;

-- Attach trigger to workspace_members
CREATE TRIGGER on_workspace_member_removed
  AFTER DELETE ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_workspace_member_access();

-- Update DM RLS: participants can only view DMs if they are still workspace members
DROP POLICY IF EXISTS "Users can view their DMs" ON public.direct_messages;
CREATE POLICY "Users can view their DMs"
  ON public.direct_messages FOR SELECT
  TO authenticated
  USING (
    ((user1_id = auth.uid()) OR (user2_id = auth.uid()))
    AND is_workspace_member(workspace_id)
  );

-- Update DM messages RLS: only workspace members who are participants
DROP POLICY IF EXISTS "Participants can view DM messages" ON public.dm_messages;
CREATE POLICY "Participants can view DM messages"
  ON public.dm_messages FOR SELECT
  TO authenticated
  USING (
    is_dm_participant(dm_id)
    AND EXISTS (
      SELECT 1 FROM public.direct_messages dm
      WHERE dm.id = dm_messages.dm_id
      AND is_workspace_member(dm.workspace_id)
    )
  );

-- Update DM messages INSERT: only workspace members
DROP POLICY IF EXISTS "Participants can send DM messages" ON public.dm_messages;
CREATE POLICY "Participants can send DM messages"
  ON public.dm_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    is_dm_participant(dm_id)
    AND (user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.direct_messages dm
      WHERE dm.id = dm_messages.dm_id
      AND is_workspace_member(dm.workspace_id)
    )
  );

-- Update DM group access: members must be workspace members
DROP POLICY IF EXISTS "Members can view their groups" ON public.dm_groups;
CREATE POLICY "Members can view their groups"
  ON public.dm_groups FOR SELECT
  TO public
  USING (
    is_dm_group_member(id)
    AND is_workspace_member(workspace_id)
  );
