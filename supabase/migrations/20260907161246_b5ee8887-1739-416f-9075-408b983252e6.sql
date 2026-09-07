-- ── Clinical review queue ────────────────────────────────────────────────
-- Synthetic / approved deidentified Model Lab traffic only. No PHI.
CREATE TABLE public.review_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL UNIQUE,
  use_case text NOT NULL,
  message_text text NOT NULL,
  predicted_acuity text NOT NULL CHECK (predicted_acuity IN ('low','medium','high')),
  confidence numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  probabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason_codes text[] NOT NULL DEFAULT '{}',
  route_destination text,
  policy_version text,
  model_version text NOT NULL,
  care_setting text,
  sender_role text,
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending','single_reviewed','disagreement','expert_reviewed','adjudicated')),
  final_acuity text CHECK (final_acuity IS NULL OR final_acuity IN ('low','medium','high')),
  label_quality text CHECK (label_quality IS NULL OR label_quality IN ('single_reviewed','expert_reviewed','adjudicated')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX review_cases_queue_idx ON public.review_cases (state, confidence NULLS FIRST);

GRANT SELECT ON public.review_cases TO authenticated;
GRANT ALL ON public.review_cases TO service_role;
ALTER TABLE public.review_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviewers read review cases" ON public.review_cases
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'clinical_reviewer') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_review_cases_updated_at
BEFORE UPDATE ON public.review_cases
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Verdicts ─────────────────────────────────────────────────────────────
-- Structured fields only: no free-text clinical narrative is storable here.
CREATE TABLE public.review_verdicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acuity text NOT NULL CHECK (acuity IN ('low','medium','high')),
  route_accepted boolean NOT NULL,
  outcome_code text NOT NULL CHECK (outcome_code IN (
    'AGREE_WITH_MODEL','UNDER_TRIAGED','OVER_TRIAGED','WRONG_ROUTE',
    'AMBIGUOUS_TEXT','INSUFFICIENT_INFO','ESCALATED_TO_PROVIDER'
  )),
  model_version text NOT NULL,
  is_adjudication boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, reviewer_id)
);

GRANT SELECT ON public.review_verdicts TO authenticated;
GRANT ALL ON public.review_verdicts TO service_role;
ALTER TABLE public.review_verdicts ENABLE ROW LEVEL SECURITY;

-- Independence: a reviewer may read only their own verdict on a case. There is
-- deliberately no INSERT/UPDATE/DELETE policy — verdicts are written solely by
-- submit_review_verdict below, which enforces the ladder.
CREATE POLICY "Reviewers read only their own verdicts" ON public.review_verdicts
FOR SELECT TO authenticated
USING (reviewer_id = auth.uid());

-- ── Guarded routines ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_clinical_reviewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'clinical_reviewer') OR public.has_role(_user_id, 'admin');
$$;

