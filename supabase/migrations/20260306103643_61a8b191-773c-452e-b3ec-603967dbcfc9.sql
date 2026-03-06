
-- Add dm_id column to task_instances (nullable, for DM-based tasks)
ALTER TABLE public.task_instances 
  ADD COLUMN dm_id uuid REFERENCES public.direct_messages(id) ON DELETE CASCADE;

-- Make channel_id nullable (tasks can be in channel OR DM)
ALTER TABLE public.task_instances 
  ALTER COLUMN channel_id DROP NOT NULL;

-- Update RLS SELECT policy to include DM participants
DROP POLICY IF EXISTS "Channel members can view task instances" ON public.task_instances;
CREATE POLICY "Members can view task instances"
  ON public.task_instances FOR SELECT TO authenticated
  USING (
    (channel_id IS NOT NULL AND can_access_channel(channel_id))
    OR (dm_id IS NOT NULL AND is_dm_participant(dm_id))
  );

-- Update RLS INSERT policy
DROP POLICY IF EXISTS "Channel members can create task instances" ON public.task_instances;
CREATE POLICY "Members can create task instances"
  ON public.task_instances FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND (
      (channel_id IS NOT NULL AND can_access_channel(channel_id))
      OR (dm_id IS NOT NULL AND is_dm_participant(dm_id))
    )
  );

-- Update RLS UPDATE policy
DROP POLICY IF EXISTS "Creator or assigned can update task instances" ON public.task_instances;
CREATE POLICY "Creator or assigned can update task instances"
  ON public.task_instances FOR UPDATE TO authenticated
  USING (
    (created_by = auth.uid()) 
    OR (assigned_to = auth.uid()) 
    OR (channel_id IS NOT NULL AND can_access_channel(channel_id))
    OR (dm_id IS NOT NULL AND is_dm_participant(dm_id))
  );

-- Keep DELETE policy as-is (creator only)
