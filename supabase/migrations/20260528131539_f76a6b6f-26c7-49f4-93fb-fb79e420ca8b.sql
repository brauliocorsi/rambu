
-- Restrict notifications INSERT to service_role only (triggers/edge functions)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- Add WITH CHECK to push_subscriptions UPDATE so user_id can't be reassigned
DROP POLICY IF EXISTS users_update_own_push_subscriptions ON public.push_subscriptions;
CREATE POLICY users_update_own_push_subscriptions
ON public.push_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
