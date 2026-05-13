
-- ============ SUPER ADMINS (global platform role) ============
CREATE TABLE IF NOT EXISTS public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = p_user_id)
$$;

CREATE POLICY "Super admins can view super admins"
  ON public.super_admins FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage super admins"
  ON public.super_admins FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ============ WORKSPACE BANS ============
CREATE TABLE IF NOT EXISTS public.workspace_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  banned_by UUID NOT NULL,
  reason TEXT,
  banned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_bans_workspace ON public.workspace_bans(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_bans_user ON public.workspace_bans(user_id);

ALTER TABLE public.workspace_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace admins view bans"
  ON public.workspace_bans FOR SELECT TO authenticated
  USING (public.is_workspace_admin(workspace_id));

CREATE POLICY "Workspace admins create bans"
  ON public.workspace_bans FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(workspace_id) AND banned_by = auth.uid());

CREATE POLICY "Workspace admins remove bans"
  ON public.workspace_bans FOR DELETE TO authenticated
  USING (public.is_workspace_admin(workspace_id));

-- Helper to check ban
CREATE OR REPLACE FUNCTION public.is_user_banned(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_bans
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  )
$$;

-- Block banned users from rejoining workspace
CREATE OR REPLACE FUNCTION public.block_banned_workspace_join()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.is_user_banned(NEW.workspace_id, NEW.user_id) THEN
    RAISE EXCEPTION 'Usuário banido deste workspace';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_banned_join ON public.workspace_members;
CREATE TRIGGER trg_block_banned_join
  BEFORE INSERT ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.block_banned_workspace_join();

-- ============ PROFILE SOFT DELETE ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============ PERFORMANCE INDEXES ============
CREATE INDEX IF NOT EXISTS idx_messages_channel_created
  ON public.messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user
  ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_msg
  ON public.messages(client_msg_id) WHERE client_msg_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dm_messages_dm_created
  ON public.dm_messages(dm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_messages_user
  ON public.dm_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_client_msg
  ON public.dm_messages(client_msg_id) WHERE client_msg_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dm_group_messages_group_created
  ON public.dm_group_messages(group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_channel_read_status_user_channel
  ON public.channel_read_status(user_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_dm_read_status_user_dm
  ON public.dm_read_status(user_id, dm_id);

CREATE INDEX IF NOT EXISTS idx_channel_members_user
  ON public.channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel
  ON public.channel_members(channel_id);

CREATE INDEX IF NOT EXISTS idx_message_mentions_user
  ON public.message_mentions(mentioned_user_id, created_at DESC);

-- ============ ANONYMIZE DELETED PROFILES ============
-- When is_deleted flips to true, anonymize the public-facing fields.
CREATE OR REPLACE FUNCTION public.anonymize_deleted_profile()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.is_deleted = true AND (OLD.is_deleted IS DISTINCT FROM true) THEN
    NEW.display_name := 'Usuário removido';
    NEW.avatar_url := NULL;
    NEW.bio := NULL;
    NEW.status_emoji := NULL;
    NEW.status_text := NULL;
    NEW.deleted_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_anonymize_deleted_profile ON public.profiles;
CREATE TRIGGER trg_anonymize_deleted_profile
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.anonymize_deleted_profile();
