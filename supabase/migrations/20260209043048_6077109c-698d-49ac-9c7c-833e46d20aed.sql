-- Tabela de lembretes de mensagem
CREATE TABLE public.message_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  dm_message_id UUID REFERENCES public.dm_messages(id) ON DELETE CASCADE,
  group_message_id UUID REFERENCES public.dm_group_messages(id) ON DELETE CASCADE,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT message_reminder_one_type CHECK (
    (CASE WHEN message_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN dm_message_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN group_message_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

-- RLS Policies
ALTER TABLE public.message_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
  ON public.message_reminders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own reminders"
  ON public.message_reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reminders"
  ON public.message_reminders
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reminders"
  ON public.message_reminders
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Índices
CREATE INDEX idx_message_reminders_user ON public.message_reminders(user_id);
CREATE INDEX idx_message_reminders_remind_at ON public.message_reminders(remind_at) WHERE is_completed = false;