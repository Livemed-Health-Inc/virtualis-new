CREATE OR REPLACE FUNCTION public.clinical_notes_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_user = 'service_role' THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'notes cannot be deleted';
  END IF;
  IF OLD.status = 'signed' THEN RAISE EXCEPTION 'signed notes are immutable'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;