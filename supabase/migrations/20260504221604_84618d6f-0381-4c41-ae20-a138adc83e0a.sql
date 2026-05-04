
-- Snooze de canais (silenciar até)
ALTER TABLE public.channel_notification_preferences
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz;

-- Sistema de Labels (etiquetas) por usuário, aplicáveis a canais e DMs
CREATE TABLE IF NOT EXISTS public.user_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.user_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own labels select" ON public.user_labels FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users manage own labels insert" ON public.user_labels FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own labels update" ON public.user_labels FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users manage own labels delete" ON public.user_labels FOR DELETE USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.label_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id uuid NOT NULL REFERENCES public.user_labels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  channel_id uuid,
  dm_id uuid,
  group_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (channel_id IS NOT NULL)::int + (dm_id IS NOT NULL)::int + (group_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_label_assignments_user ON public.label_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_label_assignments_label ON public.label_assignments(label_id);

ALTER TABLE public.label_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own assignments" ON public.label_assignments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own assignments" ON public.label_assignments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own assignments" ON public.label_assignments FOR DELETE USING (user_id = auth.uid());
