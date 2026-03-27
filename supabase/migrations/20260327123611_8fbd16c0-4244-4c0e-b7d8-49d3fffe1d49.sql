
-- Table for channel message views
CREATE TABLE public.message_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.message_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can record their own views" ON public.message_views
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Channel members can view message views" ON public.message_views
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_views.message_id
    AND can_access_channel(m.channel_id)
  ));

-- Table for DM message views
CREATE TABLE public.dm_message_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_message_id uuid NOT NULL REFERENCES public.dm_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(dm_message_id, user_id)
);

ALTER TABLE public.dm_message_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can record their own DM views" ON public.dm_message_views
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "DM participants can view DM message views" ON public.dm_message_views
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dm_messages dm
    WHERE dm.id = dm_message_views.dm_message_id
    AND is_dm_participant(dm.dm_id)
  ));

-- Indexes for performance
CREATE INDEX idx_message_views_message_id ON public.message_views(message_id);
CREATE INDEX idx_message_views_user_id ON public.message_views(user_id);
CREATE INDEX idx_dm_message_views_dm_message_id ON public.dm_message_views(dm_message_id);
CREATE INDEX idx_dm_message_views_user_id ON public.dm_message_views(user_id);
