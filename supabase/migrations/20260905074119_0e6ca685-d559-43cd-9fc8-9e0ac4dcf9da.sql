-- Restore clinician access broken by 20260904144419.
-- setup_complete(uuid) IS on a client path: 13 RLS policies (threads, messages,
-- care_team, shifts, thread_reads, devices, encounter_requests, provider_presence,
-- rounding_acks) evaluate it as the calling role. Policy expressions run with the
-- caller's privileges, so revoking EXECUTE from `authenticated` made every one of
-- those reads/writes fail with "permission denied for function setup_complete".
-- The function is SECURITY DEFINER, reads a single boolean about the caller, and
-- leaks nothing — it is safe and required for signed-in users.
GRANT EXECUTE ON FUNCTION public.setup_complete(uuid) TO authenticated;

COMMENT ON FUNCTION public.setup_complete(uuid) IS
  'Password-setup gate used by RLS policies. Must remain EXECUTE-able by authenticated; revoking it breaks all clinician table access.';