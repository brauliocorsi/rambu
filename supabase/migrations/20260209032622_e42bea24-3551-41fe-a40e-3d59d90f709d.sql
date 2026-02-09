-- Create channel categories table
CREATE TABLE public.channel_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id, name)
);

-- Create channel category assignments table (which channels are in which categories for each user)
CREATE TABLE public.channel_category_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.channel_categories(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, channel_id)
);

-- Create archived DMs table
CREATE TABLE public.archived_dms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dm_id UUID NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dm_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.channel_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_category_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_dms ENABLE ROW LEVEL SECURITY;

-- RLS policies for channel_categories
CREATE POLICY "Users can view their own categories"
  ON public.channel_categories FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own categories"
  ON public.channel_categories FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own categories"
  ON public.channel_categories FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own categories"
  ON public.channel_categories FOR DELETE
  USING (user_id = auth.uid());

-- RLS policies for channel_category_items
CREATE POLICY "Users can view their own category items"
  ON public.channel_category_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.channel_categories cc
    WHERE cc.id = category_id AND cc.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own category items"
  ON public.channel_category_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.channel_categories cc
    WHERE cc.id = category_id AND cc.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own category items"
  ON public.channel_category_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.channel_categories cc
    WHERE cc.id = category_id AND cc.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own category items"
  ON public.channel_category_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.channel_categories cc
    WHERE cc.id = category_id AND cc.user_id = auth.uid()
  ));

-- RLS policies for archived_dms
CREATE POLICY "Users can view their own archived DMs"
  ON public.archived_dms FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can archive their own DMs"
  ON public.archived_dms FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.direct_messages dm
    WHERE dm.id = dm_id AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid())
  ));

CREATE POLICY "Users can unarchive their own DMs"
  ON public.archived_dms FOR DELETE
  USING (user_id = auth.uid());

-- Create triggers for updated_at
CREATE TRIGGER update_channel_categories_updated_at
  BEFORE UPDATE ON public.channel_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();