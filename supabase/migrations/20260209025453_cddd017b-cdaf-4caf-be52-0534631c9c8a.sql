-- 1. Create channel_favorites table
CREATE TABLE public.channel_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

-- Enable RLS
ALTER TABLE public.channel_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for channel_favorites
CREATE POLICY "Users can view their own favorites" 
ON public.channel_favorites 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can add their own favorites" 
ON public.channel_favorites 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own favorites" 
ON public.channel_favorites 
FOR DELETE 
USING (user_id = auth.uid());

-- 2. Create channel_notification_preferences table
CREATE TABLE public.channel_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  notification_level TEXT NOT NULL DEFAULT 'all' CHECK (notification_level IN ('all', 'mentions', 'none')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

-- Enable RLS
ALTER TABLE public.channel_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for channel_notification_preferences
CREATE POLICY "Users can view their own notification preferences" 
ON public.channel_notification_preferences 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification preferences" 
ON public.channel_notification_preferences 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification preferences" 
ON public.channel_notification_preferences 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notification preferences" 
ON public.channel_notification_preferences 
FOR DELETE 
USING (user_id = auth.uid());

-- 3. Add advanced away mode columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS away_auto_reply TEXT,
ADD COLUMN IF NOT EXISTS away_notification_level TEXT DEFAULT 'all' CHECK (away_notification_level IN ('all', 'mentions', 'none')),
ADD COLUMN IF NOT EXISTS scheduled_away_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduled_away_end TIMESTAMP WITH TIME ZONE;

-- Create trigger to update updated_at on channel_notification_preferences
CREATE TRIGGER update_channel_notification_preferences_updated_at
BEFORE UPDATE ON public.channel_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();