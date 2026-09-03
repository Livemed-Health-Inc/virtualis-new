# Virtualis Nue — Production Release-Readiness Audit

No code was changed in this turn. Everything below is backed by a read of the current commit, the live backend, the test/lint run, and a backend security scan.

## Verdict

**Not ready for production release as a PHI-capable system.** The core tenant-isolation model is genuinely good — clinical tables (`threads`, `messages`, `care_team`, `shifts`) are all RLS-scoped through `has_facility_access()`, privileged server functions re-verify `has_role(admin)` before any service-role call, and the kiosk endpoints derive facility from a hashed device token rather than client input.

What blocks release is a small number of hard gaps: a **publicly reachable unauthenticated MCP server**, **forced-password-change that exists only in React state**, **no PHI access audit trail**, **no throttling on the public kiosk endpoints**, and **prototype data plus test accounts living in the same instance that serves the published domain**.

Separately and non-negotiably: **this is an engineering-readiness assessment only.** Nothing here constitutes clinical validation of the acuity model. `clinically_validated=false` and mandatory human review must remain true regardless of P0/P1 closure, and RC4 must not be promoted on the strength of a working UI.

## Verified current state

| Check | Result |
| --- | --- |
| Tests | 28 pass, 2 files only (`src/lib/modellab/training.test.ts`, `src/lib/handoff/core.test.ts`) |
| Lint | 728 errors / 7 warnings (`bunx eslint .`) — 727 auto-fixable, overwhelmingly Prettier formatting |
| Build | Last recorded build OK |
| Backend scan | 3 warnings: unauthenticated MCP server, `profiles_read USING (true)`, signed-in-executable SECURITY DEFINER function |
| Live instance | 10 auth users — 7 `@example.com` test accounts, 1 admin; 9 threads, 20 messages, 4 facilities, 0 devices |
| Environments | One Supabase instance (`ziarngewwxntdchiythj`) serves both preview and the published domains |

## P0 — must close before any production/PHI use

### P0-1. Unauthenticated public MCP server exposes clinical-shaped data
`.lovable/mcp/manifest.json` declares `"auth": {"type": "none"}`. `src/routes/mcp.ts`, `src/routes/[.mcp]/list-tools.ts`, `src/routes/[.mcp]/invoke-tool/$tool.ts` and `src/routes/[.well-known]/oauth-protected-resource.ts` attach no auth middleware. `src/lib/mcp/tools/list-threads.ts:29-45` returns `patient`, `room`, `mrn` fields. The data is fictional fixtures from `src/components/virtualis/data.js`, so no real PHI leaks today — but the endpoint is a permanently open, unauthenticated read surface on a healthcare domain, and the moment any tool is repointed at Supabase it becomes a breach.

**Fix:** either require OAuth on the MCP server, or remove the MCP routes and `src/lib/mcp/` entirely for the clinical build. Recommendation: remove for RC4; re-add behind OAuth if there is a product need.

**Acceptance:** unauthenticated `POST https://virtualischat.com/mcp` returns 401 (or 404 if removed); no route under `src/routes/**` reaches `data.js` patient fields without an authenticated session; security scan no longer reports `app_mcp_public_unauthenticated`.

### P0-2. Forced password change is client-state only
`src/components/VirtualisApp.jsx:865-871` sets `needsPassword` once from `window.location.hash` matching `type=(invite|recovery)`, then strips the hash. `src/components/virtualis/screens.jsx:1888` just calls `supabase.auth.updateUser`. There is no `must_change_password` column anywhere in `supabase/migrations/` and no server function consults one. A refresh on the Set Password screen drops the flag and grants the full workstation with the invite-established session intact.

**Fix:** add a server-authoritative flag (e.g. `profiles.must_change_password boolean not null default true`, cleared only by a `createServerFn` that itself performs the password update), have `store.jsx` load it with the profile, and gate the workstation on it.

**Acceptance:** signing in via an invite link, then hard-refreshing, still lands on Set Password; the flag flips only after a successful password update; a server function called while the flag is set is rejected.

### P0-3. No PHI access audit trail
No audit table exists in any migration and no read path records access. `src/lib/virtualis/store.jsx:101-129` reads `profiles`, `care_team`, `threads`, `messages` with no logging. HIPAA §164.312(b) requires recording access to ePHI.

**Fix:** add an append-only `audit_log` table (actor, action, entity, entity_id, facility_id, at) with insert-only grants and no client UPDATE/DELETE; write entries on thread open, message send, encounter accept/decline/end, admin invite/device actions, and Model Lab staging. Log identifiers only — never message bodies or patient names.

**Acceptance:** opening a thread and sending a message each produce exactly one row; a non-admin cannot SELECT another facility's rows; no audit row contains free-text clinical content.

### P0-4. Public kiosk endpoints have no rate limiting
`src/routes/api/public/device.ts:20` accepts pairing codes of 6–16 chars with unlimited attempts; `src/routes/api/public/encounter.ts` accepts unlimited token probes. Both bypass site auth by design (`/api/public/*`). Successful pairing yields a **long-lived, non-expiring device token** with no rotation path.

