
CREATE TABLE public.dm_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.dm_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_dm_message_reactions_message_id ON public.dm_message_reactions(message_id);

GRANT SELECT, INSERT, DELETE ON public.dm_message_reactions TO authenticated;
GRANT ALL ON public.dm_message_reactions TO service_role;

ALTER TABLE public.dm_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view dm reactions"
ON public.dm_message_reactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dm_messages m
    JOIN public.direct_messages dm ON dm.id = m.dm_id
    WHERE m.id = dm_message_reactions.message_id
      AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid())
  )
);

CREATE POLICY "Participants can add own dm reactions"
ON public.dm_message_reactions FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.dm_messages m
    JOIN public.direct_messages dm ON dm.id = m.dm_id
    WHERE m.id = dm_message_reactions.message_id
      AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid())
  )
);

CREATE POLICY "Users can remove own dm reactions"
ON public.dm_message_reactions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_message_reactions;
