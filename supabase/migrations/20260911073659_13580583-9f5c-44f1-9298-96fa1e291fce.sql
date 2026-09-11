-- ═══ Physician Review: release-blocker corrections ════════════════════════

/* ── 1. Lineage, split and per-row training-use attestation ─────────────── */
ALTER TABLE public.pr_items
  ADD COLUMN IF NOT EXISTS patient_group   text,
  ADD COLUMN IF NOT EXISTS encounter_group text,
  ADD COLUMN IF NOT EXISTS template_group  text,
  ADD COLUMN IF NOT EXISTS split           text NOT NULL DEFAULT 'unassigned';

UPDATE public.pr_items SET split = 'test' WHERE holdout AND split = 'unassigned';

ALTER TABLE public.pr_items DROP CONSTRAINT IF EXISTS pr_items_split_chk;
ALTER TABLE public.pr_items ADD CONSTRAINT pr_items_split_chk
  CHECK (split IN ('train','validation','test','unassigned'));

/* Training use is a coordinator attestation recorded per row. It is stored
   apart from the imported privacy flag so a blanket action can never turn an
   imported false into a true. */
ALTER TABLE public.pr_item_flags
  ADD COLUMN IF NOT EXISTS training_use_approved    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS training_use_approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS training_use_approved_at timestamptz;

