-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON public.workspaces;

-- Create new SELECT policy that allows creators OR members to view
CREATE POLICY "Users can view workspaces they created or belong to"
  ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR is_workspace_member(id));