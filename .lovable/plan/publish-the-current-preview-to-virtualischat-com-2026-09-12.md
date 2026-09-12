# Publish the current preview to virtualischat.com

## What this does
Publishes the current preview build to virtualischat.com so the live site includes the work that has been built and tested but not yet published: Model Lab hardening, the Clinical Review console, and the Physician Review workflow — alongside the existing clinical messaging app that is already live.

## Current state (verified)
- virtualischat.com is live and serving the older published build (the messaging/triage app).
- Recent work (Model Lab, Clinical Review, Physician Review) is built, tested, and its database tables are already applied to the backend, but its frontend is not on the live site.
- The preview build passes: typecheck, 134 tests, lint (7 pre-existing Fast Refresh warnings), and production build — all green per the last validation run.

## Security check before publishing
- Security scan: no critical findings. One advisory `warn` — Supabase `SECURITY DEFINER` functions are callable by signed-in users. This is the known, intentional pattern: every review RPC checks the caller's role/facility internally before doing anything. Same set as the existing published app; nothing new was introduced by the recent work.

## What publishing changes on the live site
- Adds `/model-lab`, `/clinical-review`, and `/physician-review` routes and their UIs to virtualischat.com.
- The existing messaging app, sign-in, admin, devices, telehealth surfaces remain as-is.
- No database changes are needed at publish time — those tables are already applied.

## Risks / notes
- The SECURITY DEFINER advisory remains open by design; the user (workspace owner) accepts it as the existing pattern.
- Model Lab / Clinical Review / Physician Review access is gated server-side by role (`admin` / `clinical_reviewer`); the UI is hidden from users without the role, and the server functions refuse unauthorized callers.
- The acuity model itself is unaffected — it continues to run on its AWS endpoint.

## Steps
1. Publish the current preview via the publish tool.
2. Confirm the live URL serves the new build once deployment completes (one fetch, no polling).

## Out of scope
- No code changes. No database migrations. No new features. No changes to the model runtime.
