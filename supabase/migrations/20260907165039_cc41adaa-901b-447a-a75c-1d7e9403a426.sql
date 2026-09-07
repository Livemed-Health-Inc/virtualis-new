CREATE OR REPLACE FUNCTION public.submit_review_verdict(_case_id uuid, _acuity text, _route_accepted boolean, _outcome_code text)
 RETURNS review_cases
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF c.state IN ('adjudicated', 'expert_reviewed') THEN
    RAISE EXCEPTION 'case already resolved' USING ERRCODE = '22023';
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
         -- Independence: never publish a label while the case is unresolved.
         final_acuity = CASE
           WHEN adjudicating THEN _acuity
           WHEN n > 1 AND distinct_acuity = 1 THEN _acuity
           ELSE NULL END
   WHERE r.id = c.id
  RETURNING * INTO updated;

  RETURN updated;
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_queue(_predicted text DEFAULT NULL::text, _use_case text DEFAULT NULL::text, _state text DEFAULT NULL::text, _limit integer DEFAULT 50)
 RETURNS SETOF review_cases
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
     -- Only cases genuinely awaiting a verdict.
     AND c.state NOT IN ('adjudicated', 'expert_reviewed')
     AND c.final_acuity IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.review_verdicts v
        WHERE v.case_id = c.id AND v.reviewer_id = auth.uid()
     )
   ORDER BY c.confidence ASC NULLS FIRST, c.created_at ASC
   LIMIT LEAST(GREATEST(COALESCE(_limit, 50), 1), 200);
END;
$function$;

DROP POLICY IF EXISTS "Reviewers read review cases" ON public.review_cases;

CREATE POLICY "Reviewers read judged or resolved cases"
ON public.review_cases
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'clinical_reviewer'::app_role)
    AND (
      state IN ('expert_reviewed', 'adjudicated')
      OR EXISTS (
        SELECT 1 FROM public.review_verdicts v
         WHERE v.case_id = review_cases.id AND v.reviewer_id = auth.uid()
      )
    )
  )
);

-- Repair any case that already carries an unresolved label.
UPDATE public.review_cases
   SET final_acuity = NULL
 WHERE state NOT IN ('expert_reviewed', 'adjudicated')
   AND final_acuity IS NOT NULL;