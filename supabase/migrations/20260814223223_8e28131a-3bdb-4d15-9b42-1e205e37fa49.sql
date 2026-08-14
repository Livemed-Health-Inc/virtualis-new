-- 1. Invite classification -------------------------------------------------
ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS user_class text NOT NULL DEFAULT 'onsite',
  ADD COLUMN IF NOT EXISTS staff_type text,
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS facility_ids text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.invites
  DROP CONSTRAINT IF EXISTS invites_user_class_check;
ALTER TABLE public.invites
  ADD CONSTRAINT invites_user_class_check CHECK (user_class IN ('virtual', 'onsite'));

-- 2. Device registry --------------------------------------------------------
CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id text NOT NULL REFERENCES public.facilities(id),
  label text NOT NULL,
  unit text NOT NULL DEFAULT '',
  room text,
  floating boolean NOT NULL DEFAULT false,
  has_mintti boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'registered',
  device_token_hash text,
  enrolled_at timestamptz,
  last_seen_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT devices_status_check CHECK (status IN ('registered', 'enrolled', 'revoked'))
);
CREATE UNIQUE INDEX devices_token_hash_key ON public.devices(device_token_hash) WHERE device_token_hash IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage devices" ON public.devices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Facility staff read devices" ON public.devices FOR SELECT TO authenticated
  USING (public.has_facility_access(auth.uid(), facility_id));

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. One-time kiosk enrollment codes ---------------------------------------
CREATE TABLE public.device_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  code_hint text NOT NULL DEFAULT '',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX device_enrollments_device_idx ON public.device_enrollments(device_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_enrollments TO authenticated;
GRANT ALL ON public.device_enrollments TO service_role;
ALTER TABLE public.device_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage device enrollments" ON public.device_enrollments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Admin management of hospitals and hospital access ----------------------
GRANT INSERT, UPDATE ON public.facilities TO authenticated;
CREATE POLICY "Admins manage facilities" ON public.facilities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, UPDATE, DELETE ON public.provider_credentials TO authenticated;
CREATE POLICY "Admins manage credentials" ON public.provider_credentials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Stop granting every new account access to every demo hospital ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    upper(left(COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 2))
  )
  ON CONFLICT (id) DO NOTHING;
  -- Hospital access is provisioned explicitly by an administrator when the
  -- invitation is issued; it is no longer granted automatically here.
  RETURN NEW;
END;
$function$;