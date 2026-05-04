
-- ============ FASE 1: Edição, Pin, Saved, Ephemeral, Link Previews ============

-- 1. Novas colunas em messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_by uuid,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz DEFAULT now();

ALTER TABLE public.dm_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_by uuid,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz DEFAULT now();

ALTER TABLE public.dm_group_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_by uuid,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_messages_pinned ON public.messages(channel_id) WHERE pinned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dm_messages_pinned ON public.dm_messages(dm_id) WHERE pinned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_messages_pinned ON public.dm_group_messages(group_id) WHERE pinned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_expires ON public.messages(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dm_messages_expires ON public.dm_messages(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_messages_expires ON public.dm_group_messages(expires_at) WHERE expires_at IS NOT NULL;

-- 2. Histórico de edições
CREATE TABLE IF NOT EXISTS public.message_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  previous_content text NOT NULL,
  edited_by uuid NOT NULL,
  edited_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.message_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View edits in accessible channels" ON public.message_edits FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_edits.message_id AND public.can_access_channel(m.channel_id))
);
CREATE POLICY "Authors can insert edits" ON public.message_edits FOR INSERT TO authenticated WITH CHECK (
  edited_by = auth.uid() AND EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_edits.message_id AND m.user_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.dm_message_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_message_id uuid NOT NULL,
  previous_content text NOT NULL,
  edited_by uuid NOT NULL,
  edited_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dm_message_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View dm edits as participant" ON public.dm_message_edits FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.dm_messages dm WHERE dm.id = dm_message_edits.dm_message_id AND public.is_dm_participant(dm.dm_id))
);
CREATE POLICY "Authors can insert dm edits" ON public.dm_message_edits FOR INSERT TO authenticated WITH CHECK (
  edited_by = auth.uid() AND EXISTS (SELECT 1 FROM public.dm_messages dm WHERE dm.id = dm_message_edits.dm_message_id AND dm.user_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.group_message_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_message_id uuid NOT NULL,
  previous_content text NOT NULL,
  edited_by uuid NOT NULL,
  edited_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.group_message_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View group edits as member" ON public.group_message_edits FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.dm_group_messages gm WHERE gm.id = group_message_edits.group_message_id AND public.is_dm_group_member(gm.group_id))
);
CREATE POLICY "Authors can insert group edits" ON public.group_message_edits FOR INSERT TO authenticated WITH CHECK (
  edited_by = auth.uid() AND EXISTS (SELECT 1 FROM public.dm_group_messages gm WHERE gm.id = group_message_edits.group_message_id AND gm.user_id = auth.uid())
);

-- 3. Mensagens salvas
CREATE TABLE IF NOT EXISTS public.saved_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id uuid,
  dm_message_id uuid,
  group_message_id uuid,
  saved_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_one_target CHECK (
    (message_id IS NOT NULL)::int + (dm_message_id IS NOT NULL)::int + (group_message_id IS NOT NULL)::int = 1
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_messages_user_msg ON public.saved_messages(user_id, message_id) WHERE message_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_messages_user_dm ON public.saved_messages(user_id, dm_message_id) WHERE dm_message_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_messages_user_grp ON public.saved_messages(user_id, group_message_id) WHERE group_message_id IS NOT NULL;
ALTER TABLE public.saved_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own saved" ON public.saved_messages FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own saved" ON public.saved_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own saved" ON public.saved_messages FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 4. Cache de previews de links
CREATE TABLE IF NOT EXISTS public.link_previews (
  url text PRIMARY KEY,
  title text,
  description text,
  image_url text,
  site_name text,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.link_previews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view link previews" ON public.link_previews FOR SELECT TO authenticated USING (true);
-- Inserção via edge function com service role (sem policy de insert para usuários)

-- 5. Trigger para registrar edição automaticamente
CREATE OR REPLACE FUNCTION public.track_message_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    INSERT INTO public.message_edits (message_id, previous_content, edited_by)
    VALUES (OLD.id, OLD.content, auth.uid());
    NEW.edited_at = now();
    NEW.is_edited = true;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_track_message_edit ON public.messages;
CREATE TRIGGER trg_track_message_edit BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.track_message_edit();

CREATE OR REPLACE FUNCTION public.track_dm_message_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    INSERT INTO public.dm_message_edits (dm_message_id, previous_content, edited_by)
    VALUES (OLD.id, OLD.content, auth.uid());
    NEW.edited_at = now();
    NEW.is_edited = true;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_track_dm_message_edit ON public.dm_messages;
CREATE TRIGGER trg_track_dm_message_edit BEFORE UPDATE ON public.dm_messages
FOR EACH ROW EXECUTE FUNCTION public.track_dm_message_edit();

CREATE OR REPLACE FUNCTION public.track_group_message_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    INSERT INTO public.group_message_edits (group_message_id, previous_content, edited_by)
    VALUES (OLD.id, OLD.content, auth.uid());
    NEW.edited_at = now();
    NEW.is_edited = true;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_track_group_message_edit ON public.dm_group_messages;
CREATE TRIGGER trg_track_group_message_edit BEFORE UPDATE ON public.dm_group_messages
FOR EACH ROW EXECUTE FUNCTION public.track_group_message_edit();
