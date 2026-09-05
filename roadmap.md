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

- Authorizer now accepts the ES256 session token (401 resolved), but the service behind
  the gateway answers `404 {"detail":"Not Found"}` for all four canonical paths
  (`GET /v1/info`, `POST /v1/decisions|feedback|training-intake`) while unknown paths get
  the gateway's own `{"message":"Not Found"}` — so routes exist on the gateway and the
  request reaches the app, which does not recognise the path. Most likely the `/model-lab`
  stage prefix is being passed through to the app (FastAPI/Mangum: set
  `api_gateway_base_path="/model-lab"` or `root_path`). Until fixed, `/model-lab` shows
  "Runtime unreachable" and `Model runtime returned 404`.
- Unverifiable from here (backend schema not accessible): exact `channel` enum, feedback
  body field names, `label_quality` scale (sent as high|medium|low) and the intake
  envelope key (`examples`). A 422 from the runtime after the 404 is fixed will name any
  mismatch; the schemas live in `acuity.schemas.ts`. Re-run
  `/tmp/browser/modellab/check_modellab.py` after the AWS change.

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
