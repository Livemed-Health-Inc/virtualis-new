-- Facility-scoped clinician presence -----------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_presence (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_id text NOT NULL REFERENCES public.facilities(id),
  specialty text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'offline',
  ready_to_round boolean NOT NULL DEFAULT false,
  ready_to_round_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, facility_id),
  CONSTRAINT provider_presence_status_check CHECK (status IN ('offline', 'online', 'in_consult'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_presence TO authenticated;
GRANT ALL ON public.provider_presence TO service_role;
ALTER TABLE public.provider_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presence_read_facility" ON public.provider_presence;
CREATE POLICY "presence_read_facility" ON public.provider_presence FOR SELECT TO authenticated
  USING (public.has_facility_access(auth.uid(), facility_id));

DROP POLICY IF EXISTS "presence_write_own" ON public.provider_presence;
CREATE POLICY "presence_write_own" ON public.provider_presence FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.has_facility_access(auth.uid(), facility_id))
  WITH CHECK (user_id = auth.uid() AND public.has_facility_access(auth.uid(), facility_id));

DROP TRIGGER IF EXISTS update_provider_presence_updated_at ON public.provider_presence;
CREATE TRIGGER update_provider_presence_updated_at BEFORE UPDATE ON public.provider_presence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Device-originated virtual encounter requests --------------------------------
CREATE TABLE IF NOT EXISTS public.encounter_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  facility_id text NOT NULL REFERENCES public.facilities(id),
  specialty text NOT NULL,
  urgency public.acuity_level NOT NULL DEFAULT 'urgent',
  mode text NOT NULL DEFAULT 'consult',
  status text NOT NULL DEFAULT 'requested',
  provider_id uuid REFERENCES auth.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT encounter_requests_mode_check CHECK (mode IN ('call', 'consult')),
  CONSTRAINT encounter_requests_status_check
    CHECK (status IN ('requested', 'accepted', 'declined', 'ended', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS encounter_requests_facility_idx
  ON public.encounter_requests(facility_id, status, requested_at DESC);

GRANT SELECT, UPDATE ON public.encounter_requests TO authenticated;
GRANT ALL ON public.encounter_requests TO service_role;
ALTER TABLE public.encounter_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requests_read_facility" ON public.encounter_requests;
CREATE POLICY "requests_read_facility" ON public.encounter_requests FOR SELECT TO authenticated
  USING (public.has_facility_access(auth.uid(), facility_id));

DROP POLICY IF EXISTS "requests_update_facility" ON public.encounter_requests;
CREATE POLICY "requests_update_facility" ON public.encounter_requests FOR UPDATE TO authenticated
  USING (public.has_facility_access(auth.uid(), facility_id))
  WITH CHECK (public.has_facility_access(auth.uid(), facility_id));

DROP TRIGGER IF EXISTS update_encounter_requests_updated_at ON public.encounter_requests;
CREATE TRIGGER update_encounter_requests_updated_at BEFORE UPDATE ON public.encounter_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bedside acknowledgement of a clinician's ready-to-round alert ---------------
CREATE TABLE IF NOT EXISTS public.rounding_acks (
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, provider_id)
);

GRANT SELECT ON public.rounding_acks TO authenticated;
GRANT ALL ON public.rounding_acks TO service_role;
ALTER TABLE public.rounding_acks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rounding_acks_read_facility" ON public.rounding_acks;
CREATE POLICY "rounding_acks_read_facility" ON public.rounding_acks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.devices d
    WHERE d.id = rounding_acks.device_id
      AND public.has_facility_access(auth.uid(), d.facility_id)
  ));

-- Live updates ---------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.encounter_requests;