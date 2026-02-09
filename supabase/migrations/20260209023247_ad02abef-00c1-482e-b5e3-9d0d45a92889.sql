-- =============================================
-- SCHEDULED MESSAGES TABLE
-- =============================================
CREATE TABLE public.scheduled_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  dm_id UUID REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  file_url TEXT,
  file_type TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT scheduled_message_target CHECK (
    (channel_id IS NOT NULL AND dm_id IS NULL) OR 
    (channel_id IS NULL AND dm_id IS NOT NULL)
  )
);

-- RLS for scheduled_messages
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled messages"
ON public.scheduled_messages FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create scheduled messages"
ON public.scheduled_messages FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  (
    (channel_id IS NOT NULL AND can_access_channel(channel_id)) OR
    (dm_id IS NOT NULL AND is_dm_participant(dm_id))
  )
);

CREATE POLICY "Users can update own scheduled messages"
ON public.scheduled_messages FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own scheduled messages"
ON public.scheduled_messages FOR DELETE
USING (user_id = auth.uid());

-- =============================================
-- ADD REPLY_TO TO DM_MESSAGES (if not exists)
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'dm_messages' 
    AND column_name = 'reply_to'
  ) THEN
    ALTER TABLE public.dm_messages
    ADD COLUMN reply_to UUID REFERENCES public.dm_messages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================
-- MENTIONS TABLE - Links messages to mentioned users
-- =============================================
CREATE TABLE public.message_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  dm_message_id UUID REFERENCES public.dm_messages(id) ON DELETE CASCADE,
  thread_message_id UUID REFERENCES public.thread_messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT mention_source CHECK (
    (message_id IS NOT NULL AND dm_message_id IS NULL AND thread_message_id IS NULL) OR
    (message_id IS NULL AND dm_message_id IS NOT NULL AND thread_message_id IS NULL) OR
    (message_id IS NULL AND dm_message_id IS NULL AND thread_message_id IS NOT NULL)
  )
);

-- RLS for message_mentions
ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mentions in accessible messages"
ON public.message_mentions FOR SELECT
USING (
  (message_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM messages m WHERE m.id = message_mentions.message_id AND can_access_channel(m.channel_id)
  )) OR
  (dm_message_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM dm_messages dm WHERE dm.id = message_mentions.dm_message_id AND is_dm_participant(dm.dm_id)
  )) OR
  (thread_message_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM thread_messages tm
    JOIN messages m ON m.id = tm.parent_message_id
    WHERE tm.id = message_mentions.thread_message_id AND can_access_channel(m.channel_id)
  ))
);

CREATE POLICY "Users can create mentions when sending messages"
ON public.message_mentions FOR INSERT
WITH CHECK (
  (message_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM messages m WHERE m.id = message_mentions.message_id AND m.user_id = auth.uid()
  )) OR
  (dm_message_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM dm_messages dm WHERE dm.id = message_mentions.dm_message_id AND dm.user_id = auth.uid()
  )) OR
  (thread_message_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM thread_messages tm WHERE tm.id = message_mentions.thread_message_id AND tm.user_id = auth.uid()
  ))
);

-- Index for efficient lookups
CREATE INDEX idx_message_mentions_user ON public.message_mentions(mentioned_user_id);
CREATE INDEX idx_message_mentions_message ON public.message_mentions(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX idx_scheduled_messages_scheduled ON public.scheduled_messages(scheduled_at) WHERE sent_at IS NULL AND is_cancelled = false;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_mentions;