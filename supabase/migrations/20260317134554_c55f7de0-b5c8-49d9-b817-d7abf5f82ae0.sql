
DROP POLICY IF EXISTS "Channel creator or workspace admin can delete" ON public.channels;

CREATE POLICY "Channel creator or admin can delete"
ON public.channels
FOR DELETE
TO authenticated
USING (
  (created_by = auth.uid())
  OR is_workspace_admin(workspace_id)
  OR is_channel_admin(id)
);
