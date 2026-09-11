-- ── Physician Review workflow ─────────────────────────────────────────────
-- Extend the append-only audit vocabulary.
ALTER TABLE public.audit_log DROP CONSTRAINT audit_log_action_allowed;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_action_allowed CHECK (action = ANY (ARRAY[
  'sign_in','sign_out','password_complete','thread_open','thread_create','message_send',
  'encounter_request','encounter_accept','encounter_decline','encounter_end','encounter_cancel',
  'device_pair','device_sync_denied','admin_invite','admin_invite_revoke','admin_facility_create',
  'admin_device_register','admin_device_enrollment','admin_device_status',
  'modellab_decision','modellab_feedback','modellab_stage','review_verdict','review_export',
  'pr_import','pr_assign','pr_review_draft','pr_review_submit','pr_adjudicate',
  'pr_export_approve','pr_export']));
ALTER TABLE public.audit_log DROP CONSTRAINT audit_log_entity_allowed;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_entity_allowed CHECK (entity_type = ANY (ARRAY[
  'thread','message','encounter_request','device','device_enrollment','invite','facility',
  'profile','model','session','review_case','pr_batch','pr_item','pr_assignment']));

CREATE OR REPLACE FUNCTION public.pr_is_coordinator(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.pr_is_physician(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'clinical_reviewer') OR public.has_role(_uid, 'admin')
$$;

-- ── Tables ────────────────────────────────────────────────────────────────
CREATE TABLE public.pr_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  facility_id text REFERENCES public.facilities(id),
  mode text NOT NULL CHECK (mode IN ('clinical','practice')),
  imported_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pr_batches TO authenticated;
GRANT ALL ON public.pr_batches TO service_role;
ALTER TABLE public.pr_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coordinators read batches" ON public.pr_batches
  FOR SELECT TO authenticated USING (public.pr_is_coordinator(auth.uid()));

CREATE TABLE public.pr_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.pr_batches(id) ON DELETE CASCADE,
  record_id text NOT NULL CHECK (record_id ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  message text NOT NULL CHECK (length(message) BETWEEN 1 AND 4000),
  context text CHECK (context IS NULL OR length(context) <= 2000),
  group_key text NOT NULL CHECK (group_key ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  holdout boolean NOT NULL DEFAULT false,
  mode text NOT NULL CHECK (mode IN ('clinical','practice')),
  facility_id text REFERENCES public.facilities(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, record_id)
);
GRANT SELECT ON public.pr_items TO authenticated;
GRANT ALL ON public.pr_items TO service_role;
ALTER TABLE public.pr_items ENABLE ROW LEVEL SECURITY;
-- The reader policy is created after pr_assignments, which it references.

-- Imported per-row flags. Coordinator-only: never shown to a reviewer, and
-- imported labels/reviewer ids are deliberately not stored at all.
CREATE TABLE public.pr_item_flags (
  item_id uuid PRIMARY KEY REFERENCES public.pr_items(id) ON DELETE CASCADE,
  additional_context_needed boolean NOT NULL DEFAULT false,
  context_sufficient boolean NOT NULL DEFAULT false,
  deidentification_reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pr_item_flags TO authenticated;
GRANT ALL ON public.pr_item_flags TO service_role;
ALTER TABLE public.pr_item_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coordinators read import flags" ON public.pr_item_flags
  FOR SELECT TO authenticated USING (public.pr_is_coordinator(auth.uid()));

CREATE TABLE public.pr_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.pr_items(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('reviewer','adjudicator')),
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, reviewer_id)
);
GRANT SELECT ON public.pr_assignments TO authenticated;
GRANT ALL ON public.pr_assignments TO service_role;
ALTER TABLE public.pr_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own assignments" ON public.pr_assignments
  FOR SELECT TO authenticated
  USING (reviewer_id = auth.uid() OR public.pr_is_coordinator(auth.uid()));

-- No label column exists on pr_items by design, so an assigned reviewer's
-- read can never carry another reviewer's answer.
CREATE POLICY "Assigned physicians read their items" ON public.pr_items
  FOR SELECT TO authenticated USING (
    public.pr_is_coordinator(auth.uid())
    OR EXISTS (SELECT 1 FROM public.pr_assignments a
                WHERE a.item_id = pr_items.id AND a.reviewer_id = auth.uid())
  );

CREATE TABLE public.pr_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.pr_items(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted')),
  acuity text CHECK (acuity IS NULL OR acuity IN ('low','medium','high')),
  needs_info boolean NOT NULL DEFAULT false,
  rationale text NOT NULL DEFAULT '' CHECK (length(rationale) <= 1000),
  routes text[] NOT NULL DEFAULT '{}',
  no_specialty_needed boolean NOT NULL DEFAULT false,
  is_adjudication boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, reviewer_id),
  -- A submitted review is either a graded acuity or an explicit
  -- not-enough-information status with no acuity. Never both, never neither.
  CONSTRAINT pr_reviews_submitted_shape CHECK (
    status = 'draft' OR (
      length(btrim(rationale)) >= 10
      AND ((needs_info AND acuity IS NULL) OR (NOT needs_info AND acuity IS NOT NULL))
      AND NOT (no_specialty_needed AND array_length(routes, 1) > 0)
    )
  )
);
GRANT SELECT ON public.pr_reviews TO authenticated;
GRANT ALL ON public.pr_reviews TO service_role;
ALTER TABLE public.pr_reviews ENABLE ROW LEVEL SECURITY;
-- Own row only. A physician can never read another physician's answer.
CREATE POLICY "Own review only" ON public.pr_reviews
  FOR SELECT TO authenticated
  USING (reviewer_id = auth.uid() OR public.pr_is_coordinator(auth.uid()));