/* ── 2. Scope helpers ───────────────────────────────────────────────────── */
CREATE OR REPLACE FUNCTION public.pr_item_facility(_item uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT facility_id FROM public.pr_items WHERE id = _item $$;

CREATE OR REPLACE FUNCTION public.pr_batch_facility(_batch uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT facility_id FROM public.pr_batches WHERE id = _batch $$;

/* Coordinators are scoped to the facilities they currently hold access to.
   Facility-less batches stay visible to any coordinator. */
CREATE OR REPLACE FUNCTION public.pr_coord_scope(_uid uuid, _facility text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.pr_is_coordinator(_uid)
     AND (_facility IS NULL OR public.has_facility_access(_uid, _facility));
$$;

/* A physician reaches a case only while assigned AND currently credentialed at
   its facility: revoking the credential closes every read path at once. */
CREATE OR REPLACE FUNCTION public.pr_reviewer_scope(_uid uuid, _item uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pr_assignments a
      JOIN public.pr_items i ON i.id = a.item_id
     WHERE a.item_id = _item AND a.reviewer_id = _uid
       AND (i.facility_id IS NULL OR public.has_facility_access(_uid, i.facility_id))
  );
$$;

/* A coordinator who still owes an independent review on a case must not see
   anyone else's answer for it — through any function or table. */
CREATE OR REPLACE FUNCTION public.pr_is_conflicted(_uid uuid, _item uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.pr_assignments a
                  WHERE a.item_id = _item AND a.reviewer_id = _uid)
     AND NOT EXISTS (SELECT 1 FROM public.pr_reviews r
                      WHERE r.item_id = _item AND r.reviewer_id = _uid
                        AND r.status = 'submitted');
$$;

/* ── 3. Row-level security rewritten around those scopes ────────────────── */
DROP POLICY IF EXISTS "Assigned physicians read their items" ON public.pr_items;
CREATE POLICY "Scoped item reads" ON public.pr_items FOR SELECT TO authenticated
USING (public.pr_reviewer_scope(auth.uid(), id) OR public.pr_coord_scope(auth.uid(), facility_id));

DROP POLICY IF EXISTS "Outcome after own submission" ON public.pr_outcomes;
CREATE POLICY "Outcome after own submission" ON public.pr_outcomes FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.pr_reviews r
           WHERE r.item_id = pr_outcomes.item_id AND r.reviewer_id = auth.uid()
             AND r.status = 'submitted')
  OR (public.pr_coord_scope(auth.uid(), public.pr_item_facility(item_id))
      AND NOT public.pr_is_conflicted(auth.uid(), item_id))
);

DROP POLICY IF EXISTS "Own review only" ON public.pr_reviews;
CREATE POLICY "Own review only" ON public.pr_reviews FOR SELECT TO authenticated
USING (
  reviewer_id = auth.uid()
  OR (public.pr_coord_scope(auth.uid(), public.pr_item_facility(item_id))
      AND NOT public.pr_is_conflicted(auth.uid(), item_id))
);

DROP POLICY IF EXISTS "Own assignments" ON public.pr_assignments;
CREATE POLICY "Own assignments" ON public.pr_assignments FOR SELECT TO authenticated
USING (
  reviewer_id = auth.uid()
  OR public.pr_coord_scope(auth.uid(), public.pr_item_facility(item_id))
);

DROP POLICY IF EXISTS "Coordinators read batches" ON public.pr_batches;
CREATE POLICY "Coordinators read batches" ON public.pr_batches FOR SELECT TO authenticated
USING (public.pr_coord_scope(auth.uid(), facility_id));

DROP POLICY IF EXISTS "Coordinators read import flags" ON public.pr_item_flags;
CREATE POLICY "Coordinators read import flags" ON public.pr_item_flags FOR SELECT TO authenticated
USING (public.pr_coord_scope(auth.uid(), public.pr_item_facility(item_id)));

DROP POLICY IF EXISTS "Coordinators read export approvals" ON public.pr_export_approvals;
CREATE POLICY "Coordinators read export approvals" ON public.pr_export_approvals FOR SELECT TO authenticated
USING (public.pr_coord_scope(auth.uid(), public.pr_batch_facility(batch_id)));

/* ── 4. Structural cap on assignments ───────────────────────────────────── */
CREATE OR REPLACE FUNCTION public.pr_assignment_cap()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
DECLARE n integer;
BEGIN
  IF NEW.role = 'reviewer' THEN
    SELECT count(*) INTO n FROM public.pr_assignments a
     WHERE a.item_id = NEW.item_id AND a.role = 'reviewer' AND a.reviewer_id <> NEW.reviewer_id;
    IF n >= 2 THEN
      RAISE EXCEPTION 'this case already has two independent reviewers' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.role = 'adjudicator' THEN
    SELECT count(*) INTO n FROM public.pr_assignments a
     WHERE a.item_id = NEW.item_id AND a.role = 'adjudicator' AND a.reviewer_id <> NEW.reviewer_id;
    IF n >= 1 THEN
      RAISE EXCEPTION 'this case already has an adjudicator' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pr_assignment_cap ON public.pr_assignments;
CREATE TRIGGER pr_assignment_cap BEFORE INSERT OR UPDATE ON public.pr_assignments
FOR EACH ROW EXECUTE FUNCTION public.pr_assignment_cap();

/* ── 5. Import: atomic, lineage-preserving, no silent drops ─────────────── */
CREATE OR REPLACE FUNCTION public.pr_import_batch(_name text, _facility text, _mode text, _items jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE b uuid; n integer;
BEGIN
  IF NOT public.pr_coord_scope(auth.uid(), _facility) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF _mode NOT IN ('clinical','practice') THEN
    RAISE EXCEPTION 'invalid mode' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0
     OR jsonb_array_length(_items) > 2000 THEN
    RAISE EXCEPTION 'between 1 and 2000 rows are required' USING ERRCODE = '22023';
  END IF;

  -- A repeated record is refused outright; nothing is silently dropped.
  SELECT count(DISTINCT e->>'record_id') INTO n FROM jsonb_array_elements(_items) e;
  IF n <> jsonb_array_length(_items) THEN
    RAISE EXCEPTION 'duplicate record_id in this file' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(_items) e
              WHERE COALESCE(e->>'split','unassigned')
                    NOT IN ('train','validation','test','unassigned')) THEN
    RAISE EXCEPTION 'split must be train, validation, test or unassigned' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.pr_batches (name, facility_id, mode, imported_by)
  VALUES (_name, _facility, _mode, auth.uid()) RETURNING id INTO b;

  WITH src AS (
    SELECT e,
           e->>'record_id' AS record_id,
           /* An unknown split stays unassigned: it never silently becomes
              training data. */
           COALESCE(NULLIF(e->>'split',''),
                    CASE WHEN COALESCE((e->>'holdout')::boolean,false) THEN 'test'
                         ELSE 'unassigned' END) AS split
      FROM jsonb_array_elements(_items) e
  ), ins AS (
    INSERT INTO public.pr_items
      (batch_id, record_id, message, context, group_key, patient_group,
       encounter_group, template_group, split, holdout, mode, facility_id)
    SELECT b, src.record_id, src.e->>'message', NULLIF(src.e->>'context',''),
           COALESCE(NULLIF(src.e->>'group_key',''), src.record_id),
           NULLIF(src.e->>'patient_group',''),
           NULLIF(src.e->>'encounter_group',''),
           NULLIF(src.e->>'template_group',''),
           src.split, src.split = 'test', _mode, _facility
      FROM src
    RETURNING id, record_id
  ), flags AS (
    /* Per-row flags are stored exactly as imported. */
    INSERT INTO public.pr_item_flags
      (item_id, additional_context_needed, context_sufficient, deidentification_reviewed)
    SELECT ins.id,
           COALESCE((src.e->>'additional_context_needed')::boolean,false),
           COALESCE((src.e->>'context_sufficient')::boolean,false),
           COALESCE((src.e->>'deidentification_reviewed')::boolean,false)
      FROM ins JOIN src ON src.record_id = ins.record_id
    RETURNING item_id
  )
  INSERT INTO public.pr_outcomes (item_id) SELECT id FROM ins;

  PERFORM public.pr_audit('pr_import', 'pr_batch', b, _facility);
  RETURN b;
END;
$$;

/* ── 6. Per-row training-use attestation ────────────────────────────────── */
CREATE OR REPLACE FUNCTION public.pr_set_item_training_use(_item_ids uuid[], _approved boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE n integer := 0; it public.pr_items;
BEGIN
  IF _item_ids IS NULL OR array_length(_item_ids,1) IS NULL THEN
    RAISE EXCEPTION 'name the rows explicitly' USING ERRCODE = '22023';
  END IF;
  FOR it IN SELECT * FROM public.pr_items WHERE id = ANY(_item_ids) ORDER BY id LOOP
    IF NOT public.pr_coord_scope(auth.uid(), it.facility_id) THEN
      RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
    END IF;
    /* Only the coordinator's own attestation is written; the imported privacy
       flag is never touched here. */
    UPDATE public.pr_item_flags
       SET training_use_approved = COALESCE(_approved,false),
           training_use_approved_by = CASE WHEN _approved THEN auth.uid() END,
           training_use_approved_at = CASE WHEN _approved THEN now() END
     WHERE item_id = it.id;
    PERFORM public.pr_audit('pr_export_approve', 'pr_item', it.id, it.facility_id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

/* ── 7. Assignment: two reviewers maximum, serialized on the case ───────── */
CREATE OR REPLACE FUNCTION public.pr_assign_reviewers(_item_ids uuid[], _a uuid, _b uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE n integer := 0; it public.pr_items;
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

  FOR it IN SELECT * FROM public.pr_items WHERE id = ANY(_item_ids) ORDER BY id LOOP
    IF NOT public.pr_coord_scope(auth.uid(), it.facility_id) THEN
      RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
    END IF;
    /* Same lock a submission takes, so reassignment and adjudication
       eligibility can never interleave with a verdict. */
    PERFORM 1 FROM public.pr_outcomes WHERE item_id = it.id FOR UPDATE;

    IF it.facility_id IS NOT NULL AND NOT (
         public.has_facility_access(_a, it.facility_id)
         AND public.has_facility_access(_b, it.facility_id)) THEN
      RAISE EXCEPTION 'reviewer lacks access to this facility' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (SELECT 1 FROM public.pr_assignments a
                WHERE a.item_id = it.id AND a.role = 'adjudicator'
                  AND a.reviewer_id IN (_a,_b)) THEN
      RAISE EXCEPTION 'this physician is the adjudicator on the case' USING ERRCODE = '42501';
    END IF;

    -- A reviewer who has already answered is never replaced.
    IF EXISTS (SELECT 1 FROM public.pr_assignments a
                JOIN public.pr_reviews r
                  ON r.item_id = a.item_id AND r.reviewer_id = a.reviewer_id
                 AND r.status = 'submitted'
               WHERE a.item_id = it.id AND a.role = 'reviewer'
                 AND a.reviewer_id NOT IN (_a,_b)) THEN
      RAISE EXCEPTION 'a reviewer has already answered this case and cannot be replaced'
        USING ERRCODE = '42501';
    END IF;

    -- Any other reviewer who has not answered is stood down, so the case never
    -- accumulates a third independent reviewer.
    DELETE FROM public.pr_reviews r
     WHERE r.item_id = it.id AND r.status = 'draft' AND r.reviewer_id NOT IN (_a,_b)
       AND EXISTS (SELECT 1 FROM public.pr_assignments a
                    WHERE a.item_id = it.id AND a.reviewer_id = r.reviewer_id
                      AND a.role = 'reviewer');
    DELETE FROM public.pr_assignments a
     WHERE a.item_id = it.id AND a.role = 'reviewer' AND a.reviewer_id NOT IN (_a,_b);

    INSERT INTO public.pr_assignments (item_id, reviewer_id, role, assigned_by)
    VALUES (it.id, _a, 'reviewer', auth.uid()), (it.id, _b, 'reviewer', auth.uid())
    ON CONFLICT (item_id, reviewer_id) DO UPDATE SET role = 'reviewer';

    PERFORM public.pr_recompute(it.id);
    PERFORM public.pr_audit('pr_assign', 'pr_assignment', it.id, it.facility_id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.pr_assign_adjudicator(_item_id uuid, _who uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE it public.pr_items;
BEGIN
  IF NOT public.pr_is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT public.pr_is_physician(_who) THEN
    RAISE EXCEPTION 'adjudicator must be an authorized clinical reviewer' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO it FROM public.pr_items WHERE id = _item_id;
  IF it.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE = 'P0002'; END IF;
  IF NOT public.pr_coord_scope(auth.uid(), it.facility_id) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- Eligibility is decided under the submission lock, not before it.
  PERFORM 1 FROM public.pr_outcomes WHERE item_id = _item_id FOR UPDATE;

  IF EXISTS (SELECT 1 FROM public.pr_reviews r
              WHERE r.item_id = _item_id AND r.reviewer_id = _who) THEN
    RAISE EXCEPTION 'this physician already reviewed the case' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.pr_assignments a
              WHERE a.item_id = _item_id AND a.reviewer_id = _who AND a.role = 'reviewer') THEN
    RAISE EXCEPTION 'this physician is already a reviewer on the case' USING ERRCODE = '42501';
  END IF;
  IF it.facility_id IS NOT NULL AND NOT public.has_facility_access(_who, it.facility_id) THEN
    RAISE EXCEPTION 'reviewer lacks access to this facility' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.pr_assignments (item_id, reviewer_id, role, assigned_by)
  VALUES (_item_id, _who, 'adjudicator', auth.uid())
  ON CONFLICT (item_id, reviewer_id) DO UPDATE SET role = 'adjudicator';
  PERFORM public.pr_audit('pr_assign', 'pr_assignment', _item_id, it.facility_id);
END;
$$;

/* ── 8. Queue: current facility access rechecked on every read ──────────── */
CREATE OR REPLACE FUNCTION public.pr_my_queue(_include_done boolean DEFAULT false)
RETURNS TABLE(item_id uuid, record_id text, message text, context text, mode text,
              facility_id text, batch_name text, assignment_role text, my_status text,
              my_acuity text, my_needs_info boolean, my_rationale text, my_routes text[],
              my_no_specialty_needed boolean, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
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
     -- Access is re-evaluated now, not at assignment time.
     AND (i.facility_id IS NULL OR public.has_facility_access(auth.uid(), i.facility_id))
     AND (_include_done OR r.status IS DISTINCT FROM 'submitted')
   ORDER BY i.created_at ASC;
END;
$$;

/* ── 9. Coordinator listing: scoped, and blinded on own open cases ──────── */
DROP FUNCTION IF EXISTS public.pr_list_items(uuid, text, integer);
CREATE FUNCTION public.pr_list_items(_batch uuid DEFAULT NULL, _state text DEFAULT NULL,
                                     _limit integer DEFAULT 200)
RETURNS TABLE(item_id uuid, batch_id uuid, batch_name text, mode text, facility_id text,
              record_id text, message text, group_key text, patient_group text,
              encounter_group text, template_group text, split text, state text,
              final_acuity text, routes_state text, label_quality text, reviewers uuid[],
              submitted integer, blinded boolean, privacy_reviewed boolean,
              training_use_approved boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.pr_is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT i.id, i.batch_id, b.name, i.mode, i.facility_id, i.record_id, i.message,
         i.group_key, i.patient_group, i.encounter_group, i.template_group, i.split,
         /* A coordinator who still owes a review on this case sees no outcome
            at all for it. */
         CASE WHEN c.conflicted THEN 'blinded' ELSE o.state END,
         CASE WHEN c.conflicted THEN NULL ELSE o.final_acuity END,
         CASE WHEN c.conflicted THEN 'blinded' ELSE o.routes_state END,
         CASE WHEN c.conflicted THEN NULL ELSE o.label_quality END,
         COALESCE(ARRAY(SELECT a.reviewer_id FROM public.pr_assignments a WHERE a.item_id = i.id), '{}'::uuid[]),
         CASE WHEN c.conflicted THEN NULL
              ELSE (SELECT count(*)::int FROM public.pr_reviews r
                     WHERE r.item_id = i.id AND r.status = 'submitted') END,
         c.conflicted, f.deidentification_reviewed, f.training_use_approved
    FROM public.pr_items i
    JOIN public.pr_batches b ON b.id = i.batch_id
    JOIN public.pr_outcomes o ON o.item_id = i.id
    LEFT JOIN public.pr_item_flags f ON f.item_id = i.id
    CROSS JOIN LATERAL (SELECT public.pr_is_conflicted(auth.uid(), i.id) AS conflicted) c
   WHERE public.pr_coord_scope(auth.uid(), i.facility_id)
     AND (_batch IS NULL OR i.batch_id = _batch)
     AND (_state IS NULL OR (NOT c.conflicted AND o.state = _state))
   ORDER BY i.created_at ASC
   LIMIT LEAST(GREATEST(COALESCE(_limit,200),1), 1000);
END;
$$;

CREATE OR REPLACE FUNCTION public.pr_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.pr_is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  WITH visible AS (
    SELECT o.*, i.mode
      FROM public.pr_outcomes o JOIN public.pr_items i ON i.id = o.item_id
     WHERE public.pr_coord_scope(auth.uid(), i.facility_id)
       -- Own open cases are counted separately, never by outcome.
       AND NOT public.pr_is_conflicted(auth.uid(), i.id)
  ), blinded AS (
    SELECT count(*) AS n FROM public.pr_items i
     WHERE public.pr_coord_scope(auth.uid(), i.facility_id)
       AND public.pr_is_conflicted(auth.uid(), i.id)
  )
  SELECT jsonb_build_object(
    'clinical', (SELECT jsonb_build_object(
        'total', count(*),
        'unreviewed', count(*) FILTER (WHERE state = 'unreviewed'),
        'in_review', count(*) FILTER (WHERE state = 'in_review'),
        'agreed', count(*) FILTER (WHERE state = 'agreed'),
        'disagreement', count(*) FILTER (WHERE state = 'disagreement'),
        'needs_info', count(*) FILTER (WHERE state = 'needs_info'),
        'adjudicated', count(*) FILTER (WHERE state = 'adjudicated'),
        'route_disagreement', count(*) FILTER (WHERE routes_state = 'disagreement'),
        'exportable', count(*) FILTER (WHERE label_quality IS NOT NULL))
      FROM visible WHERE mode = 'clinical'),
    'practice', (SELECT jsonb_build_object(
        'total', count(*),
        'resolved', count(*) FILTER (WHERE label_quality IS NOT NULL))
      FROM visible WHERE mode = 'practice'),
    'blinded', (SELECT n FROM blinded),
    'assignments', (SELECT count(*) FROM public.pr_assignments a
                     WHERE public.pr_coord_scope(auth.uid(), public.pr_item_facility(a.item_id)))
  ) INTO result;
  RETURN result;
END;
$$;

/* ── 10. Adjudication never invents a route decision ────────────────────── */
CREATE OR REPLACE FUNCTION public.pr_recompute(_item_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  adj public.pr_reviews; a public.pr_reviews; b public.pr_reviews;
  n integer; st text; fin text; lq text; rts text[]; rst text;
BEGIN
  SELECT * INTO adj FROM public.pr_reviews
   WHERE item_id = _item_id AND status = 'submitted' AND is_adjudication
   ORDER BY submitted_at ASC LIMIT 1;

  IF adj.id IS NOT NULL THEN
    st := 'adjudicated'; lq := 'adjudicated'; fin := adj.acuity;
    IF adj.needs_info THEN
      st := 'needs_info'; lq := NULL; fin := NULL; rst := 'unreviewed'; rts := '{}';
    ELSIF adj.no_specialty_needed THEN
      rst := 'adjudicated'; rts := '{}';
    ELSIF array_length(adj.routes,1) IS NOT NULL THEN
      rst := 'adjudicated'; rts := adj.routes;
    ELSE
      /* No routes and no explicit "no specialty needed": the route question
         was never answered, and adjudication must not pretend otherwise. */
      rst := 'unreviewed'; rts := '{}';
    END IF;
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
     SET state = st, final_acuity = fin, label_quality = lq,
         final_routes = COALESCE(rts,'{}'::text[]),
         routes_state = COALESCE(rst,'unreviewed'),
         resolved_at = CASE WHEN st IN ('agreed','adjudicated','needs_info') THEN now() ELSE NULL END,
         updated_at = now()
   WHERE item_id = _item_id;
END;
$$;

/* ── 11. Export: per-row privacy AND training-use, lineage preserved ────── */
DROP FUNCTION IF EXISTS public.pr_export_batch(uuid);
CREATE FUNCTION public.pr_export_batch(_batch uuid)
RETURNS TABLE(record_id text, text_value text, acuity text, routes text[],
              routes_state text, no_specialty_needed boolean, group_id text,
              patient_group text, encounter_group text, template_group text,
              split text, label_quality text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE ap public.pr_export_approvals; bt public.pr_batches;
BEGIN
  SELECT * INTO bt FROM public.pr_batches WHERE id = _batch;
  IF bt.id IS NULL THEN RAISE EXCEPTION 'not found' USING ERRCODE = 'P0002'; END IF;
  IF NOT public.pr_coord_scope(auth.uid(), bt.facility_id) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF bt.mode <> 'clinical' THEN
    RAISE EXCEPTION 'practice data is never exported' USING ERRCODE = '42501';
  END IF;
  -- An exporter who still owes a review on any case in the batch is refused.
  IF EXISTS (SELECT 1 FROM public.pr_items i
              WHERE i.batch_id = _batch AND public.pr_is_conflicted(auth.uid(), i.id)) THEN
    RAISE EXCEPTION 'you still owe a review on a case in this batch' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO ap FROM public.pr_export_approvals WHERE batch_id = _batch;
  IF ap.batch_id IS NULL OR NOT (ap.clinical_approved AND ap.privacy_reviewed AND ap.training_use_approved) THEN
    RAISE EXCEPTION 'clinical approval, privacy review and training-use approval are all required'
      USING ERRCODE = '42501';
  END IF;

  PERFORM public.pr_audit('pr_export', 'pr_batch', _batch, bt.facility_id);
  RETURN QUERY
  SELECT i.record_id, i.message, o.final_acuity, o.final_routes,
         o.routes_state,
         /* "No specialty needed" only when the route question was actually
            answered; an unreviewed route never reads as a decision. */
         (o.routes_state IN ('agreed','adjudicated')
          AND COALESCE(array_length(o.final_routes,1),0) = 0),
         i.group_key, i.patient_group, i.encounter_group, i.template_group,
         i.split, o.label_quality
    FROM public.pr_items i
    JOIN public.pr_outcomes o ON o.item_id = i.id
    /* Per-row gates: an unknown or false flag is never exported. */
    JOIN public.pr_item_flags f ON f.item_id = i.id
   WHERE i.batch_id = _batch
     AND i.mode = 'clinical'
     AND f.deidentification_reviewed
     AND f.training_use_approved
     AND o.label_quality IS NOT NULL
     AND o.final_acuity IS NOT NULL
     AND o.state <> 'needs_info'
   ORDER BY i.group_key, i.record_id;
END;
$$;

/* ── 12. Execution grants ───────────────────────────────────────────────── */
REVOKE ALL ON FUNCTION public.pr_item_facility(uuid), public.pr_batch_facility(uuid),
  public.pr_coord_scope(uuid, text), public.pr_reviewer_scope(uuid, uuid),
  public.pr_is_conflicted(uuid, uuid), public.pr_set_item_training_use(uuid[], boolean),
  public.pr_list_items(uuid, text, integer), public.pr_export_batch(uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.pr_item_facility(uuid), public.pr_batch_facility(uuid),
  public.pr_coord_scope(uuid, text), public.pr_reviewer_scope(uuid, uuid),
  public.pr_is_conflicted(uuid, uuid), public.pr_set_item_training_use(uuid[], boolean),
  public.pr_list_items(uuid, text, integer), public.pr_export_batch(uuid)
  TO authenticated;