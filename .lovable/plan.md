# Delete stale example.com test accounts

## Goal
Remove the 7 stale `*@example.com` test accounts (dr.hussain, dr.hussain2, dr.hussain3, dr.h9a, and any other example.com rows) so the user list contains only real/demo accounts:

- dr.saamersiddiqi@gmail.com (owner/admin)
- info@livemedhealth.com (clinician demo)
- nurse@livemedhealth.com (onsite nurse demo)
- any other non-example.com account confirmed in the users table

## Steps

1. **Verify targets** — query `auth.users` joined with `public.profiles` to list every `*@example.com` account and confirm the count (expected ~7) before deleting.
2. **Delete** — `DELETE FROM auth.users WHERE email LIKE '%@example.com'`. The `profiles` row and any `user_roles` entries cascade via existing foreign keys.
3. **Verify** — re-query and show the final clean user list (email, name, role, facility).
4. **Regression check** — confirm invite-only sign-up still works conceptually (no code touched; this is data-only), and that no thread/message data depends on the deleted users. If any threads/messages reference deleted user IDs, report them rather than silently breaking foreign keys (delete only proceeds if FKs cascade cleanly; otherwise delete dependent demo rows first and report).

## Notes
- Data-only change: no code, no schema, no RLS edits. Safe, reversible only by re-inviting.
- Nothing to publish; takes effect immediately in preview and production data.
