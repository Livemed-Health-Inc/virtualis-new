CREATE TYPE public.acuity_level AS ENUM ('critical','urgent','routine');

CREATE TABLE public.facilities (
  id text PRIMARY KEY,
  name text NOT NULL,
  short text NOT NULL,
  emr text NOT NULL,
  hue text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.facilities TO authenticated;
GRANT ALL ON public.facilities TO service_role;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "facilities_read" ON public.facilities FOR SELECT TO authenticated USING (true);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Clinician',
  initials text NOT NULL DEFAULT 'MD',
  role text NOT NULL DEFAULT 'Virtual Provider',
  dept text NOT NULL DEFAULT 'Internal Medicine',
  home_facility text NOT NULL DEFAULT 'saint' REFERENCES public.facilities(id),
  online boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_write_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_id text NOT NULL REFERENCES public.facilities(id),
  privileges text NOT NULL DEFAULT 'Consultative',
  expires_on date NOT NULL DEFAULT (current_date + interval '1 year'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, facility_id)
);
GRANT SELECT ON public.provider_credentials TO authenticated;
GRANT ALL ON public.provider_credentials TO service_role;
ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credentials_read_own" ON public.provider_credentials FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_facility_access(_user_id uuid, _facility text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.provider_credentials c WHERE c.user_id = _user_id AND c.facility_id = _facility);
$$;

CREATE TABLE public.care_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  dept text NOT NULL,
  facility_id text NOT NULL REFERENCES public.facilities(id),
  initials text NOT NULL,
  online boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.care_team TO authenticated;
GRANT ALL ON public.care_team TO service_role;
ALTER TABLE public.care_team ENABLE ROW LEVEL SECURITY;
CREATE POLICY "care_team_read" ON public.care_team FOR SELECT TO authenticated
  USING (public.has_facility_access(auth.uid(), facility_id));

CREATE TABLE public.threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  context text NOT NULL DEFAULT '',
  facility_id text NOT NULL REFERENCES public.facilities(id),
  patient text NOT NULL DEFAULT '—',
  room text NOT NULL DEFAULT '—',
  mrn text,
  dob date,
  acuity public.acuity_level NOT NULL DEFAULT 'routine',
  reason text NOT NULL DEFAULT '',
  confidence integer NOT NULL DEFAULT 0,
  is_team boolean NOT NULL DEFAULT false,
  members text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.threads TO authenticated;
GRANT ALL ON public.threads TO service_role;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "threads_read" ON public.threads FOR SELECT TO authenticated
  USING (public.has_facility_access(auth.uid(), facility_id));
CREATE POLICY "threads_insert" ON public.threads FOR INSERT TO authenticated
  WITH CHECK (public.has_facility_access(auth.uid(), facility_id) AND created_by = auth.uid());
CREATE POLICY "threads_update" ON public.threads FOR UPDATE TO authenticated
  USING (public.has_facility_access(auth.uid(), facility_id))
  WITH CHECK (public.has_facility_access(auth.uid(), facility_id));

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name text NOT NULL,
  kind text NOT NULL DEFAULT 'text',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_thread_idx ON public.messages (thread_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_read" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.threads t WHERE t.id = thread_id AND public.has_facility_access(auth.uid(), t.facility_id)));
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.threads t WHERE t.id = thread_id AND public.has_facility_access(auth.uid(), t.facility_id)));

CREATE TABLE public.thread_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, thread_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_reads TO authenticated;
GRANT ALL ON public.thread_reads TO service_role;
ALTER TABLE public.thread_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reads_own" ON public.thread_reads FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id text NOT NULL REFERENCES public.facilities(id),
  label text NOT NULL,
  day_of_month integer NOT NULL,
  time_label text NOT NULL,
  acuity public.acuity_level NOT NULL DEFAULT 'routine',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shifts TO authenticated;
GRANT ALL ON public.shifts TO service_role;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shifts_read" ON public.shifts FOR SELECT TO authenticated
  USING (public.has_facility_access(auth.uid(), facility_id));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    upper(left(COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 2))
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.provider_credentials (user_id, facility_id, privileges, expires_on) VALUES
    (NEW.id, 'saint', 'Critical Care · Admitting', '2027-02-14'),
    (NEW.id, 'edgerton', 'Tele-Cardiology', '2026-09-02'),
    (NEW.id, 'mercy', 'Tele-ICU Consultative', '2026-08-19')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.bump_thread_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.threads SET last_message_at = NEW.created_at WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_message_created
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_thread_activity();

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.threads;

INSERT INTO public.facilities (id, name, short, emr, hue) VALUES
  ('saint','Saint Anthony','SAH','Epic','#2E5CFF'),
  ('edgerton','Edgerton Regional','EDG','Cerner','#7B5BF2'),
  ('mercy','Mercy West','MCW','Meditech','#0EA5A5'),
  ('northline','Northline Children''s','NLC','Epic','#E8590C');

