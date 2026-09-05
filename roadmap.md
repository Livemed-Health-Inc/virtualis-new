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

## Blocked on user (AWS side)

- API Gateway's built-in JWT authorizer validates only RSA-signed tokens (AWS docs:
  "Currently, only RSA-based algorithms are supported"). Lovable Cloud signs sessions
  with ES256 and offers no RSA option, so `/model-lab` currently gets
  `401 "signing method ES256 is invalid"`. Fix: replace the JWT authorizer with a Lambda
  authorizer that verifies ES256 against the auth JWKS (issuer = the auth URL already
  configured on the authorizer, `aud=authenticated`). Then re-run
  `/tmp/browser/modellab/check_modellab.py` — status dot should turn green.

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
