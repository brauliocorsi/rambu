
-- Create enums
CREATE TYPE public.task_status AS ENUM ('pending', 'approved', 'rejected', 'completed');
CREATE TYPE public.task_field_type AS ENUM ('text', 'number', 'textarea', 'attachment');

-- 1. Task Templates
CREATE TABLE public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view templates"
  ON public.task_templates FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can create templates"
  ON public.task_templates FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id) AND created_by = auth.uid());

CREATE POLICY "Creator can update templates"
  ON public.task_templates FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Creator can delete templates"
  ON public.task_templates FOR DELETE
  USING (created_by = auth.uid());

-- 2. Task Template Fields
CREATE TABLE public.task_template_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  field_type public.task_field_type NOT NULL DEFAULT 'text',
  label text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0
);

ALTER TABLE public.task_template_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fields of accessible templates"
  ON public.task_template_fields FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.task_templates t
    WHERE t.id = task_template_fields.template_id
    AND is_workspace_member(t.workspace_id)
  ));

CREATE POLICY "Template creator can insert fields"
  ON public.task_template_fields FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.task_templates t
    WHERE t.id = task_template_fields.template_id
    AND t.created_by = auth.uid()
  ));

CREATE POLICY "Template creator can update fields"
  ON public.task_template_fields FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.task_templates t
    WHERE t.id = task_template_fields.template_id
    AND t.created_by = auth.uid()
  ));

CREATE POLICY "Template creator can delete fields"
  ON public.task_template_fields FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.task_templates t
    WHERE t.id = task_template_fields.template_id
    AND t.created_by = auth.uid()
  ));

-- 3. Task Instances
CREATE TABLE public.task_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.task_status NOT NULL DEFAULT 'pending',
  requires_approval boolean NOT NULL DEFAULT false,
  reminder_at timestamptz,
  message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channel members can view task instances"
  ON public.task_instances FOR SELECT
  USING (can_access_channel(channel_id));

CREATE POLICY "Channel members can create task instances"
  ON public.task_instances FOR INSERT
  WITH CHECK (can_access_channel(channel_id) AND created_by = auth.uid());

CREATE POLICY "Creator or assigned can update task instances"
  ON public.task_instances FOR UPDATE
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR can_access_channel(channel_id));

CREATE POLICY "Creator can delete task instances"
  ON public.task_instances FOR DELETE
  USING (created_by = auth.uid());

-- 4. Task Field Values
CREATE TABLE public.task_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_instance_id uuid NOT NULL REFERENCES public.task_instances(id) ON DELETE CASCADE,
  template_field_id uuid NOT NULL REFERENCES public.task_template_fields(id) ON DELETE CASCADE,
  value_text text,
  value_number numeric,
  file_url text,
  file_name text
);

ALTER TABLE public.task_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channel members can view task field values"
  ON public.task_field_values FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.task_instances ti
    WHERE ti.id = task_field_values.task_instance_id
    AND can_access_channel(ti.channel_id)
  ));

CREATE POLICY "Task creator can insert field values"
  ON public.task_field_values FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.task_instances ti
    WHERE ti.id = task_field_values.task_instance_id
    AND ti.created_by = auth.uid()
  ));

CREATE POLICY "Task creator can update field values"
  ON public.task_field_values FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.task_instances ti
    WHERE ti.id = task_field_values.task_instance_id
    AND ti.created_by = auth.uid()
  ));

-- 5. Task Approvals
CREATE TABLE public.task_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_instance_id uuid NOT NULL REFERENCES public.task_instances(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('approved', 'rejected')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channel members can view approvals"
  ON public.task_approvals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.task_instances ti
    WHERE ti.id = task_approvals.task_instance_id
    AND can_access_channel(ti.channel_id)
  ));

CREATE POLICY "Channel members can create approvals"
  ON public.task_approvals FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.task_instances ti
      WHERE ti.id = task_approvals.task_instance_id
      AND can_access_channel(ti.channel_id)
    )
  );