INSERT INTO public.care_team (name, role, dept, facility_id, initials, online) VALUES
  ('Dr. M. Mark, DO','Physician','Emergency Medicine','saint','MM',true),
  ('Saamer Siddiqi, MD','Physician','Internal Medicine','saint','SS',true),
  ('Dr. Elena Vasquez','Physician','Cardiology','edgerton','EV',true),
  ('Amy Smith, RN','Virtual Nurse','Surgery','saint','AS',true),
  ('James Torres, RN','Virtual Nurse','Cardiology','edgerton','JT',false),
  ('Dr. Lisa Wong','Physician','Oncology','mercy','LW',false);

INSERT INTO public.shifts (facility_id, label, day_of_month, time_label, acuity) VALUES
  ('saint','Tele-ICU Coverage',4,'7:00 AM – 7:00 PM','critical'),
  ('edgerton','Cardiology Reads',5,'8:00 AM – 12:00 PM','urgent'),
  ('saint','Tele-ID Rounds',7,'1:00 PM – 4:00 PM','routine'),
  ('mercy','Tumor Board',7,'2:30 PM – 3:30 PM','routine'),
  ('saint','Tele-ICU Coverage',8,'7:00 PM – 7:00 AM','critical');

INSERT INTO public.threads (id, name, context, facility_id, patient, room, mrn, dob, acuity, reason, confidence, is_team, members, last_message_at) VALUES
  ('11111111-1111-4111-8111-111111111111','Team Consultation','Tele-ICU · Critical Care','saint','Jon Smith','404','MRN-176471','1965-10-11','critical','Patient in Rm 404 with chest pain, escalating pressor requirement.',92,true,'Dr. M. Hussain, Dr. E. Vasquez +2', now() - interval '1 minute'),
  ('22222222-2222-4222-8222-222222222222','Dr. Elena Vasquez','Tele-Cardiology','edgerton','Maria Chen','212','MRN-208114','1958-03-22','critical','Troponin rise with anterior ST changes.',88,false,null, now() - interval '12 minutes'),
  ('33333333-3333-4333-8333-333333333333','Amy Smith, RN','Tele-Infectious Disease','saint','Robert Diaz','318','MRN-355902','1971-07-02','urgent','Positive blood cultures, needs antimicrobial guidance.',85,false,null, now() - interval '38 minutes'),
  ('44444444-4444-4444-8444-444444444444','Dr. Raj Patel','Tele-Pulmonology','mercy','Linda Okafor','126','MRN-441238','1949-12-30','urgent','COPD exacerbation, improving.',90,false,null, now() - interval '1 hour'),
  ('55555555-5555-4555-8555-555555555555','James Torres, RN','Tele-Cardiology','edgerton','Maria Chen','212','MRN-208114','1958-03-22','routine','Discharge co-sign.',96,false,null, now() - interval '3 hours'),
  ('66666666-6666-4666-8666-666666666666','Dr. Lisa Wong','Scheduling','mercy','—','—',null,null,'routine','',0,false,null, now() - interval '1 day');

INSERT INTO public.messages (thread_id, sender_name, kind, body, created_at) VALUES
  ('11111111-1111-4111-8111-111111111111','Amy Smith, RN','consult','New consult request: patient in Room 404 is experiencing chest pain with escalating O2 requirement.', now() - interval '35 minutes'),
  ('11111111-1111-4111-8111-111111111111','Dr. E. Vasquez','text','MAP holding at 62 on norepi 12 mcg. Lactate 4.1, up from 3.2.', now() - interval '30 minutes'),
  ('11111111-1111-4111-8111-111111111111','Dr. E. Vasquez','attachment','Echocardiogram report — 2-D & M-Mode, color flow Doppler', now() - interval '20 minutes'),
  ('11111111-1111-4111-8111-111111111111','Dr. E. Vasquez','text','Pulling the last ABG now — will post in the thread.', now() - interval '1 minute'),
  ('22222222-2222-4222-8222-222222222222','Dr. E. Vasquez','text','Troponin trending up on repeat draw. ECG attached — ST changes in V3–V4.', now() - interval '20 minutes'),
  ('22222222-2222-4222-8222-222222222222','Dr. E. Vasquez','text','Cath lab notified, holding for your call.', now() - interval '12 minutes'),
  ('33333333-3333-4333-8333-333333333333','Amy Smith, RN','text','Blood cultures resulted — gram-positive cocci in clusters, 2 of 2 bottles.', now() - interval '38 minutes'),
  ('44444444-4444-4444-8444-444444444444','Dr. R. Patel','text','O2 requirement down to 3L. Okay to space nebs to q6h overnight?', now() - interval '1 hour'),
  ('55555555-5555-4555-8555-555555555555','James Torres, RN','text','Discharge summary drafted for your co-sign when you have a moment.', now() - interval '3 hours'),
  ('66666666-6666-4666-8666-666666666666','Dr. L. Wong','text','Can we move Thursday''s tumor board to 2:30? Radiology has a conflict.', now() - interval '1 day');