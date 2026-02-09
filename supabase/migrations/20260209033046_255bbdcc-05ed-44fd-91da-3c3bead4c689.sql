-- Create group DMs table
CREATE TABLE public.dm_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group members table
CREATE TABLE public.dm_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.dm_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create group messages table
CREATE TABLE public.dm_group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.dm_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply_to UUID REFERENCES public.dm_group_messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  file_url TEXT,
  file_type TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dm_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_group_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is a group member
CREATE OR REPLACE FUNCTION public.is_dm_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dm_group_members
    WHERE group_id = p_group_id
    AND user_id = auth.uid()
  )
$$;

-- RLS policies for dm_groups
CREATE POLICY "Members can view their groups"
  ON public.dm_groups FOR SELECT
  USING (is_dm_group_member(id));

CREATE POLICY "Workspace members can create groups"
  ON public.dm_groups FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id) AND created_by = auth.uid());

CREATE POLICY "Creator can update group"
  ON public.dm_groups FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Creator can delete group"
  ON public.dm_groups FOR DELETE
  USING (created_by = auth.uid());

-- RLS policies for dm_group_members
CREATE POLICY "Members can view group members"
  ON public.dm_group_members FOR SELECT
  USING (is_dm_group_member(group_id));

CREATE POLICY "Creator or members can add members"
  ON public.dm_group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dm_groups g
      WHERE g.id = group_id AND (g.created_by = auth.uid() OR is_dm_group_member(group_id))
    )
  );

CREATE POLICY "Members can leave group"
  ON public.dm_group_members FOR DELETE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.dm_groups g
    WHERE g.id = group_id AND g.created_by = auth.uid()
  ));

-- RLS policies for dm_group_messages
CREATE POLICY "Members can view group messages"
  ON public.dm_group_messages FOR SELECT
  USING (is_dm_group_member(group_id));

CREATE POLICY "Members can send group messages"
  ON public.dm_group_messages FOR INSERT
  WITH CHECK (is_dm_group_member(group_id) AND user_id = auth.uid());

CREATE POLICY "Users can edit own messages"
  ON public.dm_group_messages FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own messages"
  ON public.dm_group_messages FOR DELETE
  USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_dm_groups_updated_at
  BEFORE UPDATE ON public.dm_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dm_group_messages_updated_at
  BEFORE UPDATE ON public.dm_group_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_group_messages;