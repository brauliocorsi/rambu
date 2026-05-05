
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS client_msg_id uuid;
ALTER TABLE public.dm_messages ADD COLUMN IF NOT EXISTS client_msg_id uuid;
ALTER TABLE public.dm_group_messages ADD COLUMN IF NOT EXISTS client_msg_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS messages_client_msg_uniq
  ON public.messages (channel_id, client_msg_id)
  WHERE client_msg_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS dm_messages_client_msg_uniq
  ON public.dm_messages (dm_id, client_msg_id)
  WHERE client_msg_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS dm_group_messages_client_msg_uniq
  ON public.dm_group_messages (group_id, client_msg_id)
  WHERE client_msg_id IS NOT NULL;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.dm_messages REPLICA IDENTITY FULL;
ALTER TABLE public.dm_group_messages REPLICA IDENTITY FULL;
ALTER TABLE public.thread_messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;
