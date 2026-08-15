-- Least-privilege answering of bedside encounter requests -------------------
DROP POLICY IF EXISTS "requests_update_facility" ON public.encounter_requests;
REVOKE UPDATE ON public.encounter_requests FROM authenticated;
GRANT SELECT ON public.encounter_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_to_encounter_request(
  _request_id uuid,
  _next text
)
RETURNS public.encounter_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.encounter_requests;
  is_admin boolean := public.has_role(auth.uid(), 'admin');
  updated public.encounter_requests;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF _next NOT IN ('accepted', 'declined', 'ended') THEN
    RAISE EXCEPTION 'invalid transition' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO req FROM public.encounter_requests WHERE id = _request_id;
  IF req.id IS NULL THEN
    RAISE EXCEPTION 'not found' USING ERRCODE = 'P0002';
  END IF;

  -- Facility membership (credentialed clinician) or administrator only.
  IF NOT (is_admin OR public.has_facility_access(auth.uid(), req.facility_id)) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF _next IN ('accepted', 'declined') THEN
    IF req.status <> 'requested' THEN
      RAISE EXCEPTION 'invalid transition' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF req.status <> 'accepted' THEN
      RAISE EXCEPTION 'invalid transition' USING ERRCODE = '22023';
    END IF;
    -- Only the bound provider (or an administrator) may end the encounter.
    IF NOT (is_admin OR req.provider_id = auth.uid()) THEN
      RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.encounter_requests r
     SET status      = _next,
         provider_id = CASE WHEN _next = 'accepted' THEN auth.uid() ELSE r.provider_id END,
         accepted_at = CASE WHEN _next = 'accepted' THEN now() ELSE r.accepted_at END,
         ended_at    = CASE WHEN _next IN ('declined', 'ended') THEN now() ELSE r.ended_at END
   WHERE r.id = req.id
     AND r.status = req.status
  RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'invalid transition' USING ERRCODE = '22023';
  END IF;

  RETURN updated;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_encounter_request(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_encounter_request(uuid, text) TO authenticated;