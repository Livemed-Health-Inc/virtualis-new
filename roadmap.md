# Roadmap — production hardening (no publish, no destructive data ops)

1. [x] Remove MCP attack surface (routes, well-known, tools, manifest) → 404
2. [x] Server-authoritative forced password completion (`profiles.must_change_password`)
       — BEFORE UPDATE trigger rejects any change from a non-service role; verified by SQL
3. [x] Append-only metadata-only `audit_log` — no client INSERT policy or grant; all writes
       go through `recordAuditEvent` (authenticated server fn, actor from the verified session)
4. [x] Kiosk hardening: throttling/lockout, token expiry + rotation, generic errors
5. [x] Disable demo mode in production; no fixture data on clinical routes
6. [x] Tighten authz: profiles RLS scoped, SECURITY DEFINER grants, Model Lab admin-only
       (server + UI), server-side identifier scan, 15-min inactivity sign-out
7. [x] Least-privilege grants: `anon` has none; `authenticated` holds only the exact DML
       each surface needs; TRUNCATE/TRIGGER/REFERENCES/MAINTAIN revoked everywhere;
       `rate_limits` server-only; default privileges revoked for future tables
8. [x] Rate-limit identity: only the hosting edge header (`cf-connecting-ip`) is trusted;
       spoofed `X-Forwarded-For`/`X-Real-IP` ignored, missing header fails closed (503)
9. [x] Release hygiene: /device noindex, zero lint errors, CI workflow (lint, typecheck,
       tests, production build, dependency audit)
10. [x] Model Lab → AWS runtime: server-only `ACUITY_API_URL` / `ACUITY_API_AUTH_MODE`
        (config, not credentials; no AWS keys, no VITE vars); only the signed-in user's
        session token is forwarded; every response projected onto a whitelisted contract
        (`contract.ts`) so submitted text/identifiers can never be echoed;
        `clinically_validated=false` + `review_required=true` clamped server-side
11. [x] Regression fix: `20260904144419` revoked EXECUTE on `setup_complete(uuid)` from
        signed-in users, but 13 RLS policies evaluate it as the caller → every clinician
        read of threads/messages/care_team/shifts/presence failed 403. Grant restored
        (`20260904…` follow-up migration) and verified live: inbox loads, anon still 401.
12. [x] Model Lab canonical contract: `POST /v1/decisions` sends `{message, context{channel,
        sender_role, care_setting, use_case, specialty_hint, legacy_score_band}}`; response
        projected from `{decision_id, model_version, policy_version, acuity{level, score,
        confidence, probabilities}, route{destination, service_line, priority, sla_seconds,
        escalation_after_seconds, fallback}, reason_codes}`. Feedback = `{decision_id,
        acuity, routes}`; intake = `{examples:[{record_id, text, acuity, use_case, routes,
        label_quality, sample_weight, include_in_training:true, group_id, split}]}`. All
        input schemas `.strict()` (`acuity.schemas.ts`): `promote`, `batch_label`,
        `provenance`, `agrees`, `note` are rejected, never forwarded. Reviewer verdict UI
        added (structured labels only). JSONL export emits the same intake record.

## Blocked on user (AWS side)

- 2026-09-05 re-check after the Lambda-authorizer deploy: unsigned → 401, forged ES256 →
  403, real admin session → accepted. But every canonical route
  (`GET /model-lab/v1/info`, `POST /model-lab/v1/decisions|feedback|training-intake`)
  returns `404 {"detail":"Not Found"}` with the app's own headers
  (`x-request-id`, `cache-control: no-store`, `x-content-type-options: nosniff`),
  while any other path gets the gateway's `{"message":"Not Found"}`. So the gateway routes
  and integration are correct and the request reaches the FastAPI app, whose router does
  not match the path it is handed — the `/model-lab` stage segment is not being
  reconciled (Mangum `api_gateway_base_path="/model-lab"` / FastAPI `root_path`, or the
  app was smoke-tested by direct Lambda invoke / a `$default` stage, which bypasses the
  stage prefix). No `$default` stage exists (`/v1/info` at the origin → gateway 404).
  Until fixed, `/model-lab` shows "Runtime unreachable" and `Model runtime returned 404`;
  model version, routing, feedback persistence and `awaiting_adjudication` remain
  unverified from this app.