**Fix:** per-IP and per-code attempt throttling with lockout on the `pair` action, per-token throttling on `encounter`, plus a token expiry/rotation field on `devices` and an admin revoke path that clears `device_token_hash`.

**Acceptance:** 10 bad pair codes from one IP produce 429; a revoked device's token returns 401 on `sync` and every `encounter` action; an expired token cannot be renewed without a new enrollment code.

### P0-5. Prototype state and test accounts share the production instance
Seven `@example.com` accounts still exist in the instance serving `virtualischat.com`, and preview and production are the same backend. `src/components/virtualis/DeviceStation.jsx:106,289-325` offers "Continue in demo mode" at `/device`, and `src/components/virtualis/data.js` fixtures drive the MCP surface.

**Fix:** delete the seven test accounts and any orphan `profiles`/`user_roles` rows; disable the kiosk demo-mode branch in production builds (`import.meta.env.PROD`) or put it behind an explicit flag; confirm no route renders `data.js` fixtures in the signed-in app.

**Acceptance:** `select count(*) from auth.users where email like '%example.com%'` returns 0; `/device` in a production build offers no demo path; no rendered clinical view sources rows from `data.js`.

## P1 — close before broad rollout

- **`profiles_read USING (true)`** (`supabase/migrations/20260805080642_*.sql:30`) — every authenticated user reads every clinician's name, role, department, home facility and notification prefs across all facilities. Scope to `has_facility_access()`. *Acceptance:* a user credentialed only at facility A gets zero rows for a facility-B-only clinician.
- **SECURITY DEFINER function executable by signed-in users** (scan finding) — audit `EXECUTE` grants on the definer functions (`has_role`, `has_facility_access`, `respond_to_encounter_request`) and revoke where clinicians should not call directly. *Acceptance:* scan finding clears; encounter accept/decline still works.
- **Model Lab has no role gate** — `src/lib/modellab/acuity.functions.ts:57,69,77,90` require only `requireSupabaseAuth`. Any invited clinician can run decisions and stage training batches. Add `assertAdmin`-equivalent (or a dedicated `model_lab` role) and mirror the gate in `ModelLabPage.jsx`. *Acceptance:* a non-admin session receives 403 from `stageTrainingBatch` and sees no Model Lab nav entry.
- **Training-intake identifier screening is client-side only** — detection lives in `src/lib/modellab/training.ts` and can be skipped by calling the server fn directly. Re-run the email/phone/SSN/MRN scan inside the `stageTrainingBatch` handler and reject the batch server-side. *Acceptance:* a batch containing `555-12-3456` posted directly to the server fn is rejected with no example text echoed in the error.
- **No idle session timeout** on a clinical workstation. Add an inactivity sign-out (15–30 min) in `store.jsx`. *Acceptance:* an idle tab signs out and requires re-auth.
- **Test coverage is 2 files.** Nothing covers auth gating, invite claim, device token hashing/revocation, RLS isolation, or Model Lab authorization. Add server-fn authorization tests and a two-tenant isolation test. Constraint: fixtures must use synthetic identifiers only — no PHI in tests or logs.
- **Lint is not release-gradeable** — 728 errors drown real signal. Run `eslint --fix`, then gate CI on a clean lint.
- **Single environment.** Preview writes land in the production instance. Document this explicitly or provision a separate staging backend before pilot.

## P2 — hardening and hygiene

- `facilities_read USING (true)` — facility directory is globally readable; low harm, tighten for consistency.
- MCP server still named `pixel-perfect-view` (`src/lib/mcp/index.ts:7`) — remove with P0-1 or rename.
- Confirm the "Engineering validation — human review required" banner and `clinically_validated=false` render from local policy, not from an API-supplied field, so a misconfigured runtime cannot flip them.
- Verify `noindex,nofollow` on `/device` as it exists on `/model-lab` (`src/routes/model-lab.tsx:22`).
- Define data retention/deletion for `messages`, `encounter_requests` and the new `audit_log`.
- Known UI defects from the prior audit, unfixed: floating "Unavailable" on-call pill overlaps the mobile Video button; group threads lack patient/room context, which breaks the telehealth launcher.

## Engineering readiness vs clinical validation

**Engineering ship readiness** is what this plan measures: access control, tenant isolation, auditability, secrets handling, fail-closed configuration, test and build health. On these, the app is close — the gaps are enumerable and mostly small.

**Clinical validation is a separate gate and is not addressed by any item above.** No item here licenses promoting the acuity model. The following must hold unchanged through RC4 and beyond: `clinically_validated=false` stays false until an independent clinical validation study exists; every acuity decision remains human-reviewed; `stageTrainingBatch` never retrains or promotes (currently correct — `promote: false` is hardcoded at `acuity.functions.ts:102`); only synthetic or approved de-identified data enters the Model Lab; and no PHI appears in tests or logs. A working UI and a green build are not evidence of clinical safety.

## Suggested sequence

1. P0-1 and P0-5 first — they are removals/cleanups and shrink the attack surface immediately.
2. P0-2 and P0-4 next — schema plus server-function work.
3. P0-3 — audit table and write sites, touching most of the data layer.
4. P1 in listed order, with lint auto-fix and CI gating early so later work lands clean.
5. P2 alongside.
