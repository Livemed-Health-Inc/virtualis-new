-- Signed-out callers can reach none of the workflow routines.
REVOKE ALL ON FUNCTION public.pr_is_coordinator(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.pr_is_physician(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pr_is_coordinator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pr_is_physician(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.pr_recompute(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.pr_audit(text, text, uuid, text) FROM public, anon, authenticated;

REVOKE ALL ON FUNCTION public.pr_import_batch(text, text, text, jsonb) FROM public, anon;
REVOKE ALL ON FUNCTION public.pr_assign_reviewers(uuid[], uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.pr_assign_adjudicator(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.pr_my_queue(boolean) FROM public, anon;
REVOKE ALL ON FUNCTION public.pr_save_review(uuid, text, text, boolean, text, text[], boolean) FROM public, anon;
REVOKE ALL ON FUNCTION public.pr_overview() FROM public, anon;
REVOKE ALL ON FUNCTION public.pr_list_items(uuid, text, integer) FROM public, anon;
REVOKE ALL ON FUNCTION public.pr_set_export_approval(uuid, boolean, boolean, boolean) FROM public, anon;
REVOKE ALL ON FUNCTION public.pr_export_batch(uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.pr_import_batch(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pr_assign_reviewers(uuid[], uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pr_assign_adjudicator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pr_my_queue(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pr_save_review(uuid, text, text, boolean, text, text[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pr_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pr_list_items(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pr_set_export_approval(uuid, boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pr_export_batch(uuid) TO authenticated;
