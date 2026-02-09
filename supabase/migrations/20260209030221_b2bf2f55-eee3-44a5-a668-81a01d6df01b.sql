-- Create enum for channel roles
CREATE TYPE public.channel_role AS ENUM ('owner', 'admin', 'member');

-- Add role column to channel_members
ALTER TABLE public.channel_members 
ADD COLUMN role channel_role NOT NULL DEFAULT 'member';

-- Create security definer function to check channel role
CREATE OR REPLACE FUNCTION public.get_channel_role(p_channel_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS channel_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.channel_members
  WHERE channel_id = p_channel_id
    AND user_id = p_user_id
  LIMIT 1
$$;

-- Function to check if user is channel admin or owner
CREATE OR REPLACE FUNCTION public.is_channel_admin(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.channel_members
    WHERE channel_id = p_channel_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
$$;

-- Function to check if user is channel owner
CREATE OR REPLACE FUNCTION public.is_channel_owner(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.channel_members
    WHERE channel_id = p_channel_id
      AND user_id = auth.uid()
      AND role = 'owner'
  )
$$;

-- Update the auto_add_channel_creator function to set role as owner
CREATE OR REPLACE FUNCTION public.auto_add_channel_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always add creator as owner for private channels
  IF NEW.is_private = true THEN
    INSERT INTO public.channel_members (channel_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create policy for channel admins to manage member roles
CREATE POLICY "Channel admins can update member roles"
ON public.channel_members
FOR UPDATE
USING (is_channel_admin(channel_id))
WITH CHECK (is_channel_admin(channel_id));