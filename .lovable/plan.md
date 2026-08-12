# Reset acuity indicators on every login

Today the app only wipes read state when the browser fires a fresh `SIGNED_IN` event. If the session is restored from a returning tab, or if the wipe happens after the inbox has already loaded, threads can come back looking read — so the acuity indicators and unread emphasis don't show.

## What changes

- Every time a session becomes active (fresh sign-in **and** restored session on app open), all threads reset to unread so the full acuity picture is visible: colored bars, blue unread dots, and filled count pills.
- The reset runs before the inbox renders, so there's no flash of "already read" rows.
- Reading a thread during the session still marks it read as usual; the reset happens once per session start, not on every navigation.

## Technical notes

- `src/lib/virtualis/store.jsx`: replace the `freshLogin` flag with a per-session reset keyed on `session.user.id` + session start. In `load()`, delete `thread_reads` for the user and clear local `reads` state before fetching threads, guarded so it runs once per session (a ref keyed by user id), not on every `load()` re-run triggered by realtime updates.
- No schema, RLS, or UI changes — `thread_reads` already grants DELETE to the owning user.
