-- Create direct_messages (conversation) table
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user1_id, user2_id),
  CONSTRAINT different_users CHECK (user1_id != user2_id)
);

-- Create direct_message_messages table (actual messages in DM)
CREATE TABLE public.dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_id UUID NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create thread_messages table (replies to channel messages)
CREATE TABLE public.thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add thread_count to messages table
ALTER TABLE public.messages ADD COLUMN thread_count INTEGER NOT NULL DEFAULT 0;

-- Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check DM participation
CREATE OR REPLACE FUNCTION public.is_dm_participant(p_dm_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.direct_messages
    WHERE id = p_dm_id
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
$$;

-- RLS Policies for direct_messages
CREATE POLICY "Users can view their DMs"
  ON public.direct_messages
  FOR SELECT
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can create DMs"
  ON public.direct_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user1_id = auth.uid() OR user2_id = auth.uid())
    AND public.is_workspace_member(workspace_id)
  );

CREATE POLICY "Participants can update DM"
  ON public.direct_messages
  FOR UPDATE
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- RLS Policies for dm_messages
CREATE POLICY "Participants can view DM messages"
  ON public.dm_messages
  FOR SELECT
  TO authenticated
  USING (public.is_dm_participant(dm_id));

CREATE POLICY "Participants can send DM messages"
  ON public.dm_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_dm_participant(dm_id)
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can edit own DM messages"
  ON public.dm_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own DM messages"
  ON public.dm_messages
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for thread_messages
CREATE POLICY "Users can view thread messages"
  ON public.thread_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = parent_message_id
      AND public.can_access_channel(m.channel_id)
    )
  );

CREATE POLICY "Users can send thread messages"
  ON public.thread_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = parent_message_id
      AND public.can_access_channel(m.channel_id)
    )
  );

CREATE POLICY "Users can edit own thread messages"
  ON public.thread_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own thread messages"
  ON public.thread_messages
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to increment thread count
CREATE OR REPLACE FUNCTION public.increment_thread_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.messages
  SET thread_count = thread_count + 1
  WHERE id = NEW.parent_message_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to decrement thread count
CREATE OR REPLACE FUNCTION public.decrement_thread_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.messages
  SET thread_count = thread_count - 1
  WHERE id = OLD.parent_message_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for thread count
CREATE TRIGGER on_thread_message_insert
  AFTER INSERT ON public.thread_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_thread_count();

CREATE TRIGGER on_thread_message_delete
  AFTER DELETE ON public.thread_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_thread_count();

-- Triggers for updated_at
CREATE TRIGGER update_dm_messages_updated_at
  BEFORE UPDATE ON public.dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_thread_messages_updated_at
  BEFORE UPDATE ON public.thread_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_messages;

-- Create indexes
CREATE INDEX idx_direct_messages_user1 ON public.direct_messages(user1_id);
CREATE INDEX idx_direct_messages_user2 ON public.direct_messages(user2_id);
CREATE INDEX idx_direct_messages_workspace ON public.direct_messages(workspace_id);
CREATE INDEX idx_dm_messages_dm_id ON public.dm_messages(dm_id);
CREATE INDEX idx_thread_messages_parent ON public.thread_messages(parent_message_id);