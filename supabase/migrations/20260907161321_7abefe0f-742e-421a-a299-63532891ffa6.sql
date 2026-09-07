REVOKE ALL ON FUNCTION public.is_clinical_reviewer(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_queue(text, text, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_review_verdict(uuid, text, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_clinical_reviewer(uuid) TO service_role;