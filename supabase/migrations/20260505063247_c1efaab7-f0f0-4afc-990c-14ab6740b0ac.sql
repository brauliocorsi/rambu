
-- Audit logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_workspace_created ON public.audit_logs(workspace_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace admins view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_workspace_admin(workspace_id));

CREATE POLICY "Members can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id) AND actor_id = auth.uid());

-- Workspace settings: retention and accent color
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS retention_days integer,
  ADD COLUMN IF NOT EXISTS accent_color text;

-- Indexes for retention sweeps
CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON public.messages(channel_id, created_at);