- Unverifiable from here (backend schema not accessible): exact `channel` enum, feedback
  body field names, `label_quality` scale (sent as high|medium|low) and the intake
  envelope key (`examples`). A 422 from the runtime after the 404 is fixed will name any
  mismatch; the schemas live in `acuity.schemas.ts`. Re-run
  `/tmp/browser/modellab/live_flow.py` (decision → verdict → intake, echo check) after
  the AWS change.

## Accepted residual scanner findings

- `rate_limits` has RLS enabled with no policy — deliberate deny-all; only server code
  (service role) reaches it through the SECURITY DEFINER rate-limit functions.
- `has_role`, `shares_facility`, `setup_complete` remain executable by signed-in users:
  RLS policies call them as the invoking role, so revoking EXECUTE breaks every scoped
  read (proved by item 11). Each returns one boolean about the caller and leaks nothing.
- `respond_to_encounter_request` is client-callable by design and authorizes internally
  (facility membership or admin, plus valid state transition).
- 7 lint warnings, all `react-refresh/only-export-components` in shadcn UI primitives and
  the stethoscope provider — dev-only fast-refresh hints, no runtime effect.

13. [x] Use cases corrected to the deployed routing policy (`GET /v1/info`):
        `clinical_message | specialist_consult | diagnostic_result | care_coordination`,
        replacing the invented `triage/routing/escalation/quality_review` set across the
        server Zod enums, decision UI (default `specialist_consult`), CSV/JSONL import
        fallback, training examples and tests. Verified live 2026-09-06 with one synthetic
        specialist_consult decision — no PHI, no feedback or intake submitted.
14. [x] Password recovery now follows the auth client's verified recovery event, including
        modern code-based reset links, instead of relying only on a legacy URL fragment.
15. [x] Agent integration restored as an OAuth-protected, read-only connection check only.
        It exposes no patient, clinical message, facility, device, or Model Lab data.
16. [x] Model Lab hardening (review only, not published): screen every outbound free-text
        field for identifiers and constrain them to vocabularies/slugs; per-user throttling
        on all four Model Lab calls (tighter budget for training intake); aggregate intake
        byte ceiling under the runtime cap; reject malformed model replies instead of
        projecting partial decisions; pin the CI runtime version.

17. [x] Clinical Review console (review only, not published): new `clinical_reviewer` role
        alongside admin, enforced server-side in every review call through `has_role`.
        Uncertainty-ordered review queue with acuity/use-case/state filters showing the
        model's prediction, confidence, full probability distribution, reason codes,
        proposed route, and model/policy versions. Structured verdicts only (acuity,
        route accepted, fixed outcome code), persisted locally and forwarded on the
        existing feedback contract. Independence and the single/expert/adjudicated ladder
        are enforced inside guarded database routines — a reviewer can never read another
        reviewer's verdict. Reviewer statistics include inter-rater agreement, the
        disagreement queue and adjudicated high-acuity progress toward the 126-case gate.
        Governed JSONL export of adjudicated labels through the existing identifier
        screening; nothing here validates or promotes a model.

18. [x] Physician Review workflow at /physician-review (implemented, not published):
        blinded physician screen (Low/Moderate/High only — no numeric acuity — plus a
        separate "not enough information" status with no acuity, required rationale, and
        optional specialist routes with an explicit "no specialty needed"), backend-saved
        drafts with no PHI in browser storage, and a coordinator dashboard for JSONL
        import, two-distinct-reviewer assignment, disagreement adjudication by a third
        physician, approval-gated governed export, and live counts. Independence,
        assignment scope, facility isolation, idempotent concurrent submits and export
        gating are enforced in guarded database routines with append-only audit records;
        practice data is isolated from clinical counts and export. Numeric 1–5 acuity
        wording removed from the Model Lab surfaces touched.
