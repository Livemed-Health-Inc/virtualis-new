-- 1. must_change_password is server-authoritative -----------------------------
CREATE OR REPLACE FUNCTION public.profiles_guard_setup_flag()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.must_change_password IS DISTINCT FROM OLD.must_change_password
     AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'must_change_password is server-managed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_setup_flag ON public.profiles;
CREATE TRIGGER profiles_guard_setup_flag
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_setup_flag();

REVOKE ALL ON FUNCTION public.profiles_guard_setup_flag() FROM PUBLIC, anon, authenticated;

-- 2. Least-privilege table grants ---------------------------------------------
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t.tablename);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t.tablename);
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- Reference data (read-only for clinicians)
GRANT SELECT ON public.care_team TO authenticated;
GRANT SELECT ON public.shifts TO authenticated;
GRANT SELECT ON public.provider_credentials TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.rounding_acks TO authenticated;
GRANT SELECT ON public.encounter_requests TO authenticated;

-- Clinician surfaces
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.threads TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_reads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.provider_presence TO authenticated;

-- Administration surfaces (RLS restricts these to admins)
GRANT SELECT, INSERT ON public.facilities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invites TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.devices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.device_enrollments TO authenticated;

-- 3. Audit trail: read-only for clients, written only by trusted server code ---
DROP POLICY IF EXISTS audit_log_insert_self ON public.audit_log;
GRANT SELECT ON public.audit_log TO authenticated;

-- rate_limits stays server-only: no grants to anon or authenticated.
