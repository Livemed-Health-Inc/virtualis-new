CREATE OR REPLACE FUNCTION public.pr_save_review(_item_id uuid, _status text, _acuity text, _needs_info boolean, _rationale text, _routes text[], _no_specialty boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  asg public.pr_assignments;
  it public.pr_items;
  locked uuid;
  existing public.pr_reviews;
  saved public.pr_reviews;
  is_adj boolean;
BEGIN
  IF NOT public.pr_is_physician(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF _status NOT IN ('draft','submitted') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
  END IF;

  -- Same lock ordering as pr_assign_reviewers / pr_assign_adjudicator:
  -- read the item, then take the outcome row lock, then decide anything.
  SELECT * INTO it FROM public.pr_items WHERE id = _item_id;
  IF it.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE = 'P0002'; END IF;

  SELECT o.item_id INTO locked FROM public.pr_outcomes o
   WHERE o.item_id = _item_id FOR UPDATE;
  IF locked IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE = 'P0002'; END IF;

  -- Authorization is evaluated only after the lock, so a concurrent
  -- reassignment or role change can never be acted on from a stale read.
  SELECT * INTO asg FROM public.pr_assignments
   WHERE item_id = _item_id AND reviewer_id = auth.uid();
  IF asg.id IS NULL THEN
    RAISE EXCEPTION 'not assigned to you' USING ERRCODE = '42501';
  END IF;
  IF it.facility_id IS NOT NULL AND NOT public.has_facility_access(auth.uid(), it.facility_id) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO existing FROM public.pr_reviews
   WHERE item_id = _item_id AND reviewer_id = auth.uid();
  IF existing.id IS NOT NULL AND existing.status = 'submitted' THEN
    RETURN to_jsonb(existing);
  END IF;

  is_adj := asg.role = 'adjudicator';

  INSERT INTO public.pr_reviews (item_id, reviewer_id, status, acuity, needs_info,
                                 rationale, routes, no_specialty_needed, is_adjudication,
                                 submitted_at)
  VALUES (_item_id, auth.uid(), _status,
          CASE WHEN _needs_info THEN NULL ELSE _acuity END,
          COALESCE(_needs_info,false), COALESCE(_rationale,''),
          COALESCE(_routes,'{}'::text[]), COALESCE(_no_specialty,false), is_adj,
          CASE WHEN _status = 'submitted' THEN now() END)
  ON CONFLICT (item_id, reviewer_id) DO UPDATE
     SET status = EXCLUDED.status, acuity = EXCLUDED.acuity,
         needs_info = EXCLUDED.needs_info, rationale = EXCLUDED.rationale,
         routes = EXCLUDED.routes, no_specialty_needed = EXCLUDED.no_specialty_needed,
         is_adjudication = EXCLUDED.is_adjudication,
         submitted_at = EXCLUDED.submitted_at
  RETURNING * INTO saved;

  IF _status = 'submitted' THEN
    PERFORM public.pr_recompute(_item_id);
    PERFORM public.pr_audit(
      CASE WHEN is_adj THEN 'pr_adjudicate' ELSE 'pr_review_submit' END,
      'pr_item', _item_id, it.facility_id);
  ELSE
    PERFORM public.pr_audit('pr_review_draft', 'pr_item', _item_id, it.facility_id);
  END IF;
  RETURN to_jsonb(saved);
END;
$function$;