-- ============================================================
-- 1. Server-authoritative password-setup completion
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Existing accounts are already set up; leave them false explicitly.
UPDATE public.profiles SET must_change_password = false WHERE must_change_password IS DISTINCT FROM false;

CREATE OR REPLACE FUNCTION public.setup_complete(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT COALESCE(
    (SELECT p.must_change_password FROM public.profiles p WHERE p.id = _user_id),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_facility(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.provider_credentials ca
    JOIN public.provider_credentials cb ON cb.facility_id = ca.facility_id
    WHERE ca.user_id = _a AND cb.user_id = _b
  );
$$;

-- ============================================================
-- 2. Append-only, metadata-only audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  facility_id text REFERENCES public.facilities(id),
  correlation_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_action_allowed CHECK (action IN (
    'sign_in','sign_out','password_complete',
    'thread_open','thread_create','message_send',
    'encounter_request','encounter_accept','encounter_decline','encounter_end','encounter_cancel',
    'device_pair','device_sync_denied',
    'admin_invite','admin_invite_revoke','admin_facility_create',
    'admin_device_register','admin_device_enrollment','admin_device_status',
    'modellab_decision','modellab_feedback','modellab_stage'
  )),
  CONSTRAINT audit_log_entity_allowed CHECK (entity_type IN (
    'thread','message','encounter_request','device','device_enrollment',
    'invite','facility','profile','model','session'
  )),
  CONSTRAINT audit_log_correlation_shape CHECK (
    correlation_id IS NULL OR correlation_id ~ '^[A-Za-z0-9_-]{1,64}$'
  )
);

CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_facility_idx ON public.audit_log (facility_id, created_at DESC);

-- Append-only: no UPDATE/DELETE privilege is ever granted to app roles.
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT SELECT, INSERT ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_insert_self ON public.audit_log;
CREATE POLICY audit_log_insert_self ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

DROP POLICY IF EXISTS audit_log_read_scoped ON public.audit_log;
CREATE POLICY audit_log_read_scoped ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (facility_id IS NOT NULL AND public.has_facility_access(auth.uid(), facility_id))
  );

-- Belt and braces: block row mutation even if a privilege is added later.
CREATE OR REPLACE FUNCTION public.audit_log_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_update ON public.audit_log;
CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();

-- ============================================================
-- 3. Persistent atomic rate limiting (server-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket_key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  locked_until timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: unreachable by anon/authenticated. service_role bypasses RLS.

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  _key text,
  _limit integer,
  _window_seconds integer,
  _lock_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.rate_limits;
BEGIN
  INSERT INTO public.rate_limits (bucket_key, attempts, window_start, updated_at)
  VALUES (_key, 0, now(), now())
  ON CONFLICT (bucket_key) DO UPDATE SET updated_at = now()
  RETURNING * INTO row;

  SELECT * INTO row FROM public.rate_limits WHERE bucket_key = _key FOR UPDATE;

  IF row.locked_until IS NOT NULL AND row.locked_until > now() THEN
    RETURN false;
  END IF;

  IF row.window_start < now() - make_interval(secs => _window_seconds) THEN
    UPDATE public.rate_limits
       SET attempts = 1, window_start = now(), locked_until = NULL, updated_at = now()
     WHERE bucket_key = _key;
    RETURN true;
  END IF;

  IF row.attempts + 1 > _limit THEN
    UPDATE public.rate_limits
       SET attempts = row.attempts + 1,
           locked_until = now() + make_interval(secs => _lock_seconds),
           updated_at = now()
     WHERE bucket_key = _key;
    RETURN false;
  END IF;

  UPDATE public.rate_limits
     SET attempts = row.attempts + 1, updated_at = now()
   WHERE bucket_key = _key;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_rate_limit(_key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE bucket_key = _key;
$$;

-- ============================================================
-- 4. Device token expiry / revocation
-- ============================================================
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS token_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS revoked_at timestamp with time zone;

-- ============================================================
-- 5. Tighten directory access
-- ============================================================
DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY profiles_read ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.shares_facility(auth.uid(), id)
  );

DROP POLICY IF EXISTS facilities_read ON public.facilities;
CREATE POLICY facilities_read ON public.facilities
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_facility_access(auth.uid(), id)
  );

-- ============================================================
-- 6. PHI policies deny access until password setup is complete
-- ============================================================
DROP POLICY IF EXISTS threads_read ON public.threads;
CREATE POLICY threads_read ON public.threads
  FOR SELECT TO authenticated
  USING (public.setup_complete(auth.uid()) AND public.has_facility_access(auth.uid(), facility_id));

