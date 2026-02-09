-- Create notifications table to store in-app notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'mention', 'dm', 'channel', 'thread_reply'
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB, -- Store related IDs (channel_id, message_id, etc.)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

-- System can insert notifications (via service role)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (user_id = auth.uid());

-- Index for fast queries
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to handle mention notifications
CREATE OR REPLACE FUNCTION public.notify_on_mention()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_id UUID;
  v_sender_name TEXT;
  v_content TEXT;
  v_channel_name TEXT;
  v_channel_id UUID;
BEGIN
  -- Get message details based on mention type
  IF NEW.message_id IS NOT NULL THEN
    SELECT m.user_id, m.content, m.channel_id, c.name
    INTO v_sender_id, v_content, v_channel_id, v_channel_name
    FROM public.messages m
    JOIN public.channels c ON c.id = m.channel_id
    WHERE m.id = NEW.message_id;
  ELSIF NEW.dm_message_id IS NOT NULL THEN
    SELECT user_id, content INTO v_sender_id, v_content
    FROM public.dm_messages
    WHERE id = NEW.dm_message_id;
  ELSIF NEW.thread_message_id IS NOT NULL THEN
    SELECT tm.user_id, tm.content, m.channel_id, c.name
    INTO v_sender_id, v_content, v_channel_id, v_channel_name
    FROM public.thread_messages tm
    JOIN public.messages m ON m.id = tm.parent_message_id
    JOIN public.channels c ON c.id = m.channel_id
    WHERE tm.id = NEW.thread_message_id;
  END IF;

  -- Don't notify if mentioning yourself
  IF v_sender_id = NEW.mentioned_user_id THEN
    RETURN NEW;
  END IF;

  -- Get sender name
  SELECT display_name INTO v_sender_name
  FROM public.profiles
  WHERE id = v_sender_id;

  -- Create notification
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (
    NEW.mentioned_user_id,
    'mention',
    COALESCE(v_sender_name, 'Alguém') || ' mencionou você',
    LEFT(v_content, 100),
    jsonb_build_object(
      'sender_id', v_sender_id,
      'message_id', NEW.message_id,
      'dm_message_id', NEW.dm_message_id,
      'thread_message_id', NEW.thread_message_id,
      'channel_id', v_channel_id,
      'channel_name', v_channel_name
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for mentions
CREATE TRIGGER trigger_notify_on_mention
AFTER INSERT ON public.message_mentions
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_mention();