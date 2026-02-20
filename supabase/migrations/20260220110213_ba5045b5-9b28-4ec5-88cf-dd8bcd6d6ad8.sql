
-- Drop the old permissive SELECT policy on channels
DROP POLICY IF EXISTS "Users can view channels in their workspaces" ON public.channels;

-- New policy: only show channels where the user is an explicit member
CREATE POLICY "Users can view channels they are members of"
ON public.channels
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.channel_members cm
    WHERE cm.channel_id = channels.id
    AND cm.user_id = auth.uid()
  )
);
