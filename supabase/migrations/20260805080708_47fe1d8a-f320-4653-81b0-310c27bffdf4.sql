CREATE OR REPLACE FUNCTION public.has_facility_access(_user_id uuid, _facility text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.provider_credentials c WHERE c.user_id = _user_id AND c.facility_id = _facility);
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_thread_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_facility_access(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_facility_access(uuid, text) TO authenticated;