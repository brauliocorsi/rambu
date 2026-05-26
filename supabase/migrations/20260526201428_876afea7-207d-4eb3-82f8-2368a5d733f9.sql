CREATE OR REPLACE FUNCTION public.dispatch_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url TEXT := 'https://cxkwuaaxwubkkuilczeo.supabase.co/functions/v1/send-push-notification';
  -- Service role key: usada como shared secret entre o trigger e a edge function.
  -- Apenas o owner da função (postgres) consegue ler esta definição.
  v_service_role TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4a3d1YWF4d3Via2t1aWxjemVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU5Nzk0OSwiZXhwIjoyMDg2MTczOTQ5fQ.eXNNkgKn3pwl9DOzNGFb6X-DhmnYx0fIokyu23avx14';
BEGIN
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role
    ),
    body := jsonb_build_object('notification_id', NEW.id),
    timeout_milliseconds := 5000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Revogar acesso à definição da função para roles não-admin (defesa em profundidade).
REVOKE ALL ON FUNCTION public.dispatch_push_notification() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_push_notification() TO service_role;