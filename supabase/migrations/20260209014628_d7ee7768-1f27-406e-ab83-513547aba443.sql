-- Table to track read status for channels
CREATE TABLE public.channel_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

-- Table to track read status for DMs
CREATE TABLE public.dm_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dm_id UUID NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, dm_id)
);

-- Table for user notification preferences
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_volume DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  dm_notifications BOOLEAN NOT NULL DEFAULT true,
  channel_notifications BOOLEAN NOT NULL DEFAULT true,
  mention_notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.channel_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for channel_read_status
CREATE POLICY "Users can view their own read status"
  ON public.channel_read_status
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own read status"
  ON public.channel_read_status
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own read status"
  ON public.channel_read_status
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for dm_read_status
CREATE POLICY "Users can view their own DM read status"
  ON public.dm_read_status
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own DM read status"
  ON public.dm_read_status
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own DM read status"
  ON public.dm_read_status
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_channel_read_status_user ON public.channel_read_status(user_id);
CREATE INDEX idx_channel_read_status_channel ON public.channel_read_status(channel_id);
CREATE INDEX idx_dm_read_status_user ON public.dm_read_status(user_id);
CREATE INDEX idx_dm_read_status_dm ON public.dm_read_status(dm_id);