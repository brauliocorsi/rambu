
-- =====================================================
-- Tabela push_subscriptions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  platform TEXT,
  device_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_push_subscriptions"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_push_subscriptions"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_push_subscriptions"
  ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_push_subscriptions"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active
  ON public.push_subscriptions (user_id) WHERE is_active = true;

CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Tabela notification_delivery_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID,
  user_id UUID NOT NULL,
  push_subscription_id UUID,
  status TEXT NOT NULL,
  error_message TEXT,
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notification_delivery_logs TO authenticated;
GRANT ALL ON public.notification_delivery_logs TO service_role;

ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_delivery_logs"
  ON public.notification_delivery_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_user_created
  ON public.notification_delivery_logs (user_id, created_at DESC);

-- =====================================================
-- Trigger: notify_on_group_message
-- Cria notification rows para todos os membros do grupo (exceto autor)
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_on_group_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_group_name TEXT;
  v_member RECORD;
BEGIN
  SELECT display_name INTO v_sender_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT name INTO v_group_name FROM public.dm_groups WHERE id = NEW.group_id;

  FOR v_member IN
    SELECT user_id FROM public.dm_group_members
    WHERE group_id = NEW.group_id AND user_id <> NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    VALUES (
      v_member.user_id,
      'group',
      COALESCE(v_sender_name, 'Alguém') || ' em ' || COALESCE(v_group_name, 'grupo'),
      LEFT(COALESCE(NEW.content, ''), 100),
      jsonb_build_object(
        'sender_id', NEW.user_id,
        'group_id', NEW.group_id,
        'group_message_id', NEW.id,
        'group_name', v_group_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_group_message ON public.dm_group_messages;
CREATE TRIGGER trg_notify_on_group_message
  AFTER INSERT ON public.dm_group_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_group_message();

-- =====================================================
-- Dispatcher de push: chama edge function via pg_net
-- =====================================================
CREATE OR REPLACE FUNCTION public.dispatch_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url TEXT := 'https://cxkwuaaxwubkkuilczeo.supabase.co/functions/v1/send-push-notification';
  v_anon TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4a3d1YWF4d3Via2t1aWxjemVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTc5NDksImV4cCI6MjA4NjE3Mzk0OX0.HLUtWPdJsp_5EsC4YWQKvU0sFPVhlC5_Jl0LwA-9iek';
BEGIN
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon
    ),
    body := jsonb_build_object('notification_id', NEW.id),
    timeout_milliseconds := 5000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear o INSERT da notification por falha de push
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_push ON public.notifications;
CREATE TRIGGER trg_dispatch_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_push_notification();
