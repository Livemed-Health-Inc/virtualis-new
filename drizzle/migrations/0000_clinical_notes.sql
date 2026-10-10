CREATE TABLE public.clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.threads(id),
  facility_id text NOT NULL REFERENCES public.facilities(id),
  author_id uuid NOT NULL,
  parent_note_id uuid REFERENCES public.clinical_notes(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed')),
  subjective text NOT NULL DEFAULT '' CHECK (length(subjective) <= 8000),
  objective text NOT NULL DEFAULT '' CHECK (length(objective) <= 8000),
  assessment text NOT NULL DEFAULT '' CHECK (length(assessment) <= 8000),
  plan text NOT NULL DEFAULT '' CHECK (length(plan) <= 8000),
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinical_notes_thread_idx ON public.clinical_notes(thread_id, created_at DESC);

GRANT SELECT ON public.clinical_notes TO authenticated;
GRANT ALL ON public.clinical_notes TO service_role;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;

-- Signed notes are visible to clinicians credentialed at the facility; drafts only to their author.
CREATE POLICY "notes readable within facility" ON public.clinical_notes FOR SELECT TO authenticated
USING (public.setup_complete(auth.uid())
  AND public.has_facility_access(auth.uid(), facility_id)
  AND (status = 'signed' OR author_id = auth.uid()));

-- Signed notes are immutable.
CREATE OR REPLACE FUNCTION public.clinical_notes_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'notes cannot be deleted'; END IF;
  IF OLD.status = 'signed' THEN RAISE EXCEPTION 'signed notes are immutable'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER clinical_notes_guard BEFORE UPDATE OR DELETE ON public.clinical_notes
FOR EACH ROW EXECUTE FUNCTION public.clinical_notes_immutable();

ALTER TABLE public.audit_log DROP CONSTRAINT audit_log_action_allowed;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_action_allowed CHECK (action = ANY (ARRAY[
 'sign_in','sign_out','password_complete','thread_open','thread_create','message_send','encounter_request','encounter_accept','encounter_decline','encounter_end','encounter_cancel','device_pair','device_sync_denied','admin_invite','admin_invite_revoke','admin_facility_create','admin_device_register','admin_device_enrollment','admin_device_status','modellab_decision','modellab_feedback','modellab_stage','review_verdict','review_export','pr_import','pr_assign','pr_review_draft','pr_review_submit','pr_adjudicate','pr_export_approve','pr_export','note_save','note_sign','note_ai_draft']));
ALTER TABLE public.audit_log DROP CONSTRAINT audit_log_entity_allowed;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_entity_allowed CHECK (entity_type = ANY (ARRAY[
 'thread','message','encounter_request','device','device_enrollment','invite','facility','profile','model','session','review_case','pr_batch','pr_item','pr_assignment','clinical_note']));

-- Create or update the caller's own draft. Facility comes from the thread, never the client.
CREATE OR REPLACE FUNCTION public.note_save(_id uuid, _thread uuid, _parent uuid, _s text, _o text, _a text, _p text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); fac text; nid uuid; par public.clinical_notes;
BEGIN
  IF uid IS NULL OR NOT public.setup_complete(uid) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _id IS NULL THEN
    SELECT facility_id INTO fac FROM public.threads WHERE id = _thread;
    IF fac IS NULL OR NOT public.has_facility_access(uid, fac) THEN RAISE EXCEPTION 'Forbidden'; END IF;
    IF _parent IS NOT NULL THEN
      SELECT * INTO par FROM public.clinical_notes WHERE id = _parent;
      IF par.id IS NULL OR par.thread_id <> _thread OR par.status <> 'signed' THEN RAISE EXCEPTION 'Invalid addendum'; END IF;
    END IF;
    INSERT INTO public.clinical_notes(thread_id, facility_id, author_id, parent_note_id, subjective, objective, assessment, plan)
    VALUES (_thread, fac, uid, _parent, _s, _o, _a, _p) RETURNING id INTO nid;
  ELSE
    UPDATE public.clinical_notes SET subjective=_s, objective=_o, assessment=_a, plan=_p
    WHERE id = _id AND author_id = uid AND status = 'draft' AND public.has_facility_access(uid, facility_id)
    RETURNING id, facility_id INTO nid, fac;
    IF nid IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
  END IF;
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, facility_id) VALUES (uid,'note_save','clinical_note',nid,fac);
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.note_sign(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); fac text;
BEGIN
  IF uid IS NULL OR NOT public.setup_complete(uid) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.clinical_notes SET status='signed', signed_at=now()
  WHERE id=_id AND author_id=uid AND status='draft' AND public.has_facility_access(uid, facility_id)
    AND length(trim(assessment || plan)) > 0
  RETURNING facility_id INTO fac;
  IF fac IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, facility_id) VALUES (uid,'note_sign','clinical_note',_id,fac);
END $$;

REVOKE ALL ON FUNCTION public.note_save(uuid,uuid,uuid,text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.note_sign(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.note_save(uuid,uuid,uuid,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.note_sign(uuid) TO authenticated;