DROP POLICY IF EXISTS threads_insert ON public.threads;
CREATE POLICY threads_insert ON public.threads
  FOR INSERT TO authenticated
  WITH CHECK (
    public.setup_complete(auth.uid())
    AND public.has_facility_access(auth.uid(), facility_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS threads_update ON public.threads;
CREATE POLICY threads_update ON public.threads
  FOR UPDATE TO authenticated
  USING (public.setup_complete(auth.uid()) AND public.has_facility_access(auth.uid(), facility_id))
  WITH CHECK (public.setup_complete(auth.uid()) AND public.has_facility_access(auth.uid(), facility_id));

DROP POLICY IF EXISTS messages_read ON public.messages;
CREATE POLICY messages_read ON public.messages
  FOR SELECT TO authenticated
  USING (
    public.setup_complete(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = messages.thread_id AND public.has_facility_access(auth.uid(), t.facility_id)
    )
  );

DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.setup_complete(auth.uid())
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = messages.thread_id AND public.has_facility_access(auth.uid(), t.facility_id)
    )
  );

DROP POLICY IF EXISTS care_team_read ON public.care_team;
CREATE POLICY care_team_read ON public.care_team
  FOR SELECT TO authenticated
  USING (public.setup_complete(auth.uid()) AND public.has_facility_access(auth.uid(), facility_id));

DROP POLICY IF EXISTS shifts_read ON public.shifts;
CREATE POLICY shifts_read ON public.shifts
  FOR SELECT TO authenticated
  USING (public.setup_complete(auth.uid()) AND public.has_facility_access(auth.uid(), facility_id));

DROP POLICY IF EXISTS requests_read_facility ON public.encounter_requests;
CREATE POLICY requests_read_facility ON public.encounter_requests
  FOR SELECT TO authenticated
  USING (public.setup_complete(auth.uid()) AND public.has_facility_access(auth.uid(), facility_id));

DROP POLICY IF EXISTS presence_read_facility ON public.provider_presence;
CREATE POLICY presence_read_facility ON public.provider_presence
  FOR SELECT TO authenticated
  USING (public.setup_complete(auth.uid()) AND public.has_facility_access(auth.uid(), facility_id));

DROP POLICY IF EXISTS presence_write_own ON public.provider_presence;
CREATE POLICY presence_write_own ON public.provider_presence
  FOR ALL TO authenticated
  USING (
    public.setup_complete(auth.uid())
    AND user_id = auth.uid()
    AND public.has_facility_access(auth.uid(), facility_id)
  )
  WITH CHECK (
    public.setup_complete(auth.uid())
    AND user_id = auth.uid()
    AND public.has_facility_access(auth.uid(), facility_id)
  );

DROP POLICY IF EXISTS rounding_acks_read_facility ON public.rounding_acks;
CREATE POLICY rounding_acks_read_facility ON public.rounding_acks
  FOR SELECT TO authenticated
  USING (
    public.setup_complete(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.id = rounding_acks.device_id AND public.has_facility_access(auth.uid(), d.facility_id)
    )
  );

DROP POLICY IF EXISTS "Facility staff read devices" ON public.devices;
CREATE POLICY "Facility staff read devices" ON public.devices
  FOR SELECT TO authenticated
  USING (public.setup_complete(auth.uid()) AND public.has_facility_access(auth.uid(), facility_id));

DROP POLICY IF EXISTS reads_own ON public.thread_reads;
CREATE POLICY reads_own ON public.thread_reads
  FOR ALL TO authenticated
  USING (public.setup_complete(auth.uid()) AND auth.uid() = user_id)
  WITH CHECK (public.setup_complete(auth.uid()) AND auth.uid() = user_id);

-- ============================================================
-- 7. Function hardening: fixed search_path + least-privilege EXECUTE
-- ============================================================
ALTER FUNCTION public.has_facility_access(uuid, text) SET search_path = public;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;
ALTER FUNCTION public.respond_to_encounter_request(uuid, text) SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.bump_thread_activity() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

REVOKE ALL ON FUNCTION public.has_facility_access(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.setup_complete(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_facility(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_to_encounter_request(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_rate_limit(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_thread_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_log_immutable() FROM PUBLIC, anon, authenticated;

-- Only what RLS and the intended RPCs actually need.
GRANT EXECUTE ON FUNCTION public.has_facility_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.setup_complete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_facility(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_encounter_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_rate_limit(text) TO service_role;