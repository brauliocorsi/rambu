-- Phase 4 & 7: Add presence and status fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS do_not_disturb BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dnd_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS away_message TEXT;

-- Phase 2: Add push notifications to preferences
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true;

-- Phase 5: Create quick_replies table
CREATE TABLE IF NOT EXISTS public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  shortcut TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, shortcut)
);

-- Enable RLS for quick_replies
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

-- RLS policies for quick_replies
CREATE POLICY "Users can view own quick replies"
ON public.quick_replies FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own quick replies"
ON public.quick_replies FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own quick replies"
ON public.quick_replies FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own quick replies"
ON public.quick_replies FOR DELETE
USING (user_id = auth.uid());

-- Phase 8: Add mural fields to channels
ALTER TABLE public.channels 
ADD COLUMN IF NOT EXISTS mural_content TEXT,
ADD COLUMN IF NOT EXISTS mural_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mural_updated_by UUID;

-- Create trigger for quick_replies updated_at
CREATE TRIGGER update_quick_replies_updated_at
BEFORE UPDATE ON public.quick_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for profiles (for presence updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;