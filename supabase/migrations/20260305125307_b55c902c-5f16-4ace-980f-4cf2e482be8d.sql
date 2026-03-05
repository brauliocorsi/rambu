
-- 1. Add checklist_items jsonb to task_templates
ALTER TABLE public.task_templates ADD COLUMN IF NOT EXISTS checklist_items jsonb DEFAULT '[]'::jsonb;

-- 2. task_template_assignees
CREATE TABLE public.task_template_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, user_id)
);
ALTER TABLE public.task_template_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view template assignees" ON public.task_template_assignees
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_templates t WHERE t.id = task_template_assignees.template_id AND is_workspace_member(t.workspace_id)
  ));

CREATE POLICY "Template creator can insert assignees" ON public.task_template_assignees
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.task_templates t WHERE t.id = task_template_assignees.template_id AND t.created_by = auth.uid()
  ));

CREATE POLICY "Template creator can delete assignees" ON public.task_template_assignees
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_templates t WHERE t.id = task_template_assignees.template_id AND t.created_by = auth.uid()
  ));

-- 3. task_checklist_items
CREATE TABLE public.task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_instance_id uuid NOT NULL REFERENCES public.task_instances(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_checked boolean NOT NULL DEFAULT false,
  checked_by uuid REFERENCES public.profiles(id),
  checked_at timestamptz,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channel members can view checklist items" ON public.task_checklist_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_instances ti WHERE ti.id = task_checklist_items.task_instance_id AND can_access_channel(ti.channel_id)
  ));

CREATE POLICY "Task creator or assignee can update checklist" ON public.task_checklist_items
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_instances ti WHERE ti.id = task_checklist_items.task_instance_id
    AND (ti.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.task_assignees ta WHERE ta.task_instance_id = ti.id AND ta.user_id = auth.uid()
    ))
  ));

CREATE POLICY "Task creator can insert checklist items" ON public.task_checklist_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.task_instances ti WHERE ti.id = task_checklist_items.task_instance_id AND ti.created_by = auth.uid()
  ));

CREATE POLICY "Task creator can delete checklist items" ON public.task_checklist_items
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_instances ti WHERE ti.id = task_checklist_items.task_instance_id AND ti.created_by = auth.uid()
  ));

-- 4. task_recurrence_rules
CREATE TABLE public.task_recurrence_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  cron_expression text NOT NULL,
  auto_assignees jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  next_run_at timestamptz NOT NULL,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_recurrence_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view recurrence rules" ON public.task_recurrence_rules
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_templates t WHERE t.id = task_recurrence_rules.template_id AND is_workspace_member(t.workspace_id)
  ));

CREATE POLICY "Creator can insert recurrence rules" ON public.task_recurrence_rules
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator can update recurrence rules" ON public.task_recurrence_rules
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Creator can delete recurrence rules" ON public.task_recurrence_rules
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());
