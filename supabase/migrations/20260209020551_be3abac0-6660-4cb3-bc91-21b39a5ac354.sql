-- Create workspace_invites table (using existing role system first)
CREATE TABLE IF NOT EXISTS public.workspace_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER DEFAULT NULL,
  uses_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on invite_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_workspace_invites_code ON public.workspace_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace ON public.workspace_invites(workspace_id);

-- Enable RLS
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace_invites
CREATE POLICY "Workspace members can view invites"
  ON public.workspace_invites FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can create invites"
  ON public.workspace_invites FOR INSERT
  WITH CHECK (is_workspace_admin(workspace_id) AND created_by = auth.uid());

CREATE POLICY "Admins can update invites"
  ON public.workspace_invites FOR UPDATE
  USING (is_workspace_admin(workspace_id));

CREATE POLICY "Admins can delete invites"
  ON public.workspace_invites FOR DELETE
  USING (is_workspace_admin(workspace_id));

-- Enable public read for active invites (so anyone can join via link)
CREATE POLICY "Anyone can read active invites"
  ON public.workspace_invites FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Security definer function to get user's workspace role
CREATE OR REPLACE FUNCTION public.get_workspace_role(p_workspace_id uuid)
RETURNS workspace_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = p_workspace_id
  AND user_id = auth.uid()
  LIMIT 1
$$;

-- Function to check if user can manage members (admins only)
CREATE OR REPLACE FUNCTION public.can_manage_workspace_members(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_workspace_admin(p_workspace_id)
$$;

-- Function to check if user can create channels
CREATE OR REPLACE FUNCTION public.can_create_channels(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_workspace_admin(p_workspace_id)
$$;