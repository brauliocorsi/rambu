
-- Fix the INSERT policy on channels to properly allow workspace members to create channels
-- The current policy was blocking inserts due to a conflict with the RLS check

DROP POLICY IF EXISTS "Workspace members can create channels" ON public.channels;

CREATE POLICY "Workspace members can create channels"
ON public.channels
FOR INSERT
TO authenticated
WITH CHECK (
  (created_by = auth.uid()) AND is_workspace_member(workspace_id)
);
