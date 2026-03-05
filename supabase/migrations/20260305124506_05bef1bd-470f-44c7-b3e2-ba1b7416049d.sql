
-- Task multi-assignment: assignees table
CREATE TABLE public.task_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_instance_id uuid NOT NULL REFERENCES public.task_instances(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_instance_id, user_id)
);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channel members can view task assignees"
  ON public.task_assignees FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM task_instances ti
    WHERE ti.id = task_assignees.task_instance_id
    AND can_access_channel(ti.channel_id)
  ));

CREATE POLICY "Task creator can insert assignees"
  ON public.task_assignees FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM task_instances ti
    WHERE ti.id = task_assignees.task_instance_id
    AND ti.created_by = auth.uid()
  ));

CREATE POLICY "Assignee can update own status"
  ON public.task_assignees FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Task creator can delete assignees"
  ON public.task_assignees FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM task_instances ti
    WHERE ti.id = task_assignees.task_instance_id
    AND ti.created_by = auth.uid()
  ));

-- Polls system
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question text NOT NULL,
  is_multiple_choice boolean NOT NULL DEFAULT false,
  is_anonymous boolean NOT NULL DEFAULT false,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channel members can view polls"
  ON public.polls FOR SELECT
  USING (can_access_channel(channel_id));

CREATE POLICY "Channel members can create polls"
  ON public.polls FOR INSERT
  WITH CHECK (can_access_channel(channel_id) AND created_by = auth.uid());

CREATE POLICY "Creator can delete polls"
  ON public.polls FOR DELETE
  USING (created_by = auth.uid());

CREATE TABLE public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  position integer NOT NULL DEFAULT 0
);

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channel members can view poll options"
  ON public.poll_options FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM polls p WHERE p.id = poll_options.poll_id AND can_access_channel(p.channel_id)
  ));

CREATE POLICY "Poll creator can insert options"
  ON public.poll_options FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM polls p WHERE p.id = poll_options.poll_id AND p.created_by = auth.uid()
  ));

CREATE POLICY "Poll creator can delete options"
  ON public.poll_options FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM polls p WHERE p.id = poll_options.poll_id AND p.created_by = auth.uid()
  ));

CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_option_id, user_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channel members can view poll votes"
  ON public.poll_votes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM poll_options po
    JOIN polls p ON p.id = po.poll_id
    WHERE po.id = poll_votes.poll_option_id AND can_access_channel(p.channel_id)
  ));

CREATE POLICY "Channel members can vote"
  ON public.poll_votes FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM poll_options po
    JOIN polls p ON p.id = po.poll_id
    WHERE po.id = poll_votes.poll_option_id AND can_access_channel(p.channel_id)
  ));

CREATE POLICY "Users can remove own votes"
  ON public.poll_votes FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime for poll votes
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
