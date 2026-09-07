DO $$
DECLARE uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower('dr.siddiqi@livemedhealth.com');
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No auth user found with email dr.siddiqi@livemedhealth.com';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'clinical_reviewer')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;