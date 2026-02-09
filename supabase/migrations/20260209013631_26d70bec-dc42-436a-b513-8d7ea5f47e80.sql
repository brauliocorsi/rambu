-- Create channels table
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create channel_members table (for private channels)
CREATE TABLE public.channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Enable RLS
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check channel access
CREATE OR REPLACE FUNCTION public.can_access_channel(p_channel_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = p_channel_id
    AND public.is_workspace_member(c.workspace_id)
    AND (
      c.is_private = false 
      OR EXISTS (
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = p_channel_id
        AND cm.user_id = auth.uid()
      )
    )
  )
$$;

-- Helper function to check if user is channel member (for private channels)
CREATE OR REPLACE FUNCTION public.is_channel_member(p_channel_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE channel_id = p_channel_id
    AND user_id = auth.uid()
  )
$$;

-- RLS Policies for channels
CREATE POLICY "Users can view channels in their workspaces"
  ON public.channels
  FOR SELECT
  TO authenticated
  USING (
    public.is_workspace_member(workspace_id) 
    AND (is_private = false OR public.is_channel_member(id))
  );

CREATE POLICY "Workspace members can create channels"
  ON public.channels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id) 
    AND created_by = auth.uid()
  );

CREATE POLICY "Channel creator or workspace admin can update"
  ON public.channels
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR public.is_workspace_admin(workspace_id)
  )
  WITH CHECK (
    created_by = auth.uid() 
    OR public.is_workspace_admin(workspace_id)
  );

CREATE POLICY "Channel creator or workspace admin can delete"
  ON public.channels
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR public.is_workspace_admin(workspace_id)
  );

-- RLS Policies for channel_members
CREATE POLICY "Channel members can view other members"
  ON public.channel_members
  FOR SELECT
  TO authenticated
  USING (public.can_access_channel(channel_id));

CREATE POLICY "Creator can add members or self-join public channels"
  ON public.channel_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Self join
    user_id = auth.uid() 
    OR 
    -- Channel creator can add members
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id
      AND (c.created_by = auth.uid() OR public.is_workspace_admin(c.workspace_id))
    )
  );

CREATE POLICY "Users can leave or admins can remove"
  ON public.channel_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id
      AND (c.created_by = auth.uid() OR public.is_workspace_admin(c.workspace_id))
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for channels
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;