-- Cases this reviewer has not yet judged, most uncertain first. Another
-- reviewer's verdict is never part of the result.
CREATE OR REPLACE FUNCTION public.review_queue(
  _predicted text DEFAULT NULL,
  _use_case text DEFAULT NULL,
  _state text DEFAULT NULL,
  _limit integer DEFAULT 50
)
RETURNS SETOF public.review_cases
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_clinical_reviewer(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT c.*
    FROM public.review_cases c
   WHERE (_predicted IS NULL OR c.predicted_acuity = _predicted)
     AND (_use_case IS NULL OR c.use_case = _use_case)
     AND (_state IS NULL OR c.state = _state)
     AND c.state <> 'adjudicated'
     AND NOT EXISTS (
       SELECT 1 FROM public.review_verdicts v
        WHERE v.case_id = c.id AND v.reviewer_id = auth.uid()
     )
   ORDER BY c.confidence ASC NULLS FIRST, c.created_at ASC
   LIMIT LEAST(GREATEST(COALESCE(_limit, 50), 1), 200);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_review_verdict(
  _case_id uuid,
  _acuity text,
  _route_accepted boolean,
  _outcome_code text
)
RETURNS public.review_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.review_cases;
  n integer;
  distinct_acuity integer;
  adjudicating boolean;
  updated public.review_cases;
BEGIN
  IF NOT public.is_clinical_reviewer(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO c FROM public.review_cases WHERE id = _case_id FOR UPDATE;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'not found' USING ERRCODE = 'P0002';
  END IF;
  IF c.state = 'adjudicated' THEN
    RAISE EXCEPTION 'case already adjudicated' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.review_verdicts v
              WHERE v.case_id = c.id AND v.reviewer_id = auth.uid()) THEN
    RAISE EXCEPTION 'already reviewed by this reviewer' USING ERRCODE = '23505';
  END IF;

  adjudicating := (c.state = 'disagreement');

  INSERT INTO public.review_verdicts
    (case_id, reviewer_id, acuity, route_accepted, outcome_code, model_version, is_adjudication)
  VALUES (c.id, auth.uid(), _acuity, _route_accepted, _outcome_code, c.model_version, adjudicating);

  SELECT count(*), count(DISTINCT v.acuity) INTO n, distinct_acuity
    FROM public.review_verdicts v WHERE v.case_id = c.id;

  UPDATE public.review_cases r
     SET state = CASE
           WHEN adjudicating THEN 'adjudicated'
           WHEN n = 1 THEN 'single_reviewed'
           WHEN distinct_acuity = 1 THEN 'expert_reviewed'
           ELSE 'disagreement' END,
         label_quality = CASE
           WHEN adjudicating THEN 'adjudicated'
           WHEN n = 1 THEN 'single_reviewed'
           WHEN distinct_acuity = 1 THEN 'expert_reviewed'
           ELSE NULL END,
         final_acuity = CASE
           WHEN adjudicating THEN _acuity
           WHEN n = 1 THEN _acuity
           WHEN distinct_acuity = 1 THEN _acuity
           ELSE NULL END
   WHERE r.id = c.id
  RETURNING * INTO updated;

  RETURN updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_clinical_reviewer(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'pending',           count(*) FILTER (WHERE state = 'pending'),
    'single_reviewed',   count(*) FILTER (WHERE label_quality = 'single_reviewed'),
    'expert_reviewed',   count(*) FILTER (WHERE label_quality = 'expert_reviewed'),
    'adjudicated',       count(*) FILTER (WHERE label_quality = 'adjudicated'),
    'disagreement',      count(*) FILTER (WHERE state = 'disagreement'),
    'adjudicated_high',  count(*) FILTER (WHERE label_quality = 'adjudicated' AND final_acuity = 'high'),
    'second_reviewed',   count(*) FILTER (WHERE state IN ('expert_reviewed','disagreement','adjudicated')),
    'agreed',            count(*) FILTER (WHERE state IN ('expert_reviewed'))
  ) INTO result FROM public.review_cases;
  RETURN result;
END;
$$;

-- Least privilege: signed-in reviewers only; the functions check the role
-- themselves and anon has no reason to reach them.
REVOKE ALL ON FUNCTION public.is_clinical_reviewer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_queue(text, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_review_verdict(uuid, text, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_queue(text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review_verdict(uuid, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinical_reviewer(uuid) TO service_role;

-- Audit vocabulary: review actions are metadata only.
ALTER TABLE public.audit_log DROP CONSTRAINT audit_log_action_allowed;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_action_allowed CHECK (action = ANY (ARRAY[
  'sign_in','sign_out','password_complete','thread_open','thread_create','message_send',
  'encounter_request','encounter_accept','encounter_decline','encounter_end','encounter_cancel',
  'device_pair','device_sync_denied','admin_invite','admin_invite_revoke','admin_facility_create',
  'admin_device_register','admin_device_enrollment','admin_device_status',
  'modellab_decision','modellab_feedback','modellab_stage',
  'review_verdict','review_export'
]));
ALTER TABLE public.audit_log DROP CONSTRAINT audit_log_entity_allowed;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_entity_allowed CHECK (entity_type = ANY (ARRAY[
  'thread','message','encounter_request','device','device_enrollment','invite','facility',
  'profile','model','session','review_case'
]));