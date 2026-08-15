REVOKE ALL ON FUNCTION public.respond_to_encounter_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_encounter_request(uuid, text) TO authenticated;