CREATE TRIGGER pr_reviews_updated_at BEFORE UPDATE ON public.pr_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pr_outcomes (
  item_id uuid PRIMARY KEY REFERENCES public.pr_items(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'unreviewed'
    CHECK (state IN ('unreviewed','in_review','needs_info','agreed','disagreement','adjudicated')),
  final_acuity text CHECK (final_acuity IS NULL OR final_acuity IN ('low','medium','high')),
  final_routes text[] NOT NULL DEFAULT '{}',
  routes_state text NOT NULL DEFAULT 'unreviewed'
    CHECK (routes_state IN ('unreviewed','agreed','disagreement','adjudicated')),
  label_quality text CHECK (label_quality IS NULL OR label_quality IN ('expert_reviewed','adjudicated')),
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pr_outcomes TO authenticated;
GRANT ALL ON public.pr_outcomes TO service_role;
ALTER TABLE public.pr_outcomes ENABLE ROW LEVEL SECURITY;
-- Visible only after this physician has recorded their own submitted review.
CREATE POLICY "Outcome after own submission" ON public.pr_outcomes
  FOR SELECT TO authenticated USING (
    public.pr_is_coordinator(auth.uid())
    OR EXISTS (SELECT 1 FROM public.pr_reviews r
                WHERE r.item_id = pr_outcomes.item_id
                  AND r.reviewer_id = auth.uid() AND r.status = 'submitted')
  );

CREATE TABLE public.pr_export_approvals (
  batch_id uuid PRIMARY KEY REFERENCES public.pr_batches(id) ON DELETE CASCADE,
  clinical_approved boolean NOT NULL DEFAULT false,
  privacy_reviewed boolean NOT NULL DEFAULT false,
  training_use_approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pr_export_approvals TO authenticated;
GRANT ALL ON public.pr_export_approvals TO service_role;
ALTER TABLE public.pr_export_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coordinators read export approvals" ON public.pr_export_approvals
  FOR SELECT TO authenticated USING (public.pr_is_coordinator(auth.uid()));

CREATE INDEX pr_items_batch_idx ON public.pr_items(batch_id);
CREATE INDEX pr_assignments_reviewer_idx ON public.pr_assignments(reviewer_id);
CREATE INDEX pr_reviews_item_idx ON public.pr_reviews(item_id);

-- ── Audit helper ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pr_audit(_action text, _entity text, _id uuid, _facility text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, facility_id)
  VALUES (auth.uid(), _action, _entity, _id, _facility);
$$;

-- ── Import ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pr_import_batch(
  _name text, _facility text, _mode text, _items jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b uuid;
  rec jsonb;
  new_item uuid;
BEGIN
  IF NOT public.pr_is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF _mode NOT IN ('clinical','practice') THEN
    RAISE EXCEPTION 'invalid mode' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0
     OR jsonb_array_length(_items) > 2000 THEN
    RAISE EXCEPTION 'between 1 and 2000 rows are required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.pr_batches (name, facility_id, mode, imported_by)
  VALUES (_name, _facility, _mode, auth.uid()) RETURNING id INTO b;

  FOR rec IN SELECT * FROM jsonb_array_elements(_items) LOOP
    INSERT INTO public.pr_items (batch_id, record_id, message, context, group_key, holdout, mode, facility_id)
    VALUES (
      b,
      rec->>'record_id',
      rec->>'message',
      NULLIF(rec->>'context',''),
      COALESCE(NULLIF(rec->>'group_key',''), rec->>'record_id'),
      COALESCE((rec->>'holdout')::boolean, false),
      _mode,
      _facility
    )
    ON CONFLICT (batch_id, record_id) DO NOTHING
    RETURNING id INTO new_item;

    IF new_item IS NOT NULL THEN
      -- Per-row flags are preserved exactly as imported; there is no blanket
      -- override, and no imported label or reviewer identity is stored.
      INSERT INTO public.pr_item_flags (item_id, additional_context_needed, context_sufficient, deidentification_reviewed)
      VALUES (
        new_item,
        COALESCE((rec->>'additional_context_needed')::boolean, false),
        COALESCE((rec->>'context_sufficient')::boolean, false),
        COALESCE((rec->>'deidentification_reviewed')::boolean, false)
      );
      INSERT INTO public.pr_outcomes (item_id) VALUES (new_item);
    END IF;
    new_item := NULL;
  END LOOP;

  PERFORM public.pr_audit('pr_import', 'pr_batch', b, _facility);
  RETURN b;
END;
$$;

-- ── Assignment ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pr_assign_reviewers(
  _item_ids uuid[], _a uuid, _b uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n integer := 0;
  it public.pr_items;
BEGIN
  IF NOT public.pr_is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF _a IS NULL OR _b IS NULL OR _a = _b THEN
    RAISE EXCEPTION 'two distinct physicians are required' USING ERRCODE = '22023';
  END IF;
  IF NOT (public.pr_is_physician(_a) AND public.pr_is_physician(_b)) THEN
    RAISE EXCEPTION 'both reviewers must be authorized clinical reviewers' USING ERRCODE = '42501';
  END IF;

  FOR it IN SELECT * FROM public.pr_items WHERE id = ANY(_item_ids) LOOP
    IF it.facility_id IS NOT NULL AND NOT (
         public.has_facility_access(_a, it.facility_id)
         AND public.has_facility_access(_b, it.facility_id)) THEN
      RAISE EXCEPTION 'reviewer lacks access to this facility' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.pr_assignments (item_id, reviewer_id, role, assigned_by)
    VALUES (it.id, _a, 'reviewer', auth.uid()), (it.id, _b, 'reviewer', auth.uid())
    ON CONFLICT (item_id, reviewer_id) DO NOTHING;
    PERFORM public.pr_audit('pr_assign', 'pr_assignment', it.id, it.facility_id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.pr_assign_adjudicator(_item_id uuid, _who uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it public.pr_items;
BEGIN
  IF NOT public.pr_is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT public.pr_is_physician(_who) THEN
    RAISE EXCEPTION 'adjudicator must be an authorized clinical reviewer' USING ERRCODE = '42501';
  END IF;
  -- A reviewer may never adjudicate their own case.
  IF EXISTS (SELECT 1 FROM public.pr_reviews r
              WHERE r.item_id = _item_id AND r.reviewer_id = _who) THEN
    RAISE EXCEPTION 'this physician already reviewed the case' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO it FROM public.pr_items WHERE id = _item_id;
  IF it.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE = 'P0002'; END IF;
  IF it.facility_id IS NOT NULL AND NOT public.has_facility_access(_who, it.facility_id) THEN
    RAISE EXCEPTION 'reviewer lacks access to this facility' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.pr_assignments (item_id, reviewer_id, role, assigned_by)
  VALUES (_item_id, _who, 'adjudicator', auth.uid())
  ON CONFLICT (item_id, reviewer_id) DO UPDATE SET role = 'adjudicator';
  PERFORM public.pr_audit('pr_assign', 'pr_assignment', _item_id, it.facility_id);
END;
$$;

-- ── Blinded physician queue ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pr_my_queue(_include_done boolean DEFAULT false)
RETURNS TABLE (
  item_id uuid, record_id text, message text, context text, mode text,
  facility_id text, batch_name text, assignment_role text,
  my_status text, my_acuity text, my_needs_info boolean, my_rationale text,
  my_routes text[], my_no_specialty_needed boolean, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.pr_is_physician(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT i.id, i.record_id, i.message, i.context, i.mode, i.facility_id, b.name,
         a.role, COALESCE(r.status,'none'), r.acuity, COALESCE(r.needs_info,false),
         COALESCE(r.rationale,''), COALESCE(r.routes,'{}'::text[]),
         COALESCE(r.no_specialty_needed,false), COALESCE(r.updated_at, i.created_at)
    FROM public.pr_assignments a
    JOIN public.pr_items i ON i.id = a.item_id
    JOIN public.pr_batches b ON b.id = i.batch_id
    LEFT JOIN public.pr_reviews r ON r.item_id = i.id AND r.reviewer_id = auth.uid()
   WHERE a.reviewer_id = auth.uid()
     AND (_include_done OR r.status IS DISTINCT FROM 'submitted')
   ORDER BY i.created_at ASC;
END;
$$;

-- ── Resolution ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pr_recompute(_item_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  adj public.pr_reviews;
  a public.pr_reviews;
  b public.pr_reviews;
  n integer;
  st text; fin text; lq text; rts text[]; rst text;
BEGIN
  SELECT * INTO adj FROM public.pr_reviews
   WHERE item_id = _item_id AND status = 'submitted' AND is_adjudication
   ORDER BY submitted_at ASC LIMIT 1;

  IF adj.id IS NOT NULL THEN
    st := 'adjudicated'; lq := 'adjudicated'; fin := adj.acuity;
    rts := adj.routes; rst := 'adjudicated';
    IF adj.needs_info THEN st := 'needs_info'; lq := NULL; fin := NULL; rst := 'unreviewed'; END IF;
  ELSE
    SELECT count(*) INTO n FROM public.pr_reviews
     WHERE item_id = _item_id AND status = 'submitted' AND NOT is_adjudication;
    IF n = 0 THEN
      st := 'unreviewed';
    ELSIF n = 1 THEN
      st := 'in_review';
    ELSE
      SELECT * INTO a FROM public.pr_reviews
       WHERE item_id = _item_id AND status = 'submitted' AND NOT is_adjudication
       ORDER BY submitted_at ASC LIMIT 1;
      SELECT * INTO b FROM public.pr_reviews
       WHERE item_id = _item_id AND status = 'submitted' AND NOT is_adjudication
       ORDER BY submitted_at ASC OFFSET 1 LIMIT 1;
      IF a.needs_info AND b.needs_info THEN
        -- Not enough information never produces an approved label.
        st := 'needs_info';
      ELSIF a.needs_info <> b.needs_info OR a.acuity IS DISTINCT FROM b.acuity THEN
        st := 'disagreement';
      ELSE
        st := 'agreed'; lq := 'expert_reviewed'; fin := a.acuity;
        IF a.no_specialty_needed AND b.no_specialty_needed THEN
          rst := 'agreed'; rts := '{}';
        ELSIF NOT a.no_specialty_needed AND NOT b.no_specialty_needed
              AND array_length(a.routes,1) IS NOT DISTINCT FROM array_length(b.routes,1)
              AND a.routes <@ b.routes AND b.routes <@ a.routes THEN
          rst := CASE WHEN array_length(a.routes,1) IS NULL THEN 'unreviewed' ELSE 'agreed' END;
          rts := a.routes;
        ELSE
          rst := 'disagreement';
        END IF;
      END IF;
    END IF;
  END IF;

  UPDATE public.pr_outcomes
     SET state = st,
         final_acuity = fin,
         label_quality = lq,
         final_routes = COALESCE(rts,'{}'::text[]),
         routes_state = COALESCE(rst,'unreviewed'),
         resolved_at = CASE WHEN st IN ('agreed','adjudicated','needs_info') THEN now() ELSE NULL END,
         updated_at = now()
   WHERE item_id = _item_id;
END;
$$;

-- ── Draft / submit ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pr_save_review(
  _item_id uuid, _status text, _acuity text, _needs_info boolean,
  _rationale text, _routes text[], _no_specialty boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  asg public.pr_assignments;
  it public.pr_items;
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
  SELECT * INTO asg FROM public.pr_assignments
   WHERE item_id = _item_id AND reviewer_id = auth.uid();
  IF asg.id IS NULL THEN
    RAISE EXCEPTION 'not assigned to you' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO it FROM public.pr_items WHERE id = _item_id;
  IF it.facility_id IS NOT NULL AND NOT public.has_facility_access(auth.uid(), it.facility_id) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- Serialize concurrent submissions on the same case.
  PERFORM 1 FROM public.pr_outcomes WHERE item_id = _item_id FOR UPDATE;

  SELECT * INTO existing FROM public.pr_reviews
   WHERE item_id = _item_id AND reviewer_id = auth.uid();
  IF existing.id IS NOT NULL AND existing.status = 'submitted' THEN
    -- Idempotent: a duplicate submission changes nothing and is not an error.
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
$$;

-- ── Coordinator views ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pr_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.pr_is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'clinical', (SELECT jsonb_build_object(
        'total', count(*),
        'unreviewed', count(*) FILTER (WHERE o.state = 'unreviewed'),
        'in_review', count(*) FILTER (WHERE o.state = 'in_review'),
        'agreed', count(*) FILTER (WHERE o.state = 'agreed'),
        'disagreement', count(*) FILTER (WHERE o.state = 'disagreement'),
        'needs_info', count(*) FILTER (WHERE o.state = 'needs_info'),
        'adjudicated', count(*) FILTER (WHERE o.state = 'adjudicated'),
        'route_disagreement', count(*) FILTER (WHERE o.routes_state = 'disagreement'),
        'exportable', count(*) FILTER (WHERE o.label_quality IS NOT NULL))
      FROM public.pr_outcomes o JOIN public.pr_items i ON i.id = o.item_id
      WHERE i.mode = 'clinical'),
    'practice', (SELECT jsonb_build_object(
        'total', count(*),
        'resolved', count(*) FILTER (WHERE o.label_quality IS NOT NULL))
      FROM public.pr_outcomes o JOIN public.pr_items i ON i.id = o.item_id
      WHERE i.mode = 'practice'),
    'assignments', (SELECT count(*) FROM public.pr_assignments)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.pr_list_items(_batch uuid DEFAULT NULL, _state text DEFAULT NULL, _limit integer DEFAULT 200)
RETURNS TABLE (
  item_id uuid, batch_id uuid, batch_name text, mode text, facility_id text,
  record_id text, message text, group_key text, holdout boolean,
  state text, final_acuity text, routes_state text, label_quality text,
  reviewers uuid[], submitted integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.pr_is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT i.id, i.batch_id, b.name, i.mode, i.facility_id, i.record_id, i.message,
         i.group_key, i.holdout, o.state, o.final_acuity, o.routes_state, o.label_quality,
         COALESCE(ARRAY(SELECT a.reviewer_id FROM public.pr_assignments a WHERE a.item_id = i.id), '{}'::uuid[]),
         (SELECT count(*)::int FROM public.pr_reviews r WHERE r.item_id = i.id AND r.status = 'submitted')
    FROM public.pr_items i
    JOIN public.pr_batches b ON b.id = i.batch_id
    JOIN public.pr_outcomes o ON o.item_id = i.id
   WHERE (_batch IS NULL OR i.batch_id = _batch)
     AND (_state IS NULL OR o.state = _state)
   ORDER BY i.created_at ASC
   LIMIT LEAST(GREATEST(COALESCE(_limit,200),1), 1000);
END;
$$;

-- ── Export ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pr_set_export_approval(
  _batch uuid, _clinical boolean, _privacy boolean, _training boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.pr_is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.pr_export_approvals (batch_id, clinical_approved, privacy_reviewed, training_use_approved, approved_by, updated_at)
  VALUES (_batch, COALESCE(_clinical,false), COALESCE(_privacy,false), COALESCE(_training,false), auth.uid(), now())
  ON CONFLICT (batch_id) DO UPDATE
     SET clinical_approved = EXCLUDED.clinical_approved,
         privacy_reviewed = EXCLUDED.privacy_reviewed,
         training_use_approved = EXCLUDED.training_use_approved,
         approved_by = auth.uid(), updated_at = now();
  PERFORM public.pr_audit('pr_export_approve', 'pr_batch', _batch, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.pr_export_batch(_batch uuid)
RETURNS TABLE (record_id text, text_value text, acuity text, routes text[],
               group_id text, split text, label_quality text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ap public.pr_export_approvals; bt public.pr_batches;
BEGIN
  IF NOT public.pr_is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO bt FROM public.pr_batches WHERE id = _batch;
  IF bt.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE = 'P0002'; END IF;
  IF bt.mode <> 'clinical' THEN
    RAISE EXCEPTION 'practice data is never exported' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO ap FROM public.pr_export_approvals WHERE batch_id = _batch;
  IF ap.batch_id IS NULL OR NOT (ap.clinical_approved AND ap.privacy_reviewed AND ap.training_use_approved) THEN
    RAISE EXCEPTION 'clinical approval, privacy review and training-use approval are all required'
      USING ERRCODE = '42501';
  END IF;
  PERFORM public.pr_audit('pr_export', 'pr_batch', _batch, bt.facility_id);
  RETURN QUERY
  SELECT i.record_id, i.message, o.final_acuity, o.final_routes, i.group_key,
         CASE WHEN i.holdout THEN 'test' ELSE 'train' END, o.label_quality
    FROM public.pr_items i JOIN public.pr_outcomes o ON o.item_id = i.id
   WHERE i.batch_id = _batch
     AND i.mode = 'clinical'
     AND o.label_quality IS NOT NULL
     AND o.final_acuity IS NOT NULL
     AND o.state <> 'needs_info'
   ORDER BY i.group_key, i.record_id;
END;
$$;

REVOKE ALL ON FUNCTION public.pr_audit(text, text, uuid, text) FROM public, anon, authenticated;
