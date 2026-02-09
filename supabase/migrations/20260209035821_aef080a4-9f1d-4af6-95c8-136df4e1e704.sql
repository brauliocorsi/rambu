-- Add column to control if members can create channels
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS allow_member_channels boolean NOT NULL DEFAULT true;

-- Create workspace favorites table
CREATE TABLE public.workspace_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);

-- Enable RLS
ALTER TABLE public.workspace_favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace_favorites
CREATE POLICY "Users can view their own workspace favorites"
  ON public.workspace_favorites
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can add their own workspace favorites"
  ON public.workspace_favorites
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_workspace_member(workspace_id));

CREATE POLICY "Users can remove their own workspace favorites"
  ON public.workspace_favorites
  FOR DELETE
  USING (user_id = auth.uid());

-- Create onboarding_completed table to track tutorial completion
CREATE TABLE public.user_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  completed_at timestamp with time zone,
  skipped_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_onboarding
CREATE POLICY "Users can view their own onboarding status"
  ON public.user_onboarding
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own onboarding status"
  ON public.user_onboarding
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own onboarding status"
  ON public.user_onboarding
  FOR UPDATE
  USING (user_id = auth.uid());