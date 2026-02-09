-- Fix SELECT policy for channels to allow creators to see their own channels
DROP POLICY IF EXISTS "Users can view channels in their workspaces" ON public.channels;

CREATE POLICY "Users can view channels in their workspaces"
  ON public.channels
  FOR SELECT
  TO authenticated
  USING (
    is_workspace_member(workspace_id) AND (
      is_private = false 
      OR created_by = auth.uid()
      OR is_channel_member(id)
    )
  );

-- Create trigger to auto-add creator as channel member for private channels
CREATE OR REPLACE FUNCTION public.auto_add_channel_creator()
RETURNS TRIGGER AS $$
BEGIN
  -- Always add creator as member for private channels
  IF NEW.is_private = true THEN
    INSERT INTO public.channel_members (channel_id, user_id)
    VALUES (NEW.id, NEW.created_by)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS on_channel_created ON public.channels;
CREATE TRIGGER on_channel_created
  AFTER INSERT ON public.channels
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_channel_creator();