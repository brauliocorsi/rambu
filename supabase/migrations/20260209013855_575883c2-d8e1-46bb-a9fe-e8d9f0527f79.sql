-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message reactions table
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Users can view messages in accessible channels"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (public.can_access_channel(channel_id));

CREATE POLICY "Users can send messages to accessible channels"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_channel(channel_id)
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can edit their own messages"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON public.messages
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for message_reactions
CREATE POLICY "Users can view reactions in accessible channels"
  ON public.message_reactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
      AND public.can_access_channel(m.channel_id)
    )
  );

CREATE POLICY "Users can add reactions"
  ON public.message_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
      AND public.can_access_channel(m.channel_id)
    )
  );

CREATE POLICY "Users can remove their own reactions"
  ON public.message_reactions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- Create index for better performance
CREATE INDEX idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);