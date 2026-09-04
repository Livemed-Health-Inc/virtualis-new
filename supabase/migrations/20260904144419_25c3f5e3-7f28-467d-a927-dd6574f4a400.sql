-- setup_complete() is not used by any client path; the setup gate reads the
-- profile flag through an authenticated server function instead.
REVOKE EXECUTE ON FUNCTION public.setup_complete(uuid) FROM PUBLIC, anon, authenticated;
