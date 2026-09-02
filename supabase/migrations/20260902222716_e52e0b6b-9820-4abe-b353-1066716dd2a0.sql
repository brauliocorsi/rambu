-- 1. audit_logs: only service_role may insert
DROP POLICY IF EXISTS "Members can insert audit logs" ON public.audit_logs;

-- 2. workspace_invites: require authentication for reading active invites
DROP POLICY IF EXISTS "Anyone can read active invites" ON public.workspace_invites;
CREATE POLICY "Authenticated users can read active invites"
ON public.workspace_invites
FOR SELECT
TO authenticated
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- 3. task_instances: restrict UPDATE to creator, assignee or channel admins
DROP POLICY IF EXISTS "Channel members can update task instances" ON public.task_instances;
DROP POLICY IF EXISTS "Users can update task instances" ON public.task_instances;
DROP POLICY IF EXISTS "Members can update task instances" ON public.task_instances;
CREATE POLICY "Creators, assignees and channel admins can update tasks"
ON public.task_instances
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.task_assignees ta
    WHERE ta.task_instance_id = task_instances.id AND ta.user_id = auth.uid()
  )
  OR public.is_channel_admin(channel_id)
)
WITH CHECK (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.task_assignees ta
    WHERE ta.task_instance_id = task_instances.id AND ta.user_id = auth.uid()
  )
  OR public.is_channel_admin(channel_id)
);

-- 4. storage: authenticated-only reads, own-folder uploads
DROP POLICY IF EXISTS "Anyone can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;

CREATE POLICY "Authenticated users can view attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'message-attachments');

CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);